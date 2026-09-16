"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import { formatVisitWhen, partitionAppointments } from "@/lib/care";
import { userFacingError } from "@/lib/userFacingError";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
  therapist_name?: string | null;
};

export default function AppointmentsPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api<Appointment[]>("/appointments")
      .then(setRows)
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load appointments.")),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { upcoming, past } = partitionAppointments(rows);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Schedule</p>
          <h1>Appointments</h1>
        </div>
      </header>

      <div className="card">
        <p className="subtitle">
          Join video consultations from your browser. Booking is managed by your
          physiotherapist in the clinic portal.
        </p>
      </div>

      {loading ? <LoadingBlock label="Loading appointments…" /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          body="When your physiotherapist schedules an appointment, it will appear here so you can join the consultation."
          action={
            <Link className="btn btn-outline" href="/patient">
              Back to today
            </Link>
          }
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <section className="card" style={{ marginBottom: 20 }}>
            <h2>Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="subtitle">No upcoming appointments.</p>
            ) : (
              <div className="appointment-list">
                {upcoming.map((item) => (
                  <article className="card appt-row" key={item.id}>
                    <div className="appt-row-main">
                      <div className="appt-avatar" aria-hidden="true">
                        PT
                      </div>
                      <div>
                        <h3>
                          {item.therapist_name
                            ? `Consultation with ${item.therapist_name}`
                            : "Physiotherapy consultation"}
                        </h3>
                        <p className="appt-detail">
                          {formatVisitWhen(item.scheduled_at)}
                        </p>
                        {item.reason ? (
                          <p className="appt-detail">{item.reason}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="appt-row-actions">
                      <span className="badge badge-pending">Scheduled</span>
                      <Link
                        className="btn btn-primary"
                        href={`/patient/consult/${item.id}`}
                      >
                        Join consultation
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2>Past</h2>
            {past.length === 0 ? (
              <p className="subtitle">No past appointments yet.</p>
            ) : (
              <div className="appointment-list">
                {past.map((item) => (
                  <article className="card appt-row" key={item.id}>
                    <div className="appt-row-main">
                      <div className="appt-avatar" aria-hidden="true">
                        PT
                      </div>
                      <div>
                        <h3>
                          {item.therapist_name
                            ? `Consultation with ${item.therapist_name}`
                            : "Physiotherapy consultation"}
                        </h3>
                        <p className="appt-detail">
                          {formatVisitWhen(item.scheduled_at)}
                        </p>
                        {item.reason ? (
                          <p className="appt-detail">{item.reason}</p>
                        ) : null}
                      </div>
                    </div>
                    <span className="badge badge-success">{item.status}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
