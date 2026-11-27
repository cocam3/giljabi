import type { NonCreditChecks, Profile, Roadmap } from "./schema";

export type RoadmapStorageErrorCode = "invalid" | "not_found" | "quota" | "unavailable";

export class RoadmapStorageError extends Error {
  readonly code: RoadmapStorageErrorCode;

  constructor(code: RoadmapStorageErrorCode, message?: string) {
    const defaults: Record<RoadmapStorageErrorCode, string> = {
      invalid: "저장할 정보의 형식이 올바르지 않습니다.",
      not_found: "선택한 로드맵을 찾을 수 없습니다.",
      quota: "저장 공간이 부족해 정보를 저장하지 못했습니다.",
      unavailable: "이 브라우저에서는 정보를 저장할 수 없습니다.",
    };
    super(message ?? defaults[code]);
    this.name = "RoadmapStorageError";
    this.code = code;
  }
}

// 처음 저장한 로드맵이 대표가 된다. 대표를 지우면 updatedAt이 가장 최근인 로드맵을 대표로 정하고, 없으면 null이다.
export interface RoadmapRepository {
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
  listRoadmaps(): Promise<Roadmap[]>;
  getRoadmap(id: string): Promise<Roadmap | null>;
  saveRoadmap(roadmap: Roadmap): Promise<void>;
  deleteRoadmap(id: string): Promise<void>;
  getPrimaryRoadmapId(): Promise<string | null>;
  setPrimaryRoadmap(id: string): Promise<void>;
  getNonCreditChecks(): Promise<NonCreditChecks>;
  setNonCreditCheck(ruleId: string, done: boolean): Promise<void>;
  clearAll(): Promise<void>;
}
