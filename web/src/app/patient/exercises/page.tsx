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

  return (
    <div className="care-page">
      <header className="care-header">
        <p className="care-kicker">Rehabilitation plan</p>

        <h1>{plan?.title ?? "Your plan"}</h1>
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
        <>
          <p className="care-program">
            {therapist ? (
              <>Prescribed by {therapist.full_name}</>
            ) : (
              <>Prescribing physiotherapist details are not available.</>
            )}

            {plan.duration_weeks ? ` · ${plan.duration_weeks} weeks` : null}
          </p>

          {plan.goal ? <p className="care-lede">{plan.goal}</p> : null}

          <div className="care-weeks" role="tablist" aria-label="Program week">
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

          <section className="care-section">
            <h2>Exercises · week {weekFilter}</h2>

            {weekItems.length === 0 ? (
              <p className="care-empty">No exercises assigned for this week.</p>
            ) : (
              <ul className="care-list care-list-actions">
                {weekItems.map((item) => (
                  <PlanExerciseRow
                    key={item.id}
                    item={item}
                    done={isExerciseCompleted(item.id, sessions)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
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
    <li>
      <div>
        <p className="care-meta">
          {supervised ? "Supervised" : "Home"} · {dayLabel(item.day_of_week)}
        </p>

        <h3>{item.exercise_name}</h3>

        <p>{dosageLabel(item)}</p>
      </div>

      <div className="care-row-end">
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
