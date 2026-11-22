import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Papa from "papaparse";
import { describe, expect, expectTypeOf, test } from "vitest";
import {
  loadRules, parseRules, RulesValidationError, ruleColumns, ruleFileNames,
  type Requirement, type RuleFileName,
} from "@/lib/data";

const fixtureDir = "tests/fixtures/rules";
const fixtureTexts = Object.fromEntries(await Promise.all(ruleFileNames.map(async (file) => [
  file, await readFile(`${fixtureDir}/${file.replace(".csv", ".fake.csv")}`, "utf8"),
]))) as Record<RuleFileName, string>;

function change(file: RuleFileName, row: number, column: string, value: string) {
  const parsed = Papa.parse<Record<string, string>>(fixtureTexts[file], {
    header: true, skipEmptyLines: true, comments: "#",
  });
  parsed.data[row][column] = value;
  return { ...fixtureTexts, [file]: "# 가짜 테스트 데이터 — 실제 한성대학교 데이터 아님\n"
    + Papa.unparse(parsed.data, { newline: "\n" }) };
}

function getError(texts: Record<RuleFileName, string>): RulesValidationError {
  try {
    parseRules(texts);
  } catch (error) {
    if (error instanceof RulesValidationError) return error;
    throw error;
  }
  throw new Error("검증 오류가 발생해야 합니다");
}

describe("규칙 데이터 정상 로드", () => {
  test("가짜 CSV 5종을 각 3행씩 읽고 타입을 변환한다", async () => {
    const data = await loadRules(fixtureDir, { fileSuffix: ".fake.csv" });
    for (const rows of Object.values(data)) expect(rows).toHaveLength(3);
    expect(data.courses[0]).toMatchObject({ credits: 0, year: 1, semester: 1 });
    expect(data.courses[1].course_name).toBe("가짜과목2, 실습");
    expect(data.courses[2].year).toBe(4);
    expect(data.requirements[0]).toMatchObject({ type: "비학점", value: "가짜확인 항목을 직접 체크합니다", applies_track: "ALL" });
    expect(data.requirements[0].applies_until).toBeUndefined();
    expect(data.requirements[0].note).toBeUndefined();
    expect(data.requirements[1]).toMatchObject({ applies_from: 2000, applies_until: 2000, value: 1 });
    expect(data.micro_degrees.map((row) => row.needs_application)).toEqual([false, false, true]);
    expect(data.competencies[0].certificate).toBeUndefined();
    for (const requirement of data.requirements) {
      if (requirement.type === "비학점") expectTypeOf(requirement.value).toEqualTypeOf<string>();
      else expectTypeOf(requirement.value).toEqualTypeOf<number>();
    }
    expectTypeOf(data.requirements).toEqualTypeOf<Requirement[]>();
  });

  test("BOM, CRLF, 값과 열 이름의 앞뒤 공백을 처리한다", () => {
    const texts = Object.fromEntries(ruleFileNames.map((file) => {
      const parsed = Papa.parse<string[]>(fixtureTexts[file], { comments: "#", skipEmptyLines: true });
      return [file, "\uFEFF" + Papa.unparse(parsed.data.map((row) => row.map((value) => ` ${value} `)), { newline: "\r\n" })];
    })) as Record<RuleFileName, string>;
    expect(parseRules(texts)).toEqual(parseRules(fixtureTexts));
  });

  test("열 이름만 있는 5종은 빈 배열을 반환한다", () => {
    const texts = Object.fromEntries(ruleFileNames.map((file) => [file, ruleColumns[file].join(",")])) as Record<RuleFileName, string>;
    for (const rows of Object.values(parseRules(texts))) expect(rows).toEqual([]);
  });

  test.each(["총학점", "전공", "교양", "비교과"])("%s value는 숫자로 변환한다", (type) => {
    expect(parseRules(change("requirements.csv", 1, "type", type)).requirements[1].value).toBe(1);
  });

  test.each(["true", "TRUE", "TrUe"])("needs_application=%s를 true로 변환한다", (value) => {
    expect(parseRules(change("micro_degrees.csv", 2, "needs_application", value)).micro_degrees[2].needs_application).toBe(true);
  });

  test("같은 md_id의 false와 FALSE는 같은 값이다", () => {
    expect(parseRules(change("micro_degrees.csv", 1, "needs_application", "FALSE")).micro_degrees[1].needs_application).toBe(false);
  });

  test("윤년의 날짜와 http URL을 허용한다", () => {
    const texts = change("tracks.csv", 0, "as_of", "2000-02-29");
    texts["courses.csv"] = change("courses.csv", 0, "source", "http://example.com/fake")["courses.csv"];
    expect(parseRules(texts).tracks[0].as_of).toBe("2000-02-29");
  });

  test("따옴표·쉼표·줄바꿈과 #이 들어간 인용 필드도 그대로 읽는다", () => {
    const name = '가짜과목 "인용", 실습\n# 과목명 안의 내용';
    expect(parseRules(change("courses.csv", 0, "course_name", name)).courses[0].course_name).toBe(name);
  });

  test("같은 입력은 같은 결과이며 입력을 변경하지 않는다", () => {
    const input = Object.freeze({ ...fixtureTexts });
    expect(parseRules(input)).toEqual(parseRules(input));
    expect(input).toEqual(fixtureTexts);
  });
});

const invalidCases: [RuleFileName, number, string, string][] = [
  ["tracks.csv", 0, "source", ""],
  ["tracks.csv", 0, "source", "ftp://example.com/fake"],
  ["tracks.csv", 0, "source", "https://"],
  ["tracks.csv", 0, "source", "https:example.com/fake"],
  ["tracks.csv", 0, "as_of", "2026-13-01"],
  ["tracks.csv", 0, "as_of", "2026-02-30"],
  ["tracks.csv", 0, "as_of", "1900-02-29"],
  ["tracks.csv", 0, "as_of", "2026-1-01"],
  ["tracks.csv", 0, "day_night", "주 간"],
  ["tracks.csv", 0, "status", "가짜상태"],
  ["tracks.csv", 0, "name", "  "],
  ["courses.csv", 0, "category", "교양"],
  ["courses.csv", 0, "credits", "-1"],
  ["courses.csv", 0, "credits", "3학점"],
  ["courses.csv", 0, "credits", ""],
  ["courses.csv", 0, "credits", "Infinity"],
  ["courses.csv", 0, "credits", "1e999"],
  ["courses.csv", 0, "year", "0"],
  ["courses.csv", 0, "year", "5"],
  ["courses.csv", 0, "year", "1.5"],
  ["courses.csv", 0, "semester", "3"],
  ["requirements.csv", 1, "applies_from", "22"],
  ["requirements.csv", 1, "applies_until", "1999"],
  ["requirements.csv", 1, "applies_until", "200"],
  ["requirements.csv", 1, "applies_track", "FAKE-MISSING"],
  ["requirements.csv", 1, "value", "9학점"],
  ["requirements.csv", 0, "value", ""],
  ["requirements.csv", 1, "type", "가짜미정유형"],
  ["micro_degrees.csv", 0, "needs_application", "yes"],
  ["micro_degrees.csv", 0, "credits", "-1"],
  ["micro_degrees.csv", 0, "type", ""],
  ["courses.csv", 0, "track_id", "FAKE-MISSING"],
  ["competencies.csv", 0, "track_id", "FAKE-MISSING"],
];

describe("스키마·교차 참조 오류", () => {
  test.each(invalidCases)("%s 행 %i의 %s=%s 오류를 보고한다", (file, row, column, value) => {
    const error = getError(change(file, row, column, value));
    expect(error.issues).toContainEqual(expect.objectContaining({ file, line: row + 3, column }));
    expect(error.message).toMatch(/[가-힣]/);
    expect(error.message).toContain(JSON.stringify(value.trim()));
  });

  test.each([
    ["tracks.csv", "track_id", "FAKE-T01"],
    ["requirements.csv", "rule_id", "FAKE-R01"],
  ] as const)("%s의 중복 %s를 거부한다", (file, column, value) => {
    expect(getError(change(file, 1, column, value)).issues).toContainEqual(expect.objectContaining({
      file, line: 4, column, message: expect.stringContaining("중복"),
    }));
  });

  test.each([
    ["name", "가짜다른이름"], ["type", "가짜다른유형"], ["needs_application", "true"],
  ])("같은 md_id의 %s 불일치를 거부한다", (column, value) => {
    expect(getError(change("micro_degrees.csv", 1, column, value)).issues).toContainEqual(expect.objectContaining({
      file: "micro_degrees.csv", line: 4, column, message: expect.stringContaining("같은 md_id"),
    }));
  });

  test("서로 다른 파일의 두 오류를 정확한 줄·열과 함께 모두 보고한다", () => {
    const texts = change("tracks.csv", 0, "source", "");
    texts["courses.csv"] = change("courses.csv", 1, "credits", "3학점")["courses.csv"];
    const error = getError(texts);
    expect(error.issues.map(({ file, line, column }) => ({ file, line, column }))).toEqual([
      { file: "tracks.csv", line: 3, column: "source" },
      { file: "courses.csv", line: 4, column: "credits" },
    ]);
    expect(error.message).toContain('courses.csv 4번째 줄 credits: 0 이상의 숫자여야 합니다 (입력값: "3학점")');
  });

  test("같은 행의 스키마 오류와 참조 오류도 모두 보고한다", () => {
    const texts = change("courses.csv", 0, "track_id", "FAKE-MISSING");
    texts["courses.csv"] = texts["courses.csv"].replace("가짜과목1,0,", "가짜과목1,-1,");
    expect(getError(texts).issues.map((issue) => issue.column)).toEqual(["credits", "track_id"]);
  });
});

describe("CSV 구조·물리 줄 번호·파일 오류", () => {
  test("빠진 열과 모르는 열을 함께 보고한다", () => {
    const texts = { ...fixtureTexts, "tracks.csv": fixtureTexts["tracks.csv"].replace("college", "collage") };
    expect(getError(texts).issues).toEqual([
      { file: "tracks.csv", line: 2, column: "college", message: "필수 열이 없습니다" },
      { file: "tracks.csv", line: 2, column: "collage", message: "정의되지 않은 열입니다" },
    ]);
  });

  test("중복된 열 이름을 거부한다", () => {
    const texts = { ...fixtureTexts, "tracks.csv": fixtureTexts["tracks.csv"].replace("name,college", "name,name") };
    expect(getError(texts).issues).toContainEqual({ file: "tracks.csv", line: 2, column: "name", message: "열 이름이 중복되었습니다" });
  });

  test.each(["", "# 가짜 주석만 있음\n"])("열 이름 자체가 없으면 오류다", (empty) => {
    const texts = { ...fixtureTexts, "competencies.csv": empty };
    expect(getError(texts).issues).toHaveLength(ruleColumns["competencies.csv"].length);
  });

  test.each(["\n", "\r\n", "\r"])("주석·빈 줄·인용 줄바꿈 뒤 오류의 실제 줄 번호를 보존한다 (%j)", (newline) => {
    const header = ruleColumns["courses.csv"].join(",");
    const text = ["# 가짜 첫 주석", "", header, "# 가짜 행 주석", '""',
      'FAKE-T01,1,1,전기,FAKE101,"가짜과목', '두 번째 줄",0,https://example.com/fake,2000-01-01',
      "", "# 가짜 후속 주석", "FAKE-T01,1,1,전기,FAKE102,가짜과목2,3학점,https://example.com/fake,2000-01-01",
    ].join(newline);
    expect(getError({ ...fixtureTexts, "courses.csv": text }).issues).toEqual([{
      file: "courses.csv", line: 10, column: "credits",
      message: '0 이상의 숫자여야 합니다 (입력값: "3학점")',
    }]);
  });

  test.each([",추가값", ",https://example.com/fake"])("행의 열 개수가 다르면 오류를 보고한다 (%s)", (ending) => {
    const header = ruleColumns["competencies.csv"].join(",");
    const row = ending === ",추가값"
      ? `FAKE-T01,가짜역량,가짜진로,,https://example.com/fake,2000-01-01${ending}`
      : "FAKE-T01,가짜역량,가짜진로,,https://example.com/fake";
    const error = getError({ ...fixtureTexts, "competencies.csv": `${header}\n# 가짜 주석\n${row}` });
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toMatchObject({ file: "competencies.csv", line: 3, column: "CSV" });
  });

  test("닫히지 않은 인용 필드를 한국어 오류로 보고한다", () => {
    const texts = { ...fixtureTexts, "competencies.csv": `${ruleColumns["competencies.csv"].join(",")}\nFAKE-T01,"닫히지 않은 가짜값` };
    expect(getError(texts).issues).toContainEqual({ file: "competencies.csv", line: 2, column: "CSV", message: "닫히지 않은 따옴표가 있습니다" });
  });

  test("없는 폴더의 누락 파일 5개를 한 오류에 모두 보고한다", async () => {
    await expect(loadRules(`${fixtureDir}/does-not-exist`, { fileSuffix: ".fake.csv" }))
      .rejects.toMatchObject({ name: "RulesValidationError", issues: ruleFileNames.map((file) => ({
        file: file.replace(".csv", ".fake.csv"), line: 1, column: "파일", message: "파일이 없습니다",
      })) });
  });

  test("기본 .csv 확장자를 읽고, 누락 파일과 다른 파일의 값 오류를 함께 보고한다", async () => {
    const dir = await mkdtemp(join(tmpdir(), "giljabi-rules-test-"));
    const createdFiles = new Set<string>();
    try {
      for (const file of ruleFileNames) {
        const path = join(dir, file);
        await writeFile(path, fixtureTexts[file], "utf8");
        createdFiles.add(path);
      }
      expect(await loadRules(dir)).toEqual(parseRules(fixtureTexts));
      await unlink(join(dir, "tracks.csv"));
      createdFiles.delete(join(dir, "tracks.csv"));
      await writeFile(join(dir, "courses.csv"), change("courses.csv", 0, "credits", "3학점")["courses.csv"], "utf8");
      await expect(loadRules(dir)).rejects.toMatchObject({ issues: [
        { file: "tracks.csv", line: 1, column: "파일", message: "파일이 없습니다" },
        { file: "courses.csv", line: 3, column: "credits", message: '0 이상의 숫자여야 합니다 (입력값: "3학점")' },
      ] });
    } finally {
      for (const path of createdFiles) await unlink(path);
      await rmdir(dir);
    }
  });
});
