import { describe, expect, it } from "vitest";
import { createLocalRepository } from "@/lib/roadmap/localRepository";
import { RoadmapStorageError } from "@/lib/roadmap/repository";
import { createRoadmap, addItem } from "@/lib/roadmap/ops";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failGet = false;
  failWrite = false;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { if (this.failGet) throw new Error("blocked"); return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { if (this.failWrite) { const error = new Error("full"); error.name = "QuotaExceededError"; throw error; } this.values.set(key, String(value)); }
}
const roadmap = (id: string, date: string) => createRoadmap({ name: `가짜 ${id}`, track1Id: "FAKE-T01", track2Id: null, career: "" }, { id, now: new Date(date) });
const saveItemRoadmap = (id = "fake-r") => {
  const result = addItem(roadmap(id, "2026-01-01T00:00:00.000Z"), { kind: "otherCourse", id: "fake-item", term: "1-1", name: "가짜 교과", credits: 1 });
  if (!result.ok) throw new Error("unexpected duplicate");
  return result.roadmap;
};
const fixedNow = () => new Date("2026-11-28T00:00:00.000Z");

describe("이 기기 로드맵 저장소", () => {
  it("새 저장소에서도 기본 정보, 로드맵, 항목, 비학점 체크를 읽는다", async () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository({ storage, now: fixedNow });
    await repo.saveProfile({ admissionYear: 2025, dayNight: "주간", currentYear: 1, currentSemester: 1 });
    await repo.saveRoadmap(saveItemRoadmap("fake-1"));
    await repo.saveRoadmap(roadmap("fake-2", "2026-02-01T00:00:00.000Z"));
    await repo.setNonCreditCheck("FAKE-RULE01", true);
    const reloaded = createLocalRepository({ storage, now: fixedNow });
    expect(await reloaded.listRoadmaps()).toHaveLength(2);
    expect((await reloaded.getRoadmap("fake-1"))?.items).toHaveLength(1);
    expect(await reloaded.getProfile()).toMatchObject({ currentYear: 1 });
    expect(await reloaded.getNonCreditChecks()).toEqual({ "FAKE-RULE01": true });
  });
  it("대표를 자동 선택하고 삭제 시 최신 로드맵을 대표로 둔다", async () => {
    const repo = createLocalRepository({ storage: new MemoryStorage() });
    await repo.saveRoadmap(roadmap("fake-old", "2026-01-01T00:00:00.000Z"));
    expect(await repo.getPrimaryRoadmapId()).toBe("fake-old");
    await repo.saveRoadmap(roadmap("fake-new", "2026-02-01T00:00:00.000Z"));
    await repo.deleteRoadmap("fake-old");
    expect(await repo.getPrimaryRoadmapId()).toBe("fake-new");
    await repo.deleteRoadmap("fake-new");
    expect(await repo.getPrimaryRoadmapId()).toBeNull();
    await expect(repo.setPrimaryRoadmap("없는-id")).rejects.toMatchObject({ code: "not_found" });
  });
  it("깨진 JSON과 잘못된 버전을 백업하고 복구한다", async () => {
    const storage = new MemoryStorage();
    storage.setItem("giljabi:data:v1", "깨진 JSON");
    let repo = createLocalRepository({ storage, now: fixedNow });
    expect(await repo.listRoadmaps()).toEqual([]);
    expect(repo.getLoadReport().recovered).toBe(true);
    expect(storage.getItem(repo.getLoadReport().backupKey!)).toBe("깨진 JSON");
    storage.setItem("giljabi:data:v1", JSON.stringify({ version: 2 }));
    repo = createLocalRepository({ storage, now: () => new Date("2026-11-28T00:00:01.000Z") });
    expect(await repo.listRoadmaps()).toEqual([]);
    expect(repo.getLoadReport().recovered).toBe(true);
  });
  it("복구한 값을 다시 써 두어 다음에 열 때 또 백업하지 않는다", async () => {
    const storage = new MemoryStorage();
    storage.setItem("giljabi:data:v1", "깨진 JSON");
    const first = createLocalRepository({ storage, now: fixedNow });
    await first.listRoadmaps();
    expect(first.getLoadReport().recovered).toBe(true);
    const second = createLocalRepository({ storage, now: () => new Date("2026-11-28T00:00:05.000Z") });
    expect(await second.listRoadmaps()).toEqual([]);
    expect(second.getLoadReport().recovered).toBe(false);
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    expect(keys.filter((key) => key?.startsWith("giljabi:broken:"))).toHaveLength(1);
  });
  it("버전이 다르면 백업한다", async () => {
    const storage = new MemoryStorage();
    storage.setItem("giljabi:data:v1", JSON.stringify({ version: 2 }));
    const repo = createLocalRepository({ storage, now: fixedNow });
    await repo.listRoadmaps();
    expect(storage.getItem(repo.getLoadReport().backupKey!)).toBe(JSON.stringify({ version: 2 }));
  });
  it("로드맵 일부만 잘못되면 유효한 항목을 살린다", async () => {
    const storage = new MemoryStorage();
    const valid = roadmap("fake-ok", "2026-01-01T00:00:00.000Z");
    storage.setItem("giljabi:data:v1", JSON.stringify({ version: 1, profile: null, roadmaps: [valid, { ...valid, id: "bad", name: "" }], primaryRoadmapId: "fake-ok", nonCreditChecks: {} }));
    const repo = createLocalRepository({ storage, now: fixedNow });
    expect(await repo.listRoadmaps()).toHaveLength(1);
    expect(repo.getLoadReport().droppedRoadmaps).toBe(1);
  });
  it("스토리지 접근 불가 시 메모리에서 읽고 쓴다", async () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    const repo = createLocalRepository({ storage });
    await repo.saveRoadmap(roadmap("fake-memory", "2026-01-01T00:00:00.000Z"));
    expect(await repo.getRoadmap("fake-memory")).not.toBeNull();
    expect(repo.getLoadReport().storageUnavailable).toBe(true);
  });
  it("저장 공간이 없으면 상태를 이전 값으로 되돌리고 공개 여부는 저장하지 않는다", async () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository({ storage });
    await repo.saveRoadmap(roadmap("fake-before", "2026-01-01T00:00:00.000Z"));
    storage.failWrite = true;
    await expect(repo.saveRoadmap(roadmap("fake-after", "2026-02-01T00:00:00.000Z"))).rejects.toBeInstanceOf(RoadmapStorageError);
    expect(await repo.listRoadmaps()).toHaveLength(1);
    storage.failWrite = false;
    const publicRoadmap = { ...roadmap("fake-public", "2026-03-01T00:00:00.000Z"), isPublic: true };
    await repo.saveRoadmap(publicRoadmap);
    expect((await createLocalRepository({ storage }).getRoadmap("fake-public"))?.isPublic).toBe(false);
  });
  it("모든 앱 키와 백업을 지우고 다른 키는 남긴다", async () => {
    const storage = new MemoryStorage();
    storage.setItem("giljabi:broken:old", "backup");
    storage.setItem("other:key", "keep");
    const repo = createLocalRepository({ storage });
    await repo.clearAll();
    expect(Array.from({ length: storage.length }, (_, index) => storage.key(index))).toEqual(["other:key"]);
  });
});
