"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import {
  type CarePlan,
  type CarePlanItem,
  type CareSession,
  type TherapistContact,
  dayLabel,
  dosageLabel,
  isExerciseCompleted,
  planWeek,
} from "@/lib/care";
import { userFacingError } from "@/lib/userFacingError";

export default function RehabilitationPlanPage() {
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [therapist, setTherapist] = useState<TherapistContact | null>(null);
  const [weekFilter, setWeekFilter] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([api<CarePlan[]>("/plans"), api<CareSession[]>("/sessions")])
      .then(async ([plans, sessionRows]) => {
        const row = plans[0] ?? null;
        setPlan(row);
        setSessions(sessionRows);
        if (row) setWeekFilter(planWeek(row.start_date, row.duration_weeks));
        try {
          setTherapist(await api<TherapistContact>("/auth/my-therapist"));
        } catch {
          setTherapist(null);
        }
      })
      .catch((err: unknown) =>
        setError(
          userFacingError(err, "Could not load your rehabilitation plan."),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weekItems = useMemo(() => {
    if (!plan) return [];
    return plan.items.filter((item) => item.week_number === weekFilter);
  }, [plan, weekFilter]);

  const completedInWeek = weekItems.filter((item) =>
    isExerciseCompleted(item.id, sessions),
  ).length;

  return (
    <div className="dashboard-page bento-page patient-bento">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Rehabilitation plan</p>
          <h1>{plan?.title ?? "Your plan"}</h1>
          {plan ? (
            <p className="subtitle">
              {therapist
                ? `Prescribed by ${therapist.full_name}`
                : "Prescribing physiotherapist details are not available."}
              {plan.duration_weeks ? ` · ${plan.duration_weeks} weeks` : null}
              {plan.goal ? ` · ${plan.goal}` : null}
            </p>
          ) : null}
        </div>
        <Link className="btn btn-outline btn-sm" href="/patient">
          Back to today
        </Link>
      </header>

      {loading ? (
        <LoadingBlock label="Loading your rehabilitation plan…" />
      ) : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && !plan ? (
        <EmptyState
          title="No active rehabilitation plan yet"
          body="Your physiotherapist will assign home exercises here after your assessment."
          action={
            <Link className="btn btn-outline" href="/patient">
              Back to today
            </Link>
          }
        />
      ) : null}

      {plan ? (
        <div className="bento-grid bento-patient-plan">
          <section className="bento-tile tile-weeks">
            <div className="bento-tile-head">
              <h2>Program week</h2>
              <span className="patient-chip">
                {completedInWeek}/{weekItems.length} this week
              </span>
            </div>
            <div
              className="care-weeks"
              role="tablist"
              aria-label="Program week"
            >
              {Array.from({ length: plan.duration_weeks }, (_, i) => i + 1).map(
                (week) => (
                  <button
                    key={week}
                    type="button"
                    className={
                      weekFilter === week ? "care-week active" : "care-week"
                    }
                    onClick={() => setWeekFilter(week)}
                  >
                    Week {week}
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="bento-tile tile-exercises">
            <div className="bento-tile-head">
              <h2>Exercises · week {weekFilter}</h2>
            </div>
            <div className="bento-scroll">
              {weekItems.length === 0 ? (
                <p className="subtitle">No exercises assigned for this week.</p>
              ) : (
                <ul className="patient-plan-list">
                  {weekItems.map((item) => (
                    <PlanExerciseRow
                      key={item.id}
                      item={item}
                      done={isExerciseCompleted(item.id, sessions)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PlanExerciseRow({
  item,
  done,
}: {
  item: CarePlanItem;
  done: boolean;
}) {
  const supervised = item.session_type === "supervised";

  return (
    <li className={done ? "is-done" : ""}>
      <div className="patient-plan-main">
        <p className="care-meta">
          {supervised ? "Supervised" : "Home"} · {dayLabel(item.day_of_week)}
        </p>
        <h3>{item.exercise_name}</h3>
        <p>{dosageLabel(item)}</p>
      </div>
      <div className="patient-plan-end">
        <span className={done ? "care-flag done" : "care-flag"}>
          {done ? "Completed" : "To do"}
        </span>
        {supervised ? (
          <p className="care-hint">Complete during your appointment.</p>
        ) : (
          <Link
            className="btn btn-primary btn-sm"
            href={`/patient/move/${item.id}`}
          >
            {done ? "Do again" : "Start exercise"}
          </Link>
        )}
      </div>
    </li>
  );
}
