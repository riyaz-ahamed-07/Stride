"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
  patient_name: string | null;
};

export default function TherapistAppointmentsPage() {
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
          <p className="greet-text">Clinic schedule</p>
          <h1>Appointments</h1>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="appointment-list">
        {rows.map((item) => (
          <article className="card appt-row" key={item.id}>
            <div className="appt-row-main">
              <div className="appt-avatar">🧑‍🦳</div>
              <div>
                <h3>{item.patient_name ?? "Patient"}</h3>
                <p className="appt-detail">{new Date(item.scheduled_at).toLocaleString()}</p>
                <p className="appt-detail">{item.reason ?? "Follow-up"}</p>
              </div>
            </div>
            <div className="appt-row-actions">
              {item.status === "scheduled" ? (
                <Link className="btn btn-primary" href={`/therapist/consult/${item.id}`}>
                  Start video call
                </Link>
              ) : (
                <span className="badge badge-success">{item.status}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
