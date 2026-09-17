"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import {
  confirmedObservationTrends,
  formatObservationWhen,
  planAdherence,
  type ObservationLike,
  type PlanLike,
  type SessionLike,
} from "@/lib/rehabProgress";
import { userFacingError } from "@/lib/userFacingError";

type Patient = { id: string; full_name: string; email: string };
type Plan = PlanLike & {
  id: string;
  patient_id: string;
  title: string;
  start_date: string;
  duration_weeks: number;
};

export function ProgressOverview() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<SessionLike[]>([]);
  const [observations, setObservations] = useState<ObservationLike[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Patient[]>("/patients"),
      api<Plan[]>("/plans"),
      api<SessionLike[]>("/sessions"),
      api<ObservationLike[]>("/observations"),
    ])
      .then(([patientRows, planRows, sessionRows, observationRows]) => {
        setPatients(patientRows);
        setPlans(planRows);
        setSessions(sessionRows);
        setObservations(observationRows);
      })
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load progress.")),
      )
      .finally(() => setLoading(false));
  }, []);

  const byPatient = useMemo(() => {
    return patients.map((patient) => {
      const plan = plans.find((row) => row.patient_id === patient.id);
      const patientObs = observations.filter(
        (row) => row.patient_id === patient.id,
      );
      const adherence = plan ? planAdherence(plan, sessions) : null;
      const trends = confirmedObservationTrends(patientObs);
      return { patient, plan, adherence, trends };
    });
  }, [patients, plans, sessions, observations]);

  if (loading) return <LoadingBlock label="Loading progress…" />;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setLoading(true);
          setError("");
          Promise.all([
            api<Patient[]>("/patients"),
            api<Plan[]>("/plans"),
            api<SessionLike[]>("/sessions"),
            api<ObservationLike[]>("/observations"),
          ])
            .then(([patientRows, planRows, sessionRows, observationRows]) => {
              setPatients(patientRows);
              setPlans(planRows);
              setSessions(sessionRows);
              setObservations(observationRows);
            })
            .catch((err: unknown) =>
              setError(userFacingError(err, "Could not load progress.")),
            )
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  if (byPatient.length === 0) {
    return (
      <EmptyState
        title="No patients yet"
        body="Progress summaries appear once patients are linked to your clinic."
      />
    );
  }

  return (
    <div className="review-bento">
      {byPatient.map(({ patient, plan, adherence, trends }) => (
        <article className="card" key={patient.id} style={{ padding: 12 }}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 4px" }}>
            {patient.full_name}
          </h2>
          <p className="subtitle" style={{ margin: 0 }}>
            {plan?.title ?? "No active plan assigned"}
          </p>

          <div className="progress-section" style={{ marginTop: 10 }}>
            <p className="review-kicker">Adherence</p>
            {adherence && adherence.prescribed > 0 ? (
              <>
                <p className="progress-stat-sm" style={{ fontSize: "1.15rem" }}>
                  {adherence.completed} / {adherence.prescribed}
                </p>
                <p className="subtitle">{adherence.label}</p>
              </>
            ) : (
              <p className="subtitle">Insufficient session data.</p>
            )}
          </div>

          <div className="progress-section" style={{ marginTop: 10 }}>
            <p className="review-kicker">Confirmed observations</p>
            {trends.length === 0 ? (
              <p className="subtitle">None yet.</p>
            ) : (
              <ul className="trend-list">
                {trends.map((trend) => (
                  <li className="trend-item" key={trend.key}>
                    <strong>
                      {trend.exerciseName} · {trend.metric}
                    </strong>
                    <p>
                      {trend.previous != null
                        ? `${trend.previous} → ${trend.current}`
                        : String(trend.current)}
                    </p>
                    <p className="subtitle">
                      {formatObservationWhen(
                        trend.points[trend.points.length - 1]?.when,
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
