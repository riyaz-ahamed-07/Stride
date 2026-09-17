"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api, readSession } from "@/lib/api";
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
  const [displayName, setDisplayName] = useState("");
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
    const session = readSession();
    if (session?.full_name) setDisplayName(session.full_name);
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

  const upcoming = partitionAppointments(appointments).upcoming;

  return (
    <div className="dashboard-page bento-page">
      {!loading ? (
        <div className="welcome-banner">
          <div>
            <h2>Hello{displayName ? `, ${displayName.split(" ")[0]}` : ""}</h2>
            <p>
              {queue.length > 0
                ? `You have ${queue.length} observation${queue.length === 1 ? "" : "s"} waiting for review.`
                : `${patients.length} patient${patients.length === 1 ? "" : "s"} in your clinic.`}
            </p>
            <div className="welcome-banner-bar" aria-hidden>
              <span
                style={{
                  width: `${Math.min(
                    100,
                    patients.length
                      ? Math.round(
                          ((patients.length -
                            Math.min(queue.length, patients.length)) /
                            Math.max(patients.length, 1)) *
                            100,
                        )
                      : 12,
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="compact-actions">
            <Link
              className="btn btn-sm btn-secondary"
              href="/therapist/reviews"
            >
              Reviews
            </Link>
            <Link
              className="btn btn-outline btn-sm"
              href="/therapist/plans"
              style={{ borderColor: "#fff", color: "#fff" }}
            >
              Plans
            </Link>
          </div>
        </div>
      ) : null}

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

      {!loading ? (
        <div className="bento-grid bento-patients">
          <section className="bento-tile tile-invite">
            <h2>Invite code</h2>
            <p className="subtitle">Share during patient onboarding.</p>
            <p className="bento-invite-code">{inviteCode ?? "—"}</p>
          </section>

          <section className="bento-tile tile-stats">
            <h2>Clinic snapshot</h2>
            <div className="bento-stats">
              <div className="bento-stat">
                <div className="stat-value">{patients.length}</div>
                <div className="stat-label">Patients</div>
              </div>
              <div className="bento-stat">
                <div className="stat-value">{queue.length}</div>
                <div className="stat-label">Awaiting review</div>
              </div>
              <div className="bento-stat">
                <div className="stat-value">{upcoming.length}</div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="bento-stat">
                <div className="stat-value">{exercises.length}</div>
                <div className="stat-label">Exercises</div>
              </div>
            </div>
          </section>

          <section className="bento-tile tile-patients">
            <div className="bento-tile-head">
              <h2>Your patients</h2>
            </div>
            <div className="bento-scroll">
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
              <form onSubmit={addPatient} style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: "0.9rem", margin: "0 0 8px" }}>
                  Add patient
                </h3>
                <div className="compact-form-row">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <input
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <input
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="bento-tile tile-appts">
            <div className="bento-tile-head">
              <h2>Upcoming</h2>
              <Link
                className="btn btn-outline btn-sm"
                href="/therapist/appointments"
              >
                All
              </Link>
            </div>
            <div className="bento-scroll">
              {upcoming.length === 0 ? (
                <p className="subtitle">No upcoming appointments.</p>
              ) : (
                upcoming.slice(0, 8).map((item) => (
                  <div className="appt-row-compact" key={item.id}>
                    <div>
                      <h3>{item.patient_name ?? "Patient"}</h3>
                      <p className="appt-detail">
                        {formatVisitWhen(item.scheduled_at)}
                      </p>
                    </div>
                    <Link
                      className="btn btn-primary btn-sm"
                      href={`/therapist/consult/${item.id}`}
                    >
                      Join
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bento-tile tile-queue">
            <div className="bento-tile-head">
              <h2>Pending reviews</h2>
              <Link
                className="btn btn-outline btn-sm"
                href="/therapist/reviews"
              >
                Queue
              </Link>
            </div>
            <div className="bento-scroll">
              {queue.length === 0 ? (
                <p className="subtitle">Nothing waiting for review.</p>
              ) : (
                queue.map((row) => (
                  <div className="queue-item review-card-pending" key={row.id}>
                    <p style={{ margin: 0 }}>
                      <strong>{row.patient_name}</strong> · {row.exercise_name}
                    </p>
                    <p className="subtitle" style={{ margin: "4px 0 0" }}>
                      {row.metric}: {row.value} ·{" "}
                      {Math.round(row.confidence * 100)}%
                    </p>
                  </div>
                ))
              )}
              <Link
                className="btn btn-outline btn-sm"
                href="/therapist/reviews?tab=progress"
                style={{ marginTop: 8 }}
              >
                Progress overview
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
