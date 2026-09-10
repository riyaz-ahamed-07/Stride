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

  return (
    <div className="care-page">
      <header className="care-header">
        <p className="care-kicker">{greeting()}</p>

        <h1>{name || "Welcome"}</h1>
      </header>

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

      {!loading && plan ? (
        <>
          <p className="care-program">
            <strong>{plan.title}</strong>

            {plan.duration_weeks
              ? ` · Week ${week} of ${plan.duration_weeks}`
              : null}

            {therapist ? ` · Prescribed by ${therapist.full_name}` : null}
          </p>

          <section className="care-section">
            <h2>Today</h2>

            {today.length === 0 ? (
              <p className="care-empty">
                No home exercises are scheduled for today. Open your plan if you
                need to review other days, or rest as advised by your
                physiotherapist.
              </p>
            ) : remaining === 0 ? (
              <p className="care-empty">
                You have completed today&apos;s home exercises.
              </p>
            ) : (
              <p className="care-lede">
                {remaining === 1
                  ? "One home exercise remaining."
                  : `${remaining} home exercises remaining.`}
              </p>
            )}

            <ul className="care-list">
              {today.map((item) => {
                const done = isExerciseCompleted(item.id, sessions);

                return (
                  <li key={item.id}>
                    <div>
                      <h3>{item.exercise_name}</h3>

                      <p>{dosageLabel(item)}</p>
                    </div>

                    <span className={done ? "care-flag done" : "care-flag"}>
                      {done ? "Completed" : "To do"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {nextUp ? (
              <Link
                className="btn btn-primary care-primary"
                href={`/patient/move/${nextUp.id}`}
              >
                Begin today&apos;s rehabilitation
              </Link>
            ) : today.length === 0 ? (
              <Link
                className="btn btn-primary care-primary"
                href="/patient/exercises"
              >
                Open your plan
              </Link>
            ) : (
              <Link
                className="btn btn-outline care-primary"
                href="/patient/progress"
              >
                View progress
              </Link>
            )}
          </section>
        </>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="care-section">
            <h2>Next appointment</h2>

            {nextAppt ? (
              <>
                <p className="care-empty">
                  {new Date(nextAppt.scheduled_at).toLocaleString(undefined, {
                    weekday: "long",

                    day: "numeric",

                    month: "long",

                    hour: "2-digit",

                    minute: "2-digit",
                  })}

                  {nextAppt.reason ? ` · ${nextAppt.reason}` : null}
                </p>

                <Link
                  className="care-text-link"
                  href={`/patient/consult/${nextAppt.id}`}
                >
                  Join consultation
                </Link>
              </>
            ) : (
              <p className="care-empty">
                No appointment is currently scheduled.
              </p>
            )}
          </section>

          <section className="care-section">
            <h2>Your physiotherapist</h2>

            {therapist ? (
              <p className="care-empty">
                {therapist.full_name}

                {therapist.clinic_name ? ` · ${therapist.clinic_name}` : null}

                {therapist.phone ? (
                  <>
                    <br />

                    <a
                      className="care-text-link"
                      href={`tel:${therapist.phone.replace(/\s/g, "")}`}
                    >
                      {therapist.phone}
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="care-empty">
                Physiotherapist details are not available yet. Ask the clinic if
                you need to confirm who is supervising your plan.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
