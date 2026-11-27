import { describe, expect, it } from "vitest";
import { addItem, createRoadmap, moveItem, setCompleted } from "@/lib/roadmap/ops";

const base = () => createRoadmap({ name: "가짜 계획", track1Id: "FAKE-T01", track2Id: null, career: "" }, { id: "fake-r", now: new Date("2026-01-01T00:00:00.000Z") });
const course = (id: string, term: "1-1" | "2-1", code = "FAKE101") => ({ kind: "course" as const, id, term, courseCode: code, courseName: "가짜과목1", credits: 1, trackId: "FAKE-T01" });

describe("로드맵 순수 함수", () => {
  it("동일 과목 중복을 막고 기존 학기를 돌려준다", () => {
    const first = addItem(base(), course("fake-a", "1-1"), { now: new Date("2026-02-01T00:00:00Z") });
    if (!first.ok) throw new Error("unexpected duplicate");
    expect(addItem(first.roadmap, course("fake-b", "2-1"))).toEqual({ ok: false, reason: "duplicate", existingTerm: "1-1" });
    expect(first.roadmap.items).toHaveLength(1);
  });
  it("항목 이동과 순서 바꾸기를 처리한다", () => {
    let roadmap = base();
    for (const item of [course("fake-a", "1-1"), course("fake-b", "2-1", "FAKE102"), course("fake-c", "2-1", "FAKE103")]) {
      const result = addItem(roadmap, item);
      if (result.ok) roadmap = result.roadmap;
    }
    roadmap = moveItem(roadmap, "fake-a", "2-1", 1);
    expect(roadmap.items.filter((item) => item.term === "2-1").map((item) => item.id)).toEqual(["fake-b", "fake-a", "fake-c"]);
    roadmap = moveItem(roadmap, "fake-a", "2-1", 99);
    expect(roadmap.items.filter((item) => item.term === "2-1").map((item) => item.id)).toEqual(["fake-b", "fake-c", "fake-a"]);
    expect(moveItem(roadmap, "absent", "1-1", 0)).toBe(roadmap);
  });
  it("입력을 변경하지 않고 주입한 시각으로 갱신한다", () => {
    const initial = addItem(base(), course("fake-a", "1-1"));
    if (!initial.ok) throw new Error("unexpected duplicate");
    Object.freeze(initial.roadmap.items[0]);
    Object.freeze(initial.roadmap.items);
    Object.freeze(initial.roadmap);
    const updated = setCompleted(initial.roadmap, "fake-a", true, { now: new Date("2026-03-01T00:00:00.000Z") });
    expect(initial.roadmap.items[0].completed).toBe(false);
    expect(updated.items[0].completed).toBe(true);
    expect(updated.updatedAt).toBe("2026-03-01T00:00:00.000Z");
  });
});
