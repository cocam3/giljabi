import Papa from "papaparse";
import { ruleColumns, type RuleFileName } from "./schemas";

export interface RulesValidationIssue {
  file: string;
  line: number;
  column: string;
  message: string;
}

export class RulesValidationError extends Error {
  constructor(public readonly issues: RulesValidationIssue[]) {
    super(issues.map(({ file, line, column, message }) =>
      `${file} ${line}번째 줄 ${column}: ${message}`).join("\n"));
    this.name = "RulesValidationError";
  }
}

export interface CsvRow {
  line: number;
  data: Record<string, string>;
}

// CSV 자체는 Papa Parse가 해석한다. 커서 사이의 빈 줄·주석만 건너뛰어
// 따옴표 안의 줄바꿈까지 포함한 원본 물리 줄 번호를 보존한다.
export function parseCsv(file: RuleFileName, input: string): {
  rows: CsvRow[];
  issues: RulesValidationIssue[];
  validHeader: boolean;
} {
  const source = input.replace(/^\uFEFF/, "");
  const replacementIndex = source.indexOf("\uFFFD");
  if (replacementIndex !== -1) {
    return {
      rows: [], validHeader: false,
      issues: [{ file, line: source.slice(0, replacementIndex).split(/\r\n|\n|\r/).length,
        column: "파일", message: "엑셀에서 'CSV UTF-8'로 다시 저장하세요" }],
    };
  }
  const issues: RulesValidationIssue[] = [];
  const lines: number[] = [];
  const emptyRows = new Set<number>();
  let headers: string[] = [];
  let foundHeader = false;
  let headerStart = 0;
  let cursor = 0;
  let line = 1;

  Papa.parse<string[]>(source, {
    delimiter: ",",
    skipEmptyLines: true,
    comments: "#",
    step(result) {
      const segment = source.slice(cursor, result.meta.cursor);
      const physicalLines = segment.split(/\r\n|\n|\r/);
      let skipped = 0;
      while (skipped < physicalLines.length - 1) {
        const candidate = physicalLines[skipped];
        if (candidate !== "" && candidate !== '""' && !candidate.startsWith("#")) break;
        skipped++;
      }
      const recordLine = line + skipped;
      const empty = result.errors.length === 0 && result.data.every((value) => value.trim() === "");
      if (!foundHeader && !empty) {
        foundHeader = true;
        headerStart = cursor;
        headers = result.data.map((value) => value.trim());
      }
      if (foundHeader) {
        lines.push(recordLine);
        if (empty) emptyRows.add(lines.length - 2);
      }
      for (const error of result.errors) {
        issues.push({ file, line: recordLine, column: "CSV", message:
          error.code === "MissingQuotes" ? "닫히지 않은 따옴표가 있습니다" : "CSV 따옴표 형식이 올바르지 않습니다" });
      }
      line += physicalLines.length - 1;
      cursor = result.meta.cursor;
    },
  });

  const expected: readonly string[] = ruleColumns[file];
  const headerLine = lines[0] ?? 1;
  const headerIssues: RulesValidationIssue[] = [];
  for (const column of expected) {
    if (!headers.includes(column)) headerIssues.push({ file, line: headerLine, column, message: "필수 열이 없습니다" });
  }
  const seen = new Set<string>();
  for (const column of headers) {
    if (!expected.includes(column)) headerIssues.push({ file, line: headerLine, column, message: "정의되지 않은 열입니다" });
    if (seen.has(column)) headerIssues.push({ file, line: headerLine, column, message: "열 이름이 중복되었습니다" });
    seen.add(column);
  }
  // 열 구조가 잘못되면 값의 열을 신뢰할 수 없으므로 행 검사를 하지 않는다.
  if (headerIssues.length > 0) return { rows: [], issues: [...issues, ...headerIssues], validHeader: false };

  const result = Papa.parse<Record<string, string>>(source.slice(headerStart), {
    delimiter: ",",
    header: true,
    skipEmptyLines: true,
    comments: "#",
    transformHeader: (value) => value.trim(),
    transform: (value) => value.trim(),
  });
  const invalidRows = new Set<number>();
  for (const error of result.errors) {
    if (error.type !== "FieldMismatch") continue; // 따옴표 오류는 위에서 실제 줄 번호와 함께 수집했다.
    const row = error.row ?? 0;
    if (emptyRows.has(row)) continue;
    invalidRows.add(row);
    issues.push({ file, line: lines[row + 1] ?? headerLine, column: "CSV", message:
      error.code === "TooManyFields" ? "열 이름보다 값의 개수가 많습니다" : "열 이름보다 값의 개수가 적습니다" });
  }
  return {
    rows: result.data.flatMap((data, index) => invalidRows.has(index) || emptyRows.has(index)
      ? [] : [{ data, line: lines[index + 1] ?? headerLine }]),
    issues,
    validHeader: true,
  };
}
