import { describe, expect, it } from "vitest";
import { TERM_ORDER, termStatus } from "@/lib/roadmap/terms";

const profile = (currentYear: 1 | 2 | 3 | 4, currentSemester: 1 | 2) => ({ admissionYear: 2025, dayNight: "주간" as const, currentYear, currentSemester });

describe("학기 순서와 상태", () => {
  it("16칸을 시간순으로 둔다", () => {
    expect(TERM_ORDER).toHaveLength(16);
    expect(TERM_ORDER.slice(0, 5)).toEqual(["1-1", "1-S", "1-2", "1-W", "2-1"]);
  });
  it("2학년 2학기를 기준으로 상태를 나눈다", () => {
    const p = profile(2, 2);
    expect(termStatus("2-1", p)).toBe("past");
    expect(termStatus("2-S", p)).toBe("past");
    expect(termStatus("2-2", p)).toBe("current");
    expect(termStatus("2-W", p)).toBe("future");
    expect(termStatus("3-1", p)).toBe("future");
  });
  it("경계 학기와 기본 정보 없음을 처리한다", () => {
    expect(TERM_ORDER.map((term) => termStatus(term, profile(1, 1)))).toEqual(["current", ...Array(15).fill("future")]);
    expect(termStatus("4-W", profile(4, 2))).toBe("future");
    expect(termStatus("1-1", null)).toBeNull();
  });
});
