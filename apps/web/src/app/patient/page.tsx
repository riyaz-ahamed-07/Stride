"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, readSession } from "@/lib/api";

type Plan = {
  id: string;
  title: string;
  items: {
    id: string;
    exercise_name: string;
    target_sets: number;
    target_repetitions: number;
  }[];
};

type Appointment = { id: string; scheduled_at: string; reason: string | null; status: string };

export default function PatientHome() {
  const [name, setName] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = readSession();
    if (session) setName(session.full_name);
    Promise.all([api<Plan[]>("/plans"), api<Appointment[]>("/appointments")])
      .then(([planRows, appointmentRows]) => {
        setPlans(planRows);
        setAppointments(appointmentRows);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const plan = plans[0];
  const nextAppt = appointments.find((a) => a.status === "scheduled") ?? appointments[0];
  const progress = plan ? 75 : 0;
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Good morning</p>
          <h1>{name || "Welcome"}</h1>
        </div>
        <div className="dashboard-header-actions">
          {nextAppt ? (
            <Link className="btn btn-primary" href={`/patient/consult/${nextAppt.id}`}>
              Join video visit
            </Link>
          ) : null}
          <div className="avatar">{initials || "P"}</div>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="dashboard-grid-2">
        <section>
          {plan ? (
            <div className="wellness-card wellness-card-lg">
              <div>
                <p className="wellness-meta">Today&apos;s rehabilitation plan</p>
                <p className="wellness-title">{plan.title}</p>
                <div className="vital-row">
                  <span className="vital-pill">🦵 {plan.items.length} exercises</span>
                  <span className="vital-pill">✓ Therapist assigned</span>
                </div>
              </div>
              <div
                className="progress-ring progress-ring-lg"
                style={{
                  background: `conic-gradient(var(--teal) 0deg ${progress * 3.6}deg, #e2e8f0 ${progress * 3.6}deg 360deg)`,
                }}
              >
                <span>{progress}%</span>
              </div>
            </div>
          ) : (
            <div className="card card-gradient">
              <h2>Your plan is coming</h2>
              <p className="subtitle">Your physiotherapist will assign home exercises here.</p>
            </div>
          )}

          <div className="quick-grid quick-grid-web">
            <Link className="quick-item" href="/patient/exercises">
              <span className="quick-icon teal">🏃</span>
              Exercises
            </Link>
            <Link className="quick-item" href="/patient/appointments">
              <span className="quick-icon blue">📅</span>
              Appointments
            </Link>
            <Link className="quick-item" href={`/patient/consult/${nextAppt?.id ?? "demo"}`}>
              <span className="quick-icon amber">📹</span>
              Video visit
            </Link>
            <Link className="quick-item" href="/patient/help">
              <span className="quick-icon rose">💬</span>
              Help
            </Link>
          </div>
        </section>

        <aside className="stack">
          {nextAppt ? (
            <article className="card appt-card-lg">
              <h2>Upcoming appointment</h2>
              <div className="appt-card">
                <div className="appt-avatar">👨‍⚕️</div>
                <div className="appt-info">
                  <p className="appt-name">Physiotherapy video visit</p>
                  <p className="appt-detail">
                    {new Date(nextAppt.scheduled_at).toLocaleString()} · {nextAppt.reason}
                  </p>
                </div>
              </div>
              <Link className="btn btn-teal btn-block" href={`/patient/consult/${nextAppt.id}`}>
                Join consultation
              </Link>
            </article>
          ) : null}

          <article className="card">
            <div className="section-title">
              <span>Today&apos;s exercises</span>
              <Link href="/patient/exercises">See all</Link>
            </div>
            <div className="task-list">
              {plan?.items.slice(0, 3).map((item) => (
                <article className="task-item" key={item.id}>
                  <div className="task-icon">🦵</div>
                  <div className="task-body">
                    <p className="task-title">{item.exercise_name}</p>
                    <p className="task-meta">
                      {item.target_sets} sets × {item.target_repetitions} reps
                    </p>
                    <Link className="btn btn-primary btn-sm" href={`/patient/move/${item.id}`}>
                      Start movement
                    </Link>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </article>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
