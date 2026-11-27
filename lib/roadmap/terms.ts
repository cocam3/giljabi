import type { Profile } from "./schema";

export const TERM_ORDER = [
  "1-1", "1-S", "1-2", "1-W", "2-1", "2-S", "2-2", "2-W",
  "3-1", "3-S", "3-2", "3-W", "4-1", "4-S", "4-2", "4-W",
] as const;

export type TermKey = (typeof TERM_ORDER)[number];
export type TermStatus = "past" | "current" | "future";

export function isSeasonalTerm(term: TermKey): boolean {
  return term.endsWith("-S") || term.endsWith("-W");
}

export function termStatus(term: TermKey, profile: Profile | null | undefined): TermStatus | null {
  if (!profile) return null;
  const current = `${profile.currentYear}-${profile.currentSemester}`;
  const termIndex = TERM_ORDER.indexOf(term);
  const currentIndex = TERM_ORDER.indexOf(current as TermKey);
  if (termIndex < currentIndex) return "past";
  if (termIndex > currentIndex) return "future";
  return "current";
}
