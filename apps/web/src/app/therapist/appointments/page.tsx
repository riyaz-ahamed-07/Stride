"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  defaultLocalDateTimeInput,
  formatVisitWhen,
  localInputToIso,
  partitionAppointments,
} from "@/lib/care";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
  patient_name: string | null;
  patient_id: string;
};

type Patient = { id: string; full_name: string; status: string };

export default function TherapistAppointmentsPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [when, setWhen] = useState(defaultLocalDateTimeInput());
  const [reason, setReason] = useState("Follow-up consultation");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [appointmentRows, patientRows] = await Promise.all([
      api<Appointment[]>("/appointments"),
      api<Patient[]>("/patients"),
    ]);
    setRows(appointmentRows);
    const active = patientRows.filter((p) => p.status === "active");
    setPatients(active);
    setPatientId((current) => current || active[0]?.id || "");
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function createVisit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (!patientId) {
      setError("Choose a patient.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          scheduled_at: localInputToIso(when),
          reason: reason.trim() || null,
        }),
      });
      setReason("Follow-up consultation");
      setWhen(defaultLocalDateTimeInput());
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not schedule visit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: "completed" | "cancelled") {
    if (updatingId) return;
    setUpdatingId(id);
    setError("");
    try {
      await api(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update visit.");
    } finally {
      setUpdatingId(null);
    }
  }

  const { upcoming, past } = partitionAppointments(rows);
  const todayKey = new Date().toDateString();
  const today = upcoming.filter(
    (row) => new Date(row.scheduled_at).toDateString() === todayKey,
  );
  const later = upcoming.filter(
    (row) => new Date(row.scheduled_at).toDateString() !== todayKey,
  );

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Clinic schedule</p>
          <h1>Appointments</h1>
        </div>
      </header>

      {loading ? <p className="subtitle">Loading schedule…</p> : null}
      {error ? (
        <div className="care-alert" role="alert">
          <p>{error}</p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              refresh()
                .catch((err: Error) => setError(err.message))
                .finally(() => setLoading(false));
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Schedule a visit</h2>
        <p className="subtitle">
          Book a video consultation with one of your patients.
        </p>
        {patients.length === 0 && !loading ? (
          <p className="subtitle">Add an active patient before scheduling.</p>
        ) : (
          <form className="stack-form" onSubmit={createVisit}>
            <label>
              Patient
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                disabled={submitting || patients.length === 0}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date and time
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label>
              Reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                disabled={submitting}
              />
            </label>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting || !patientId}
            >
              {submitting ? "Scheduling…" : "Schedule visit"}
            </button>
          </form>
        )}
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Today</h2>
        {today.length === 0 ? (
          <p className="subtitle">No visits scheduled for today.</p>
        ) : (
          <div className="appointment-list">
            {today.map((item) => (
              <VisitRow
                key={item.id}
                item={item}
                busy={updatingId === item.id}
                onComplete={() => setStatus(item.id, "completed")}
                onCancel={() => setStatus(item.id, "cancelled")}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Upcoming</h2>
        {later.length === 0 ? (
          <p className="subtitle">No later visits scheduled.</p>
        ) : (
          <div className="appointment-list">
            {later.map((item) => (
              <VisitRow
                key={item.id}
                item={item}
                busy={updatingId === item.id}
                onComplete={() => setStatus(item.id, "completed")}
                onCancel={() => setStatus(item.id, "cancelled")}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Past</h2>
        {past.length === 0 ? (
          <p className="subtitle">No past visits yet.</p>
        ) : (
          <div className="appointment-list">
            {past.map((item) => (
              <article className="card appt-row" key={item.id}>
                <div className="appt-row-main">
                  <div className="appt-avatar">🧑‍🦳</div>
                  <div>
                    <h3>{item.patient_name ?? "Patient"}</h3>
                    <p className="appt-detail">
                      {formatVisitWhen(item.scheduled_at)}
                    </p>
                    <p className="appt-detail">{item.reason ?? "Follow-up"}</p>
                  </div>
                </div>
                <span className="badge badge-success">{item.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VisitRow({
  item,
  busy,
  onComplete,
  onCancel,
}: {
  item: Appointment;
  busy: boolean;
  onComplete: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="card appt-row">
      <div className="appt-row-main">
        <div className="appt-avatar">🧑‍🦳</div>
        <div>
          <h3>{item.patient_name ?? "Patient"}</h3>
          <p className="appt-detail">{formatVisitWhen(item.scheduled_at)}</p>
          <p className="appt-detail">{item.reason ?? "Follow-up"}</p>
        </div>
      </div>
      <div className="appt-row-actions">
        <Link
          className="btn btn-primary"
          href={`/therapist/consult/${item.id}`}
        >
          Join consultation
        </Link>
        <button
          className="btn btn-outline"
          type="button"
          disabled={busy}
          onClick={onComplete}
        >
          Mark completed
        </button>
        <button
          className="btn btn-outline"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </article>
  );
}
