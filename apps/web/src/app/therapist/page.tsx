"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import { formatVisitWhen, partitionAppointments } from "@/lib/care";
import { userFacingError } from "@/lib/userFacingError";

type Patient = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  notes: string | null;
};
type Observation = {
  id: string;
  metric: string;
  value: number;
  confidence: number;
  review_status: string;
  patient_name: string | null;
  exercise_name: string | null;
  started_at: string | null;
};
type Exercise = { id: string; name: string };
type Profile = { invite_code?: string | null };
type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
  patient_name: string | null;
};

export default function TherapistDesk() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<Observation[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [name, setName] = useState("New patient");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [patientRows, observationRows, exerciseRows, me, appointmentRows] =
      await Promise.all([
        api<Patient[]>("/patients"),
        api<Observation[]>("/observations"),
        api<Exercise[]>("/exercises"),
        api<Profile>("/auth/me"),
        api<Appointment[]>("/appointments"),
      ]);
    setPatients(patientRows);
    setQueue(observationRows.filter((row) => row.review_status === "pending"));
    setExercises(exerciseRows);
    setInviteCode(me.invite_code ?? null);
    setAppointments(appointmentRows);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load patients.")),
      )
      .finally(() => setLoading(false));
  }, []);

  async function addPatient(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/patients", {
        method: "POST",
        body: JSON.stringify({
          full_name: name,
          email,
          password: "StrideClinic1!",
        }),
      });
      setEmail("");
      await refresh();
    } catch (err) {
      setError(userFacingError(err, "Could not add patient."));
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Physiotherapist</p>
          <h1>Patients</h1>
        </div>
      </header>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            refresh()
              .catch((err: unknown) =>
                setError(userFacingError(err, "Could not load patients.")),
              )
              .finally(() => setLoading(false));
          }}
        />
      ) : null}
      {loading ? <LoadingBlock label="Loading patients…" /> : null}

      {!loading && inviteCode ? (
        <section className="card" style={{ marginBottom: 20 }}>
          <h2>Patient invite code</h2>
          <p className="subtitle">
            Share this code so patients can link to you during onboarding.
          </p>
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.12em",
              margin: "8px 0 0",
            }}
          >
            {inviteCode}
          </p>
        </section>
      ) : null}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{patients.length}</div>
          <div className="stat-label">Patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{queue.length}</div>
          <div className="stat-label">Awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {partitionAppointments(appointments).upcoming.length}
          </div>
          <div className="stat-label">Upcoming appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{exercises.length}</div>
          <div className="stat-label">Exercises</div>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}
      >
        <Link className="btn btn-primary" href="/therapist/reviews">
          Open review queue
        </Link>
        <Link className="btn btn-outline" href="/therapist/progress">
          Patient progress
        </Link>
        <Link className="btn btn-outline" href="/therapist/plans">
          Open plan builder
        </Link>
        <Link className="btn btn-outline" href="/therapist/exercises">
          Exercise library
        </Link>
        <Link className="btn btn-outline" href="/therapist/appointments">
          Schedule appointment
        </Link>
      </div>

      {!loading ? (
        <section className="card" style={{ marginBottom: 20 }}>
          <h2>Upcoming appointments</h2>
          {(() => {
            const { upcoming } = partitionAppointments(appointments);
            if (upcoming.length === 0) {
              return (
                <p className="subtitle">
                  No upcoming appointments.{" "}
                  <Link href="/therapist/appointments">Schedule one</Link>.
                </p>
              );
            }
            return (
              <div className="appointment-list">
                {upcoming.slice(0, 5).map((item) => (
                  <article className="appt-row" key={item.id}>
                    <div className="appt-row-main">
                      <div>
                        <h3>{item.patient_name ?? "Patient"}</h3>
                        <p className="appt-detail">
                          {formatVisitWhen(item.scheduled_at)}
                        </p>
                        {item.reason ? (
                          <p className="appt-detail">{item.reason}</p>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      className="btn btn-primary"
                      href={`/therapist/consult/${item.id}`}
                    >
                      Join consultation
                    </Link>
                  </article>
                ))}
              </div>
            );
          })()}
        </section>
      ) : null}

      <div className="dashboard-grid">
        <section className="card">
          <h2>Your patients</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.full_name}</strong>
                    </td>
                    <td>{row.email}</td>
                    <td>
                      {row.status === "active" ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        row.status
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form onSubmit={addPatient} style={{ marginTop: 24 }}>
            <h3>Add patient</h3>
            <div className="field">
              <input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Save patient
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Pending observations</h2>
          <p className="subtitle">
            System-derived movement metrics wait here until you confirm them.
            They are not clinical diagnoses.
          </p>
          {queue.length === 0 ? (
            <p className="subtitle">No observations waiting for review.</p>
          ) : null}
          {queue.slice(0, 4).map((row) => (
            <div className="queue-item review-card-pending" key={row.id}>
              <p>
                <strong>{row.patient_name}</strong> · {row.exercise_name}
              </p>
              <p className="subtitle">
                {row.metric}: {row.value} · Confidence{" "}
                {Math.round(row.confidence * 100)}%
              </p>
            </div>
          ))}
          <Link
            className="btn btn-outline btn-block"
            href="/therapist/reviews"
            style={{ marginTop: 12 }}
          >
            Review all pending ({queue.length})
          </Link>
          <div
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: "1px solid var(--border)",
            }}
          >
            <h3>Confirmed progress</h3>
            <p className="subtitle">
              See adherence and therapist-confirmed observation trends.
            </p>
            <Link
              className="btn btn-outline btn-block"
              href="/therapist/progress"
              style={{ marginTop: 12 }}
            >
              Open progress overview
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
