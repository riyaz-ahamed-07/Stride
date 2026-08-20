"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
};

export default function AppointmentsPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Appointment[]>("/appointments")
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Schedule</p>
          <h1>Appointments</h1>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <p className="subtitle">
          Join video consultations from your browser. Booking is managed by your physiotherapist in the clinic portal.
        </p>
      </div>

      <div className="appointment-list">
        {rows.length === 0 ? (
          <div className="card">
            <p className="subtitle">No appointments scheduled yet.</p>
          </div>
        ) : (
          rows.map((item) => (
            <article className="card appt-row" key={item.id}>
              <div className="appt-row-main">
                <div className="appt-avatar">👨‍⚕️</div>
                <div>
                  <h3>Physiotherapy visit</h3>
                  <p className="appt-detail">{new Date(item.scheduled_at).toLocaleString()}</p>
                  <p className="appt-detail">{item.reason ?? "General follow-up"}</p>
                </div>
              </div>
              <div className="appt-row-actions">
                {item.status === "scheduled" ? (
                  <>
                    <span className="badge badge-pending">Scheduled</span>
                    <Link className="btn btn-primary" href={`/patient/consult/${item.id}`}>
                      Join video call
                    </Link>
                  </>
                ) : (
                  <span className="badge badge-success">{item.status}</span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
