"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import {
  confirmedObservationTrends,
  formatObservationWhen,
  latestPatientReported,
  planAdherence,
  todayAdherence,
  type ObservationLike,
  type PlanLike,
  type SessionLike,
} from "@/lib/rehabProgress";
import { userFacingError } from "@/lib/userFacingError";

type Plan = PlanLike & {
  title: string;
  start_date: string;
  duration_weeks: number;
  goal?: string;
};

export default function PatientProgressPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<SessionLike[]>([]);
  const [observations, setObservations] = useState<ObservationLike[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api<Plan[]>("/plans"),
      api<SessionLike[]>("/sessions"),
      api<ObservationLike[]>("/observations"),
    ])
      .then(([planRows, sessionRows, observationRows]) => {
        setPlans(planRows);
        setSessions(sessionRows);
        setObservations(observationRows);
      })
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load your progress.")),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plan = plans[0];
  const adherence = plan ? planAdherence(plan, sessions) : null;
  const today = plan ? todayAdherence(plan, sessions) : null;
  const trends = useMemo(
    () => confirmedObservationTrends(observations),
    [observations],
  );
  const reported = latestPatientReported(sessions);
  const adherencePct =
    adherence && adherence.prescribed > 0
      ? Math.round((adherence.completed / adherence.prescribed) * 100)
      : 0;

  return (
    <div className="dashboard-page bento-page patient-bento">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Your recovery record</p>
          <h1>Progress</h1>
          <p className="subtitle">
            Session completion is system-derived. Confirmed movement numbers
            only appear after your physiotherapist reviews them.
          </p>
        </div>
        <Link className="btn btn-outline btn-sm" href="/patient">
          Back to today
        </Link>
      </header>

      {loading ? <LoadingBlock label="Loading progress…" /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && !plan ? (
        <EmptyState
          title="No plan yet"
          body="Progress appears after your physiotherapist assigns a rehabilitation plan and you complete sessions."
          action={
            <Link className="btn btn-primary" href="/patient">
              Go to today
            </Link>
          }
        />
      ) : null}

      {!loading && !error && plan && adherence ? (
        <div className="bento-grid bento-patient-progress">
          <section className="bento-tile tile-completion">
            <p className="review-kicker">System-derived</p>
            <h2>Exercise completion</h2>
            <p className="progress-stat">
              {adherence.completed} / {adherence.prescribed}
            </p>
            <div
              className="welcome-banner-bar patient-progress-bar"
              aria-hidden
            >
              <span style={{ width: `${adherencePct}%` }} />
            </div>
            <p className="subtitle">{adherence.label}</p>
            <p className="subtitle">
              {today && today.prescribed > 0
                ? `Today: ${today.label}`
                : today?.label}
            </p>
          </section>

          <section className="bento-tile tile-trends">
            <p className="review-kicker">Therapist-confirmed</p>
            <h2>Reviewed movement observations</h2>
            <div className="bento-scroll">
              {trends.length === 0 ? (
                <p className="subtitle">
                  No confirmed observations yet. After your physiotherapist
                  approves a session metric, it will show here.
                </p>
              ) : (
                <div className="trend-list">
                  {trends.map((trend) => (
                    <article className="trend-item" key={trend.key}>
                      <h3>
                        {trend.exerciseName} · {trend.metric}
                      </h3>
                      {trend.previous != null && trend.current != null ? (
                        <p className="progress-stat-sm">
                          {trend.previous} → {trend.current}
                        </p>
                      ) : (
                        <p className="progress-stat-sm">
                          {trend.current ?? "—"}
                        </p>
                      )}
                      <p className="subtitle">
                        {trend.points.length >= 2
                          ? `${formatObservationWhen(trend.points[trend.points.length - 2]?.when)} → ${formatObservationWhen(trend.points[trend.points.length - 1]?.when)}`
                          : formatObservationWhen(trend.points[0]?.when)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bento-tile tile-notes">
            <p className="review-kicker">Patient-reported</p>
            <h2>Latest session notes</h2>
            {reported ? (
              <>
                <p>
                  Reported repetitions:{" "}
                  <strong>{reported.reported_repetitions ?? "—"}</strong>
                </p>
                <p className="subtitle">
                  {reported.patient_notes || "No written notes."}
                </p>
                <p className="subtitle">
                  {formatObservationWhen(
                    reported.ended_at || reported.started_at,
                  )}
                </p>
              </>
            ) : (
              <p className="subtitle">No patient-reported session notes yet.</p>
            )}
          </section>

          <section className="bento-tile tile-pending-metrics">
            <p className="review-kicker">Not collected</p>
            <h2>Pain scores &amp; range of motion</h2>
            <p className="subtitle">
              Stride does not currently store structured pain scores or
              range-of-motion measurements. Those will appear here only if your
              clinic starts collecting them.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
