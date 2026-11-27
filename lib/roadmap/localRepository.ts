import { nonCreditChecksSchema, profileSchema, roadmapSchema, storedDataSchema, type Profile, type Roadmap, type StoredData } from "./schema";
import { RoadmapStorageError, type RoadmapRepository } from "./repository";

const STORAGE_KEY = "giljabi:data:v1";
const emptyData = (): StoredData => ({ version: 1, profile: null, roadmaps: [], primaryRoadmapId: null, nonCreditChecks: {} });

export interface LoadReport {
  recovered: boolean;
  droppedRoadmaps: number;
  backupKey?: string;
  storageUnavailable?: true;
}

export interface LocalRoadmapRepository extends RoadmapRepository {
  getLoadReport(): LoadReport;
}

function sortRoadmaps(roadmaps: Roadmap[]): Roadmap[] {
  return [...roadmaps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError"
    || typeof error === "object" && error !== null && "name" in error && error.name === "QuotaExceededError";
}

// 여러 탭에서 동시에 수정하는 상황은 다루지 않는다. 마지막에 저장한 탭의 값이 남는다.
export function createLocalRepository(options: { storage?: Storage; now?: () => Date } = {}): LocalRoadmapRepository {
  let data = emptyData();
  let initialized = false;
  let storageUnavailable = false;
  const report: LoadReport = { recovered: false, droppedRoadmaps: 0 };
  const timestamp = () => (options.now?.() ?? new Date()).toISOString();

  function getStorage(): Storage | undefined {
    try {
      const storage = options.storage ?? globalThis.localStorage;
      if (!storage) throw new Error("localStorage unavailable");
      return storage;
    } catch {
      storageUnavailable = true;
      report.storageUnavailable = true;
      return undefined;
    }
  }

  function backup(storage: Storage, raw: string): void {
    const key = `giljabi:broken:${timestamp()}`;
    try {
      storage.setItem(key, raw);
      report.backupKey = key;
    } catch {
      storageUnavailable = true;
      report.storageUnavailable = true;
    }
  }

  function load(): void {
    if (initialized) return;
    initialized = true;
    const storage = getStorage();
    if (!storage) return;
    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      storageUnavailable = true;
      report.storageUnavailable = true;
      return;
    }
    if (raw === null) return;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      report.recovered = true;
      backup(storage, raw);
      writeRecovered(storage);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || parsed.version !== 1) {
      report.recovered = true;
      backup(storage, raw);
      writeRecovered(storage);
      return;
    }
    const source = parsed as Record<string, unknown>;
    const roadmapsInput = Array.isArray(source.roadmaps) ? source.roadmaps : [];
    const roadmaps = roadmapsInput.flatMap((roadmap) => {
      const result = roadmapSchema.safeParse(roadmap);
      return result.success ? [{ ...result.data, isPublic: false }] : [];
    });
    const droppedRoadmaps = roadmapsInput.length - roadmaps.length;
    const profileResult = source.profile === null ? null : profileSchema.safeParse(source.profile);
    const profile = profileResult === null ? null : profileResult.success ? profileResult.data : null;
    const checksResult = nonCreditChecksSchema.safeParse(source.nonCreditChecks);
    const nonCreditChecks = checksResult.success ? checksResult.data : {};
    const primaryRoadmapId = typeof source.primaryRoadmapId === "string"
      && roadmaps.some((roadmap) => roadmap.id === source.primaryRoadmapId)
      ? source.primaryRoadmapId
      : sortRoadmaps(roadmaps)[0]?.id ?? null;
    if (!Array.isArray(source.roadmaps) || !("profile" in source) || !("nonCreditChecks" in source)
      || droppedRoadmaps > 0 || (profileResult !== null && !profileResult.success) || !checksResult.success
      || source.primaryRoadmapId !== primaryRoadmapId || !storedDataSchema.safeParse({ version: 1, profile, roadmaps, primaryRoadmapId, nonCreditChecks }).success) {
      report.recovered = true;
      report.droppedRoadmaps = droppedRoadmaps;
      backup(storage, raw);
    }
    data = { version: 1, profile, roadmaps, primaryRoadmapId, nonCreditChecks };
    if (report.recovered) writeRecovered(storage);
  }

  // 복구한 값을 바로 다시 써 둔다. 깨진 원본이 남으면 열 때마다 백업이 또 생긴다.
  // 실패해도 읽기는 계속한다 (다음 저장 때 다시 시도됨).
  function writeRecovered(storage: Storage): void {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 저장 공간 부족 등: 무시
    }
  }

  function commit(next: StoredData): void {
    const normalized = storedDataSchema.parse(next);
    const storage = storageUnavailable ? undefined : getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch (error) {
        if (isQuotaError(error)) throw new RoadmapStorageError("quota");
        storageUnavailable = true;
        report.storageUnavailable = true;
      }
    }
    data = normalized;
  }

  const repo: LocalRoadmapRepository = {
    getLoadReport: () => ({ ...report }),
    async getProfile() { load(); return data.profile; },
    async saveProfile(profile: Profile) {
      load();
      const result = profileSchema.safeParse(profile);
      if (!result.success) throw new RoadmapStorageError("invalid");
      commit({ ...data, profile: result.data });
    },
    async listRoadmaps() { load(); return sortRoadmaps(data.roadmaps); },
    async getRoadmap(id: string) { load(); return data.roadmaps.find((roadmap) => roadmap.id === id) ?? null; },
    async saveRoadmap(roadmap: Roadmap) {
      load();
      const result = roadmapSchema.safeParse(roadmap);
      if (!result.success) throw new RoadmapStorageError("invalid");
      const saved = { ...result.data, isPublic: false };
      const exists = data.roadmaps.some((entry) => entry.id === saved.id);
      const roadmaps = exists ? data.roadmaps.map((entry) => entry.id === saved.id ? saved : entry) : [...data.roadmaps, saved];
      const primaryRoadmapId = data.primaryRoadmapId ?? saved.id;
      commit({ ...data, roadmaps, primaryRoadmapId });
    },
    async deleteRoadmap(id: string) {
      load();
      const roadmaps = data.roadmaps.filter((roadmap) => roadmap.id !== id);
      if (roadmaps.length === data.roadmaps.length) return;
      const primaryRoadmapId = data.primaryRoadmapId === id ? sortRoadmaps(roadmaps)[0]?.id ?? null : data.primaryRoadmapId;
      commit({ ...data, roadmaps, primaryRoadmapId });
    },
    async getPrimaryRoadmapId() { load(); return data.primaryRoadmapId; },
    async setPrimaryRoadmap(id: string) {
      load();
      if (!data.roadmaps.some((roadmap) => roadmap.id === id)) throw new RoadmapStorageError("not_found");
      commit({ ...data, primaryRoadmapId: id });
    },
    async getNonCreditChecks() { load(); return { ...data.nonCreditChecks }; },
    async setNonCreditCheck(ruleId: string, done: boolean) {
      load();
      const key = ruleId.trim();
      if (!key || typeof done !== "boolean") throw new RoadmapStorageError("invalid");
      commit({ ...data, nonCreditChecks: { ...data.nonCreditChecks, [key]: done } });
    },
    async clearAll() {
      load();
      const storage = getStorage();
      if (storage) {
        try {
          const keys: string[] = [];
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (key?.startsWith("giljabi:")) keys.push(key);
          }
          keys.forEach((key) => storage.removeItem(key));
        } catch {
          storageUnavailable = true;
          report.storageUnavailable = true;
        }
      }
      data = emptyData();
    },
  };
  return repo;
}
