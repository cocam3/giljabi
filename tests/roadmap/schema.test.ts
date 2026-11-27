import { describe, expect, it } from "vitest";
import { roadmapSchema, profileSchema } from "@/lib/roadmap/schema";

const itemBase = { id: "fake-id", term: "1-1", completed: false };
const valid = {
  id: "fake-roadmap", name: "가짜 로드맵", track1Id: "FAKE-T01", track2Id: null, career: "", showSeasonal: false,
  items: [
    { ...itemBase, kind: "course", courseCode: "FAKE101", courseName: "가짜과목1", credits: 0, trackId: "FAKE-T01" },
    { ...itemBase, id: "fake-other", kind: "otherCourse", name: "가짜 교과", credits: 1 },
    { ...itemBase, id: "fake-extra", kind: "extracurricular", name: "가짜 비교과" },
    { ...itemBase, id: "fake-academic", kind: "academic", name: "가짜 학사제도" },
    { ...itemBase, id: "fake-external", kind: "external", category: "기타", name: "가짜 활동" },
  ],
  fiveYearPlan: Array.from({ length: 5 }, () => ({ chips: [], text: "" })), isPublic: false,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("로드맵 스키마", () => {
  it("항목 5종과 0학점을 허용한다", () => { expect(roadmapSchema.safeParse(valid).success).toBe(true); });
  it.each([
    { ...valid, items: [{ ...valid.items[0], term: "5-1" }] },
    { ...valid, items: [{ ...valid.items[0], credits: -1 }] },
    { ...valid, items: [{ ...itemBase, kind: "otherCourse", name: "", credits: 1 }] },
    { ...valid, items: [{ ...itemBase, kind: "course", courseName: "가짜과목", credits: 1, trackId: "FAKE-T01" }] },
    { ...valid, fiveYearPlan: [{ chips: ["취업", "취업"], text: "" }, ...valid.fiveYearPlan.slice(1)] },
    { ...valid, fiveYearPlan: valid.fiveYearPlan.slice(0, 4) },
    { ...valid, name: "가".repeat(41) },
  ])("잘못된 로드맵을 거부한다", (value) => { expect(roadmapSchema.safeParse(value).success).toBe(false); });
  it("기본 정보의 범위를 검사한다", () => {
    expect(profileSchema.safeParse({ admissionYear: 26, dayNight: "주간", currentYear: 1, currentSemester: 1 }).success).toBe(false);
    expect(profileSchema.safeParse({ admissionYear: 2025, dayNight: "주간", currentYear: 5, currentSemester: 1 }).success).toBe(false);
  });
});
