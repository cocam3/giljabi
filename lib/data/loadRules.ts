// Node fs를 사용하는 서버 전용 모듈. 클라이언트 컴포넌트에서 import하지 않는다.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { parseCsv, RulesValidationError, type CsvRow, type RulesValidationIssue } from "./parseCsv";
import {
  competencySchema, courseSchema, microDegreeSchema, requirementSchema,
  ruleFileNames, trackSchema, type RuleData, type RuleFileName,
} from "./schemas";

export { RulesValidationError } from "./parseCsv";

export function parseRules(texts: Record<RuleFileName, string>): RuleData {
  const issues: RulesValidationIssue[] = [];
  const rows = {} as Record<RuleFileName, CsvRow[]>;
  let validTrackHeader = false;
  for (const file of ruleFileNames) {
    const parsed = parseCsv(file, texts[file]);
    if (file === "tracks.csv") validTrackHeader = parsed.validHeader;
    rows[file] = parsed.rows;
    issues.push(...parsed.issues);
  }

  function report(file: RuleFileName, row: CsvRow, column: string, message: string) {
    issues.push({ file, line: row.line, column,
      message: `${message} (입력값: ${JSON.stringify(row.data[column] ?? "")})` });
  }

  function validate<T>(file: RuleFileName, schema: z.ZodType<T>): T[] {
    return rows[file].flatMap((row) => {
      const result = schema.safeParse(row.data);
      if (result.success) return [result.data];
      for (const issue of result.error.issues) {
        report(file, row, String(issue.path[0] ?? "CSV"), issue.message);
      }
      return [];
    });
  }

  const data: RuleData = {
    tracks: validate("tracks.csv", trackSchema),
    courses: validate("courses.csv", courseSchema),
    requirements: validate("requirements.csv", requirementSchema),
    micro_degrees: validate("micro_degrees.csv", microDegreeSchema),
    competencies: validate("competencies.csv", competencySchema),
  };

  for (const [file, column] of [["tracks.csv", "track_id"], ["requirements.csv", "rule_id"]] as const) {
    const seen = new Set<string>();
    for (const row of rows[file]) {
      const value = row.data[column];
      if (value && seen.has(value)) report(file, row, column, "파일 안에서 중복된 값입니다");
      if (value) seen.add(value);
    }
  }

  // 다른 열에 오류가 있어도 해당 행의 교차 참조 오류까지 함께 보고한다.
  const trackIds = new Set(rows["tracks.csv"].map((row) => row.data.track_id).filter(Boolean));
  for (const [file, column] of [
    ["courses.csv", "track_id"], ["competencies.csv", "track_id"], ["requirements.csv", "applies_track"],
  ] as const) {
    // 트랙 목록을 읽지 못했을 때 존재 여부를 추측해 추가 오류를 만들지 않는다.
    if (!validTrackHeader) continue;
    for (const row of rows[file]) {
      const value = row.data[column];
      if (value && !(file === "requirements.csv" && value === "ALL") && !trackIds.has(value)) {
        report(file, row, column, "tracks.csv에 없는 track_id입니다");
      }
    }
  }

  const groups = new Map<string, Map<string, string>>();
  for (const row of rows["micro_degrees.csv"]) {
    if (!row.data.md_id) continue;
    const group = groups.get(row.data.md_id) ?? new Map<string, string>();
    groups.set(row.data.md_id, group);
    for (const column of ["name", "type", "needs_application"] as const) {
      const raw = row.data[column];
      const value = column === "needs_application" ? raw.toLowerCase() : raw;
      if (!value || (column === "needs_application" && !["true", "false"].includes(value))) continue;
      if (group.has(column) && group.get(column) !== value) {
        report("micro_degrees.csv", row, column, "같은 md_id의 값이 서로 다릅니다");
      } else {
        group.set(column, value);
      }
    }
  }

  if (issues.length > 0) throw new RulesValidationError(issues);
  return data;
}

export async function loadRules(
  dir = "data/rules",
  options: { fileSuffix?: string } = {},
): Promise<RuleData> {
  const suffix = options.fileSuffix ?? ".csv";
  const results = await Promise.all(ruleFileNames.map(async (file) => {
    const filename = file.replace(/\.csv$/, suffix);
    try {
      return { file, filename, text: await readFile(join(dir, filename), "utf8") };
    } catch (error) {
      const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
      return { file, filename, issue: {
        file: filename, line: 1, column: "파일",
        message: missing ? "파일이 없습니다" : "파일을 읽을 수 없습니다",
      } satisfies RulesValidationIssue };
    }
  }));
  const issues: RulesValidationIssue[] = [];
  const texts = {} as Record<RuleFileName, string>;
  const filenames = new Map<RuleFileName, string>();
  const unreadFiles = new Set<RuleFileName>();
  for (const result of results) {
    filenames.set(result.file, result.filename);
    if (result.issue) {
      issues.push(result.issue);
      unreadFiles.add(result.file);
    }
    // 읽기 실패는 위에 오류로 남기고, 다른 파일의 값 오류도 검사한다.
    texts[result.file] = result.text ?? "";
  }
  let data: RuleData;
  try {
    data = parseRules(texts);
  } catch (error) {
    if (!(error instanceof RulesValidationError)) throw error;
    throw new RulesValidationError([...issues, ...error.issues
      .filter((issue) => !unreadFiles.has(issue.file as RuleFileName)).map((issue) => ({
      ...issue, file: filenames.get(issue.file as RuleFileName) ?? issue.file,
    }))]);
  }
  if (issues.length > 0) throw new RulesValidationError(issues);
  return data;
}
