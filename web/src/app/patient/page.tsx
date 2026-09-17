"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api, readSession } from "@/lib/api";
import {
  type CarePlan,
  type CareSession,
  type TherapistContact,
  dosageLabel,
  filterTodayHome,
  firstIncompleteToday,
  greeting,
  isExerciseCompleted,
  planWeek,
  upcomingScheduled,
} from "@/lib/care";
import { userFacingError } from "@/lib/userFacingError";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
};

export default function PatientHome() {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapist, setTherapist] = useState<TherapistContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const session = readSession();
    if (session) setName(session.full_name);
    setLoading(true);
    setError("");
    Promise.all([
      api<CarePlan[]>("/plans"),
      api<Appointment[]>("/appointments"),
      api<CareSession[]>("/sessions"),
    ])
      .then(async ([planRows, appointmentRows, sessionRows]) => {
        setPlan(planRows[0] ?? null);
        setAppointments(appointmentRows);
        setSessions(sessionRows);
        try {
          setTherapist(await api<TherapistContact>("/auth/my-therapist"));
        } catch {
          setTherapist(null);
        }
      })
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load your rehabilitation.")),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const week = plan ? planWeek(plan.start_date, plan.duration_weeks) : 1;
  const today = plan ? filterTodayHome(plan, week) : [];
  const nextUp = plan ? firstIncompleteToday(plan, sessions) : null;
  const nextAppt = upcomingScheduled(appointments);
  const remaining = today.filter(
    (item) => !isExerciseCompleted(item.id, sessions),
  ).length;
  const doneCount = today.length - remaining;
  const firstName = name.trim().split(/\s+/)[0] || "";
  const progressPct =
    today.length > 0
      ? Math.round((doneCount / today.length) * 100)
      : plan
        ? Math.min(
            100,
            Math.round((week / Math.max(plan.duration_weeks, 1)) * 100),
          )
        : 12;

  return (
    <div className="dashboard-page bento-page patient-bento">
      {!loading ? (
        <div className="welcome-banner">
          <div>
            <h2>
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </h2>
            <p>
              {plan
                ? `${plan.title} · Week ${week} of ${plan.duration_weeks}`
                : "Your physiotherapist will assign a plan after assessment."}
            </p>
            <div className="welcome-banner-bar" aria-hidden>
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="compact-actions">
            {nextUp ? (
              <Link
                className="btn btn-sm btn-secondary"
                href={`/patient/move/${nextUp.id}`}
              >
                Start today
              </Link>
            ) : (
              <Link
                className="btn btn-sm btn-secondary"
                href="/patient/exercises"
              >
                Open plan
              </Link>
            )}
            {nextAppt ? (
              <Link
                className="btn btn-outline btn-sm"
                href={`/patient/consult/${nextAppt.id}`}
                style={{ borderColor: "#fff", color: "#fff" }}
              >
                Join call
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? <LoadingBlock label="Loading your rehabilitation…" /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && !plan ? (
        <EmptyState
          title="No rehabilitation plan yet"
          body="Your physiotherapist has not assigned a rehabilitation plan. Check back after your next appointment, or send them a message through the clinic."
          action={
            <Link className="btn btn-outline" href="/patient/appointments">
              View appointments
            </Link>
          }
        />
      ) : null}

      {!loading && !error ? (
        <div className="bento-grid bento-patient-home">
          <section className="bento-tile tile-today">
            <div className="bento-tile-head">
              <h2>Today</h2>
              {plan && today.length > 0 ? (
                <span className="patient-chip">
                  {doneCount}/{today.length} done
                </span>
              ) : null}
            </div>
            <div className="bento-scroll">
              {!plan ? (
                <p className="subtitle">Plan not assigned yet.</p>
              ) : today.length === 0 ? (
                <div className="patient-empty-panel">
                  <p>
                    No home exercises are scheduled for today. Rest as advised,
                    or review other days in your plan.
                  </p>
                  <Link
                    className="btn btn-primary btn-sm"
                    href="/patient/exercises"
                  >
                    Open your plan
                  </Link>
                </div>
              ) : remaining === 0 ? (
                <div className="patient-empty-panel">
                  <p>You have completed today&apos;s home exercises.</p>
                  <Link
                    className="btn btn-outline btn-sm"
                    href="/patient/progress"
                  >
                    View progress
                  </Link>
                </div>
              ) : (
                <>
                  <p className="patient-lede">
                    {remaining === 1
                      ? "One home exercise remaining."
                      : `${remaining} home exercises remaining.`}
                  </p>
                  <ul className="patient-exercise-list">
                    {today.map((item) => {
                      const done = isExerciseCompleted(item.id, sessions);
                      return (
                        <li key={item.id} className={done ? "is-done" : ""}>
                          <div>
                            <strong>{item.exercise_name}</strong>
                            <span>{dosageLabel(item)}</span>
                          </div>
                          <em>{done ? "Done" : "To do"}</em>
                        </li>
                      );
                    })}
                  </ul>
                  {nextUp ? (
                    <Link
                      className="btn btn-primary"
                      href={`/patient/move/${nextUp.id}`}
                    >
                      Begin today&apos;s rehabilitation
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="bento-tile tile-next-appt">
            <h2>Next appointment</h2>
            <div className="bento-scroll">
              {nextAppt ? (
                <div className="patient-appt-card">
                  <div className="appt-avatar" aria-hidden="true">
                    PT
                  </div>
                  <div>
                    <p className="patient-appt-when">
                      {new Date(nextAppt.scheduled_at).toLocaleString(
                        undefined,
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                    {nextAppt.reason ? (
                      <p className="subtitle">{nextAppt.reason}</p>
                    ) : null}
                    <Link
                      className="btn btn-primary btn-sm"
                      href={`/patient/consult/${nextAppt.id}`}
                    >
                      Join consultation
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="subtitle">
                  No appointment is currently scheduled.
                </p>
              )}
            </div>
          </section>

          <section className="bento-tile tile-therapist">
            <h2>Your physiotherapist</h2>
            <div className="bento-scroll">
              {therapist ? (
                <div className="patient-therapist-card">
                  <div className="patient-therapist-avatar" aria-hidden>
                    {therapist.full_name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <strong>{therapist.full_name}</strong>
                    {therapist.clinic_name ? (
                      <p className="subtitle">{therapist.clinic_name}</p>
                    ) : null}
                    {therapist.phone ? (
                      <a
                        className="care-text-link"
                        href={`tel:${therapist.phone.replace(/\s/g, "")}`}
                      >
                        {therapist.phone}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="subtitle">
                  Physiotherapist details are not available yet. Ask the clinic
                  if you need to confirm who is supervising your plan.
                </p>
              )}
            </div>
          </section>

          {plan ? (
            <section className="bento-tile tile-plan-snap">
              <h2>Plan snapshot</h2>
              <div className="bento-stats">
                <div className="bento-stat">
                  <div className="stat-value">{week}</div>
                  <div className="stat-label">Current week</div>
                </div>
                <div className="bento-stat">
                  <div className="stat-value">{plan.duration_weeks}</div>
                  <div className="stat-label">Total weeks</div>
                </div>
                <div className="bento-stat">
                  <div className="stat-value">{today.length}</div>
                  <div className="stat-label">Today&apos;s moves</div>
                </div>
                <div className="bento-stat">
                  <div className="stat-value">{remaining}</div>
                  <div className="stat-label">Still to do</div>
                </div>
              </div>
              {plan.goal ? (
                <p className="subtitle patient-goal">{plan.goal}</p>
              ) : null}
              <Link
                className="btn btn-outline btn-sm"
                href="/patient/exercises"
              >
                View full plan
              </Link>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
