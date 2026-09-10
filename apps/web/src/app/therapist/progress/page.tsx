"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  confirmedObservationTrends,
  formatObservationWhen,
  planAdherence,
  type ObservationLike,
  type PlanLike,
  type SessionLike,
} from "@/lib/rehabProgress";

type Patient = { id: string; full_name: string; email: string };
type Plan = PlanLike & {
  id: string;
  patient_id: string;
  title: string;
  start_date: string;
  duration_weeks: number;
};

export default function TherapistProgressPage() {
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
      .catch((err: Error) => setError(err.message))
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

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Clinic progress</p>
          <h1>Patient recovery overview</h1>
          <p className="subtitle" style={{ marginTop: 8, maxWidth: "56ch" }}>
            Adherence comes from completed sessions. Confirmed movement values
            come only from approved or corrected observations — not from pending
            system metrics.
          </p>
        </div>
        <Link className="btn btn-primary" href="/therapist/reviews">
          Open review queue
        </Link>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="subtitle">Loading…</p> : null}

      {!loading && byPatient.length === 0 ? (
        <div className="card">
          <h2>No patients yet</h2>
          <p className="subtitle">
            Progress summaries appear once patients are linked to your clinic.
          </p>
        </div>
      ) : null}

      <div className="review-stack">
        {byPatient.map(({ patient, plan, adherence, trends }) => (
          <article className="card" key={patient.id}>
            <h2>{patient.full_name}</h2>
            <p className="subtitle">
              {plan?.title ?? "No active plan assigned"}
            </p>

            <div className="progress-section" style={{ marginTop: 16 }}>
              <p className="review-kicker">System-derived adherence</p>
              {adherence && adherence.prescribed > 0 ? (
                <>
                  <p className="progress-stat-sm">
                    {adherence.completed} / {adherence.prescribed}
                  </p>
                  <p className="subtitle">{adherence.label}</p>
                </>
              ) : (
                <p className="subtitle">
                  Insufficient session data to show adherence.
                </p>
              )}
            </div>

            <div className="progress-section" style={{ marginTop: 16 }}>
              <p className="review-kicker">Therapist-confirmed observations</p>
              {trends.length === 0 ? (
                <p className="subtitle">
                  No approved or corrected observations yet.
                </p>
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
    </div>
  );
}
