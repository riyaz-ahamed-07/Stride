/** Honest rehab progress helpers — only metrics the API actually stores. */

export type PlanItemLike = {
  id: string;
  week_number?: number;
  day_of_week?: number | null;
  session_type?: string;
  target_sets?: number;
  target_repetitions?: number;
  exercise_name?: string;
};

export type PlanLike = {
  id?: string;
  title?: string;
  patient_id?: string;
  start_date?: string;
  duration_weeks?: number;
  items: PlanItemLike[];
};

export type SessionLike = {
  plan_exercise_id: string;
  status: string;
  started_at?: string;
  ended_at?: string | null;
  reported_repetitions?: number | null;
  patient_notes?: string | null;
};

export type ObservationLike = {
  id: string;
  metric: string;
  value: number;
  confidence: number;
  review_status: string;
  exercise_name?: string | null;
  patient_id?: string | null;
  patient_name?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  reported_repetitions?: number | null;
  patient_notes?: string | null;
  original_value?: number | null;
  therapist_comment?: string | null;
};

export type AdherenceSummary = {
  completed: number;
  prescribed: number;
  percent: number | null;
  label: string;
};

export type ConfirmedTrend = {
  key: string;
  exerciseName: string;
  metric: string;
  points: { value: number; when: string; status: string }[];
  previous: number | null;
  current: number | null;
};

function todayDow(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

function planWeek(startISO: string | undefined, duration: number): number {
  if (!startISO) return 1;
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), duration || 4);
}

export function completedExerciseIds(sessions: SessionLike[]): Set<string> {
  return new Set(
    sessions.filter((s) => s.status === "completed").map((s) => s.plan_exercise_id),
  );
}

/** Share of plan exercises with at least one completed session (system-derived). */
export function planProgressPercent(plan: PlanLike, sessions: SessionLike[]): number {
  const adherence = planAdherence(plan, sessions);
  return adherence.percent ?? 0;
}

export function planAdherence(plan: PlanLike, sessions: SessionLike[]): AdherenceSummary {
  const prescribed = plan.items.length;
  if (!prescribed) {
    return { completed: 0, prescribed: 0, percent: null, label: "No exercises prescribed yet" };
  }
  const done = completedExerciseIds(sessions);
  const completed = plan.items.filter((item) => done.has(item.id)).length;
  return {
    completed,
    prescribed,
    percent: Math.round((completed / prescribed) * 100),
    label: `${completed} of ${prescribed} plan exercises completed`,
  };
}

export function todayAdherence(plan: PlanLike, sessions: SessionLike[]): AdherenceSummary {
  const week = planWeek(plan.start_date, plan.duration_weeks || 4);
  const dow = todayDow();
  const todayItems = plan.items.filter(
    (item) =>
      (item.week_number ?? 1) === week &&
      (item.session_type ?? "home") === "home" &&
      (item.day_of_week === null || item.day_of_week === undefined || item.day_of_week === dow),
  );
  if (!todayItems.length) {
    return {
      completed: 0,
      prescribed: 0,
      percent: null,
      label: "No home exercises scheduled for today",
    };
  }
  const done = completedExerciseIds(sessions);
  const completed = todayItems.filter((item) => done.has(item.id)).length;
  return {
    completed,
    prescribed: todayItems.length,
    percent: Math.round((completed / todayItems.length) * 100),
    label: `${completed} of ${todayItems.length} today's home exercises completed`,
  };
}

export function isConfirmedObservation(status: string): boolean {
  return status === "approved" || status === "corrected";
}

function observationWhen(row: ObservationLike): string {
  return row.ended_at || row.started_at || row.created_at || "";
}

/** Therapist-confirmed metric trends only (approved/corrected). Rejected excluded. */
export function confirmedObservationTrends(observations: ObservationLike[]): ConfirmedTrend[] {
  const confirmed = observations
    .filter((row) => isConfirmedObservation(row.review_status))
    .slice()
    .sort((a, b) => observationWhen(a).localeCompare(observationWhen(b)));

  const groups = new Map<string, ObservationLike[]>();
  for (const row of confirmed) {
    const key = `${row.exercise_name ?? "exercise"}::${row.metric}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const trends: ConfirmedTrend[] = [];
  for (const [key, list] of groups) {
    const points = list.map((row) => ({
      value: row.value,
      when: observationWhen(row),
      status: row.review_status,
    }));
    trends.push({
      key,
      exerciseName: list[0]?.exercise_name ?? "Exercise",
      metric: list[0]?.metric ?? "metric",
      points,
      previous: points.length >= 2 ? points[points.length - 2]!.value : null,
      current: points.length ? points[points.length - 1]!.value : null,
    });
  }
  return trends;
}

export function latestPatientReported(sessions: SessionLike[]): SessionLike | null {
  const withNotes = sessions
    .filter((s) => s.status === "completed" && (s.patient_notes || s.reported_repetitions != null))
    .slice()
    .sort((a, b) => (b.ended_at || b.started_at || "").localeCompare(a.ended_at || a.started_at || ""));
  return withNotes[0] ?? null;
}

export function formatObservationWhen(iso: string | null | undefined): string {
  if (!iso) return "Date not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
