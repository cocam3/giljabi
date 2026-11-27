import { fiveYearEntrySchema, roadmapItemSchema, roadmapSchema, type FiveYearEntry, type Roadmap, type RoadmapItem, type RoadmapItemInput } from "./schema";
import type { TermKey } from "./terms";

export interface RoadmapOptions { now?: Date; id?: string }
export type AddItemResult =
  | { ok: true; roadmap: Roadmap }
  | { ok: false; reason: "duplicate"; existingTerm: TermKey };

const emptyPlan = () => Array.from({ length: 5 }, () => ({ chips: [], text: "" }));
const time = (now?: Date) => (now ?? new Date()).toISOString();
const validate = (roadmap: Roadmap): Roadmap => roadmapSchema.parse(roadmap);

export function createRoadmap(
  input: { name: string; track1Id: string; track2Id: string | null; career: string },
  opts: RoadmapOptions = {},
): Roadmap {
  const timestamp = time(opts.now);
  return validate({
    id: opts.id ?? crypto.randomUUID(), name: input.name, track1Id: input.track1Id,
    track2Id: input.track2Id, career: input.career, showSeasonal: false, items: [],
    fiveYearPlan: emptyPlan(), isPublic: false, createdAt: timestamp, updatedAt: timestamp,
  });
}

export function addItem(roadmap: Roadmap, input: RoadmapItemInput, opts: RoadmapOptions = {}): AddItemResult {
  const item: RoadmapItem = roadmapItemSchema.parse(input);
  if (item.kind === "course") {
    const existing = roadmap.items.find((current) => current.kind === "course" && current.courseCode === item.courseCode);
    if (existing?.kind === "course") return { ok: false, reason: "duplicate", existingTerm: existing.term };
  }
  return { ok: true, roadmap: validate({ ...roadmap, items: [...roadmap.items, item], updatedAt: time(opts.now) }) };
}

export function moveItem(roadmap: Roadmap, itemId: string, toTerm: TermKey, toIndex: number, opts: RoadmapOptions = {}): Roadmap {
  const item = roadmap.items.find((entry) => entry.id === itemId);
  if (!item) return roadmap;
  const remaining = roadmap.items.filter((entry) => entry.id !== itemId);
  const destination = remaining.filter((entry) => entry.term === toTerm);
  const index = Math.max(0, Math.min(Number.isFinite(toIndex) ? Math.trunc(toIndex) : destination.length, destination.length));
  const moved = { ...item, term: toTerm } as RoadmapItem;
  const insertAt = index < destination.length
    ? remaining.findIndex((entry) => entry.id === destination[index].id)
    : destination.length > 0
      ? remaining.findIndex((entry) => entry.id === destination[destination.length - 1].id) + 1
      : remaining.length;
  const items = [...remaining];
  items.splice(insertAt, 0, moved);
  return validate({ ...roadmap, items, updatedAt: time(opts.now) });
}

function updateItem(roadmap: Roadmap, itemId: string, updater: (item: RoadmapItem) => RoadmapItem, opts?: RoadmapOptions): Roadmap {
  if (!roadmap.items.some((item) => item.id === itemId)) return roadmap;
  return validate({ ...roadmap, items: roadmap.items.map((item) => item.id === itemId ? updater(item) : item), updatedAt: time(opts?.now) });
}

export function removeItem(roadmap: Roadmap, itemId: string, opts?: RoadmapOptions): Roadmap {
  if (!roadmap.items.some((item) => item.id === itemId)) return roadmap;
  return validate({ ...roadmap, items: roadmap.items.filter((item) => item.id !== itemId), updatedAt: time(opts?.now) });
}
export function setCompleted(roadmap: Roadmap, itemId: string, completed: boolean, opts?: RoadmapOptions): Roadmap {
  return updateItem(roadmap, itemId, (item) => ({ ...item, completed }), opts);
}
export function updateItemMemo(roadmap: Roadmap, itemId: string, memo: string | undefined, opts?: RoadmapOptions): Roadmap {
  return updateItem(roadmap, itemId, (item) => ({ ...item, memo }), opts);
}
export function updateRoadmapInfo(roadmap: Roadmap, patch: Partial<Pick<Roadmap, "name" | "track1Id" | "track2Id" | "career" | "showSeasonal">>, opts?: RoadmapOptions): Roadmap {
  return validate({ ...roadmap, ...patch, updatedAt: time(opts?.now) });
}
export function updateFiveYearPlan(roadmap: Roadmap, yearIndex: number, entry: FiveYearEntry, opts?: RoadmapOptions): Roadmap {
  if (!Number.isInteger(yearIndex) || yearIndex < 0 || yearIndex > 4) throw new RangeError("5년 계획 위치는 0~4여야 합니다");
  const validatedEntry = fiveYearEntrySchema.parse(entry);
  return validate({ ...roadmap, fiveYearPlan: roadmap.fiveYearPlan.map((current, index) => index === yearIndex ? validatedEntry : current), updatedAt: time(opts?.now) });
}
export function itemsInTerm(roadmap: Roadmap, term: TermKey): RoadmapItem[] {
  return roadmap.items.filter((item) => item.term === term);
}
