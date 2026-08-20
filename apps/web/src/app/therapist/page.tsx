"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Patient = { id: string; full_name: string; email: string; status: string; notes: string | null };
type Observation = {
  id: string;
  metric: string;
  value: number;
  confidence: number;
  review_status: string;
  patient_name: string | null;
  exercise_name: string | null;
};
type Exercise = { id: string; name: string };

export default function TherapistDesk() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<Observation[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState("New patient");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [planPatient, setPlanPatient] = useState("");
  const [planTitle, setPlanTitle] = useState("Week 1 home plan");
  const [exerciseId, setExerciseId] = useState("");

  async function refresh() {
    const [patientRows, observationRows, exerciseRows] = await Promise.all([
      api<Patient[]>("/patients"),
      api<Observation[]>("/observations"),
      api<Exercise[]>("/exercises"),
    ]);
    setPatients(patientRows);
    setQueue(observationRows.filter((row) => row.review_status === "pending"));
    setExercises(exerciseRows);
    if (!planPatient && patientRows[0]) setPlanPatient(patientRows[0].id);
    if (!exerciseId && exerciseRows[0]) setExerciseId(exerciseRows[0].id);
  }

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, []);

  async function addPatient(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/patients", {
        method: "POST",
        body: JSON.stringify({ full_name: name, email, password: "StrideClinic1!" }),
      });
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add patient.");
    }
  }

  async function addPlan(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/plans", {
        method: "POST",
        body: JSON.stringify({
          patient_id: planPatient,
          title: planTitle,
          start_date: new Date().toISOString().slice(0, 10),
          items: [{ exercise_id: exerciseId, target_sets: 2, target_repetitions: 8 }],
        }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create plan.");
    }
  }

  async function review(id: string, review_status: "approved" | "rejected") {
    await api(`/observations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        review_status,
        therapist_comment: review_status === "approved" ? "Added to record." : "Repeat with clinic guidance.",
      }),
    });
    await refresh();
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Physiotherapist dashboard</p>
          <h1>Clinic board</h1>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

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
          <div className="stat-value">{exercises.length}</div>
          <div className="stat-label">Exercises</div>
        </div>
      </div>

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
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit">
              Save patient
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Review queue</h2>
          {queue.length === 0 ? <p className="subtitle">Nothing waiting — great work.</p> : null}
          {queue.map((row) => (
            <div className="queue-item" key={row.id}>
              <p>
                <strong>{row.patient_name}</strong> · {row.exercise_name}
              </p>
              <p className="subtitle">
                {row.metric}: {row.value} · Confidence {Math.round(row.confidence * 100)}%
              </p>
              <div className="queue-actions">
                <button className="btn btn-primary btn-sm" type="button" onClick={() => review(row.id, "approved")}>
                  Approve
                </button>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => review(row.id, "rejected")}>
                  Send back
                </button>
              </div>
            </div>
          ))}

          <form onSubmit={addPlan} style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h3>Assign plan</h3>
            <div className="field">
              <select value={planPatient} onChange={(e) => setPlanPatient(e.target.value)}>
                {patients.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
            </div>
            <div className="field">
              <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
                {exercises.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-teal btn-block" type="submit">
              Assign plan
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
