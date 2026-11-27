import { z } from "zod";
import { TERM_ORDER } from "./terms";

const trimmed = z.string().trim();
const requiredText = trimmed.min(1, "값을 입력해 주세요");
const credits = z.number().finite().min(0);
const isoDateTime = z.iso.datetime();

export const profileSchema = z.object({
  admissionYear: z.number().int().min(1000).max(9999),
  dayNight: z.enum(["주간", "야간"]),
  currentYear: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  currentSemester: z.union([z.literal(1), z.literal(2)]),
});

export type Profile = z.infer<typeof profileSchema>;

const commonItem = {
  id: requiredText,
  term: z.enum(TERM_ORDER),
  completed: z.boolean().default(false),
  memo: trimmed.max(200).optional(),
};

export const roadmapItemSchema = z.discriminatedUnion("kind", [
  z.object({ ...commonItem, kind: z.literal("course"), courseCode: requiredText, courseName: requiredText, credits, trackId: requiredText }),
  z.object({ ...commonItem, kind: z.literal("otherCourse"), name: requiredText, credits }),
  z.object({ ...commonItem, kind: z.literal("extracurricular"), name: requiredText, programId: requiredText.optional() }),
  z.object({ ...commonItem, kind: z.literal("academic"), name: requiredText, mdId: requiredText.optional() }),
  z.object({ ...commonItem, kind: z.literal("external"), category: z.enum(["어학시험", "자격증", "인턴", "대외활동", "기타"]), name: requiredText }),
]);

export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type RoadmapItemInput = z.input<typeof roadmapItemSchema>;

export const chipSchema = z.enum(["자격증", "시험", "대학원", "취업", "이직"]);
export const fiveYearEntrySchema = z.object({
  chips: z.array(chipSchema).refine((chips) => new Set(chips).size === chips.length, "중복 항목은 선택할 수 없습니다"),
  text: trimmed.max(500),
});
export const fiveYearPlanSchema = z.array(fiveYearEntrySchema).length(5);

export type Chip = z.infer<typeof chipSchema>;
export type FiveYearEntry = z.infer<typeof fiveYearEntrySchema>;
export type FiveYearPlan = z.infer<typeof fiveYearPlanSchema>;

export const roadmapSchema = z.object({
  id: requiredText,
  name: requiredText.max(40),
  track1Id: requiredText,
  track2Id: requiredText.nullable(),
  career: trimmed.max(100),
  showSeasonal: z.boolean(),
  items: z.array(roadmapItemSchema),
  // 5년 계획은 항상 비공개이며 공개용 변환에서는 이 필드를 제외한다.
  fiveYearPlan: fiveYearPlanSchema,
  isPublic: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Roadmap = z.infer<typeof roadmapSchema>;

export const nonCreditChecksSchema = z.record(z.string().trim().min(1), z.boolean());
export type NonCreditChecks = z.infer<typeof nonCreditChecksSchema>;

export const storedDataSchema = z.object({
  version: z.literal(1),
  profile: profileSchema.nullable(),
  roadmaps: z.array(roadmapSchema),
  primaryRoadmapId: requiredText.nullable(),
  nonCreditChecks: nonCreditChecksSchema,
});
export type StoredData = z.infer<typeof storedDataSchema>;
