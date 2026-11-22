import { z } from "zod";

export const ruleFileNames = [
  "tracks.csv",
  "courses.csv",
  "requirements.csv",
  "micro_degrees.csv",
  "competencies.csv",
] as const;

export type RuleFileName = (typeof ruleFileNames)[number];

export const ruleColumns = {
  "tracks.csv": ["track_id", "name", "college", "day_night", "status", "source", "as_of"],
  "courses.csv": ["track_id", "year", "semester", "category", "course_code", "course_name", "credits", "source", "as_of"],
  "requirements.csv": ["rule_id", "applies_from", "applies_until", "applies_track", "type", "value", "note", "source", "as_of"],
  "micro_degrees.csv": ["md_id", "name", "type", "needs_application", "course_name", "credits", "source", "as_of"],
  "competencies.csv": ["track_id", "competency", "career", "certificate", "source", "as_of"],
} as const satisfies Record<RuleFileName, readonly string[]>;

const text = z.string({ error: "문자열이어야 합니다" }).trim();
const requiredText = text.min(1, "필수 값이 비어 있습니다");
const optionalText = text.transform((value) => value === "" ? undefined : value);
const nonnegativeNumber = text
  .refine(
    (value) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)
      && Number.isFinite(Number(value)) && Number(value) >= 0,
    "0 이상의 숫자여야 합니다",
  )
  .transform(Number);
const admissionYear = text
  .regex(/^\d{4}$/, "4자리 정수여야 합니다")
  .transform(Number);

const common = {
  source: text.regex(/^https?:\/\//, "비어 있지 않은 http:// 또는 https:// URL이어야 합니다").pipe(z.url({
    protocol: /^https?$/,
    error: "비어 있지 않은 http:// 또는 https:// URL이어야 합니다",
  })),
  as_of: text.pipe(z.iso.date({ error: "YYYY-MM-DD 형식의 실제 날짜여야 합니다" })),
};

export const trackSchema = z.object({
  track_id: requiredText,
  name: requiredText,
  college: requiredText,
  day_night: text.pipe(z.enum(["주간", "야간"], { error: "주간 또는 야간이어야 합니다" })),
  status: text.pipe(z.enum(["운영", "모집중지"], { error: "운영 또는 모집중지여야 합니다" })),
  ...common,
});

export const courseSchema = z.object({
  track_id: requiredText,
  year: text.pipe(z.enum(["1", "2", "3", "4"], { error: "1~4의 정수 학년이어야 합니다" })).transform(Number),
  semester: text.pipe(z.enum(["1", "2"], { error: "1 또는 2 학기여야 합니다" })).transform(Number),
  category: text.pipe(z.enum(["전기", "전필", "전선"], { error: "전기, 전필, 전선 중 하나여야 합니다" })),
  course_code: requiredText,
  course_name: requiredText,
  credits: nonnegativeNumber,
  ...common,
});

const requirementFields = {
  rule_id: requiredText,
  applies_from: admissionYear,
  applies_until: text.pipe(z.union([z.literal(""), admissionYear], { error: "빈 값 또는 4자리 정수여야 합니다" }))
    .transform((value) => value === "" ? undefined : value),
  applies_track: requiredText,
  note: optionalText,
  ...common,
};

const requirementUnion = z.discriminatedUnion("type", [
  z.object({
    ...requirementFields,
    type: z.enum(["총학점", "전공", "교양", "비교과"]),
    value: nonnegativeNumber,
  }),
  z.object({
    ...requirementFields,
    type: z.literal("비학점"),
    value: requiredText,
  }),
], { error: "총학점, 전공, 교양, 비교과, 비학점 중 하나여야 합니다" });

// 판별 열도 앞뒤 공백을 제거한 뒤 유니온을 선택한다.
export const requirementSchema = z.preprocess((input) => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return input;
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [
    key, typeof value === "string" ? value.trim() : value,
  ]));
}, requirementUnion.refine(
  (row) => row.applies_until === undefined || row.applies_until >= row.applies_from,
  { path: ["applies_until"], message: "적용 끝 입학년도는 적용 시작 입학년도 이상이어야 합니다" },
));

export const microDegreeSchema = z.object({
  md_id: requiredText,
  name: requiredText,
  type: requiredText,
  needs_application: text.toLowerCase()
    .pipe(z.enum(["true", "false"], { error: "true 또는 false여야 합니다 (대소문자 무관)" }))
    .transform((value) => value === "true"),
  course_name: requiredText,
  credits: nonnegativeNumber,
  ...common,
});

export const competencySchema = z.object({
  track_id: requiredText,
  competency: requiredText,
  career: requiredText,
  certificate: optionalText,
  ...common,
});

export type Track = z.infer<typeof trackSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type MicroDegree = z.infer<typeof microDegreeSchema>;
export type Competency = z.infer<typeof competencySchema>;

export interface RuleData {
  tracks: Track[];
  courses: Course[];
  requirements: Requirement[];
  micro_degrees: MicroDegree[];
  competencies: Competency[];
}
