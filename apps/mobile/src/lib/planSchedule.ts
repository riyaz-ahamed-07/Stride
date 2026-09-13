import type { ExerciseSession, Plan, PlanItem } from "../types";

export const DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export function todayDow(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

export function planWeek(
  startISO: string | undefined,
  durationWeeks: number,
): number {
  if (!startISO) return 1;
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), durationWeeks || 4);
}

export function dayLabel(dayOfWeek: number | null | undefined): string {
  if (dayOfWeek === null || dayOfWeek === undefined) return "Any day";
  return DAY_LABELS[dayOfWeek] ?? "Any day";
}

export function itemMatchesToday(
  item: PlanItem,
  week: number,
  dow: number,
): boolean {
  return (
    item.week_number === week &&
    item.session_type === "home" &&
    (item.day_of_week === null || item.day_of_week === dow)
  );
}

export function filterTodayHome(plan: Plan, week?: number): PlanItem[] {
  const w = week ?? planWeek(plan.start_date, plan.duration_weeks);
  const dow = todayDow();
  return plan.items.filter((item) => itemMatchesToday(item, w, dow));
}

export function filterByWeek(plan: Plan, week: number): PlanItem[] {
  return plan.items.filter((item) => item.week_number === week);
}

export function groupByDay(items: PlanItem[]): Map<number | "any", PlanItem[]> {
  const groups = new Map<number | "any", PlanItem[]>();
  for (const item of items) {
    const key =
      item.day_of_week === null || item.day_of_week === undefined
        ? "any"
        : item.day_of_week;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

export function completedExerciseIds(sessions: ExerciseSession[]): Set<string> {
  return new Set(
    sessions
      .filter((s) => s.status === "completed")
      .map((s) => s.plan_exercise_id),
  );
}

export function isExerciseCompleted(
  exerciseId: string,
  sessions: ExerciseSession[],
): boolean {
  return sessions.some(
    (s) => s.plan_exercise_id === exerciseId && s.status === "completed",
  );
}

/** Share of plan exercises with ≥1 completed session (system-derived, not clinical). */
export function planProgressPercent(
  plan: Plan,
  sessions: ExerciseSession[],
): number {
  if (!plan.items.length) return 0;
  const done = completedExerciseIds(sessions);
  const completed = plan.items.filter((item) => done.has(item.id)).length;
  return Math.round((completed / plan.items.length) * 100);
}

/** Today's home exercises completion (system-derived). */
export function todayProgressPercent(
  plan: Plan,
  sessions: ExerciseSession[],
  week?: number,
): number {
  const today = filterTodayHome(plan, week);
  if (!today.length) return 0;
  const done = completedExerciseIds(sessions);
  const completed = today.filter((item) => done.has(item.id)).length;
  return Math.round((completed / today.length) * 100);
}

export function planAdherenceLabel(
  plan: Plan,
  sessions: ExerciseSession[],
): string {
  if (!plan.items.length) return "No exercises prescribed yet";
  const done = completedExerciseIds(sessions);
  const completed = plan.items.filter((item) => done.has(item.id)).length;
  return `${completed} of ${plan.items.length} plan exercises completed`;
}

export function weekOptions(plan: Plan): number[] {
  const weeks =
    plan.duration_weeks || Math.max(...plan.items.map((i) => i.week_number), 1);
  return Array.from({ length: weeks }, (_, i) => i + 1);
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstIncompleteToday(
  plan: Plan,
  sessions: ExerciseSession[],
): PlanItem | null {
  const week = planWeek(plan.start_date, plan.duration_weeks);
  const done = completedExerciseIds(sessions);
  return filterTodayHome(plan, week).find((item) => !done.has(item.id)) ?? null;
}

export function dosageLabel(
  item: Pick<PlanItem, "target_sets" | "target_repetitions" | "frequency_note">,
): string {
  const dose = `${item.target_sets} sets × ${item.target_repetitions} repetitions`;
  const frequency = item.frequency_note?.trim();
  return frequency ? `${dose} · ${frequency}` : dose;
}

export function setupCues(demoCue: string | undefined): string[] {
  if (!demoCue?.trim()) return [];
  return demoCue
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function exercisePurpose(
  item: Pick<PlanItem, "body_region">,
  planGoal?: string,
): string | null {
  const region = item.body_region?.trim();
  if (region && region !== "general") {
    return `Prescribed for ${region.replace(/-/g, " ")} rehabilitation.`;
  }
  const goal = planGoal?.trim();
  return goal || null;
}

export function upcomingScheduled<
  T extends { status: string; scheduled_at: string },
>(rows: T[]): T | null {
  const now = Date.now();
  const scheduled = rows
    .filter((row) => row.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );
  return (
    scheduled.find((row) => new Date(row.scheduled_at).getTime() >= now) ??
    scheduled[0] ??
    null
  );
}
