export type SessionType = "home" | "supervised";

export type CarePlanItem = {
  id: string;
  exercise_name: string;
  target_sets: number;
  target_repetitions: number;
  instructions: string;
  safety_notes: string;
  week_number: number;
  day_of_week: number | null;
  session_type: SessionType;
  sort_order?: number;
  pose_recipe_key: string | null;
  demo_cue: string;
  frequency_note: string;
  body_region: string;
};

export type CarePlan = {
  id: string;
  title: string;
  start_date: string;
  duration_weeks: number;
  goal: string;
  items: CarePlanItem[];
};

export type CareSession = { plan_exercise_id: string; status: string };

export type TherapistContact = {
  full_name: string;
  phone: string | null;
  clinic_name: string | null;
};

export const DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function todayDow(now = new Date()): number {
  const js = now.getDay();
  return js === 0 ? 6 : js - 1;
}

export function planWeek(
  startISO: string | undefined,
  durationWeeks: number,
  now = new Date(),
): number {
  if (!startISO) return 1;
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), durationWeeks || 4);
}

export function dayLabel(dayOfWeek: number | null | undefined): string {
  if (dayOfWeek === null || dayOfWeek === undefined) return "Any day";
  return DAY_LABELS[dayOfWeek] ?? "Any day";
}

export function itemMatchesToday(
  item: CarePlanItem,
  week: number,
  dow: number,
): boolean {
  return (
    item.week_number === week &&
    item.session_type === "home" &&
    (item.day_of_week === null || item.day_of_week === dow)
  );
}

export function filterTodayHome(plan: CarePlan, week?: number): CarePlanItem[] {
  const w = week ?? planWeek(plan.start_date, plan.duration_weeks);
  const dow = todayDow();
  return plan.items.filter((item) => itemMatchesToday(item, w, dow));
}

export function completedIds(sessions: CareSession[]): Set<string> {
  return new Set(
    sessions
      .filter((s) => s.status === "completed")
      .map((s) => s.plan_exercise_id),
  );
}

export function isExerciseCompleted(
  exerciseId: string,
  sessions: CareSession[],
): boolean {
  return sessions.some(
    (s) => s.plan_exercise_id === exerciseId && s.status === "completed",
  );
}

export function firstIncompleteToday(
  plan: CarePlan,
  sessions: CareSession[],
): CarePlanItem | null {
  const week = planWeek(plan.start_date, plan.duration_weeks);
  const done = completedIds(sessions);
  return filterTodayHome(plan, week).find((item) => !done.has(item.id)) ?? null;
}

export function dosageLabel(
  item: Pick<
    CarePlanItem,
    "target_sets" | "target_repetitions" | "frequency_note"
  >,
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
  item: Pick<CarePlanItem, "body_region" | "pose_recipe_key">,
  planGoal?: string,
  recipeCue?: string | null,
): string | null {
  if (recipeCue?.trim()) return recipeCue.trim();
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
    scheduled.find(
      (row) => new Date(row.scheduled_at).getTime() >= now - 30 * 60 * 1000,
    ) ??
    scheduled[0] ??
    null
  );
}

export function partitionAppointments<
  T extends { status: string; scheduled_at: string },
>(rows: T[]): { upcoming: T[]; past: T[] } {
  const now = Date.now() - 30 * 60 * 1000;
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const upcoming = sorted.filter(
    (row) =>
      row.status === "scheduled" && new Date(row.scheduled_at).getTime() >= now,
  );
  const past = sorted
    .filter((row) => !upcoming.includes(row))
    .sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
    );
  return { upcoming, past };
}

export function formatVisitWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Local datetime-local value → ISO string with offset for the API. */
export function localInputToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Choose a valid date and time.");
  }
  return date.toISOString();
}

export function defaultLocalDateTimeInput(hoursAhead = 2): string {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
