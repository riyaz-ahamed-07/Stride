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
    <div className="dashboard-page bento-page">
      {error ? (
        <p className="page-status" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      {loading ? <p className="page-status">Loading…</p> : null}

      <div className="bento-grid bento-appointments">
        <section className="bento-tile tile-schedule">
          <div className="bento-tile-head">
            <h2>Schedule a visit</h2>
            <span className="patient-chip">{patients.length} patients</span>
          </div>
          {patients.length === 0 && !loading ? (
            <p className="subtitle">Add an active patient before scheduling.</p>
          ) : (
            <form onSubmit={createVisit} className="appt-schedule-form">
              <div className="field">
                <label>Patient</label>
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
              </div>
              <div className="field">
                <label>Date and time</label>
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="field field-reason">
                <label>Reason</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  disabled={submitting}
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting || !patientId}
              >
                {submitting ? "Scheduling…" : "Schedule"}
              </button>
            </form>
          )}
        </section>

        <section className="bento-tile tile-agenda">
          <div className="bento-tile-head">
            <h2>Agenda</h2>
            <span className="patient-chip">
              {today.length} today · {later.length} later
            </span>
          </div>
          <div className="bento-scroll appt-agenda">
            <div className="appt-agenda-block">
              <h3 className="appt-agenda-label">Today</h3>
              {today.length === 0 ? (
                <p className="subtitle">No visits today.</p>
              ) : (
                today.map((item) => (
                  <VisitRow
                    key={item.id}
                    item={item}
                    busy={updatingId === item.id}
                    emphasis
                    onComplete={() => setStatus(item.id, "completed")}
                    onCancel={() => setStatus(item.id, "cancelled")}
                  />
                ))
              )}
            </div>
            <div className="appt-agenda-block">
              <h3 className="appt-agenda-label">Later</h3>
              {later.length === 0 ? (
                <p className="subtitle">No later visits.</p>
              ) : (
                later.map((item) => (
                  <VisitRow
                    key={item.id}
                    item={item}
                    busy={updatingId === item.id}
                    onComplete={() => setStatus(item.id, "completed")}
                    onCancel={() => setStatus(item.id, "cancelled")}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        <section className="bento-tile tile-past">
          <div className="bento-tile-head">
            <h2>Past</h2>
            <span className="patient-chip">{past.length}</span>
          </div>
          <div className="bento-scroll">
            {past.length === 0 ? (
              <p className="subtitle">No past visits yet.</p>
            ) : (
              past.map((item) => (
                <div className="appt-row-compact" key={item.id}>
                  <div>
                    <h3>{item.patient_name ?? "Patient"}</h3>
                    <p className="appt-detail">
                      {formatVisitWhen(item.scheduled_at)}
                    </p>
                    <p className="appt-detail">{item.reason ?? "Follow-up"}</p>
                  </div>
                  <span className="badge badge-success">{item.status}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function VisitRow({
  item,
  busy,
  emphasis,
  onComplete,
  onCancel,
}: {
  item: Appointment;
  busy: boolean;
  emphasis?: boolean;
  onComplete: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className={
        emphasis ? "appt-row-card appt-row-card-today" : "appt-row-card"
      }
    >
      <div className="appt-row-main">
        <div className="appt-avatar" aria-hidden="true">
          {(item.patient_name ?? "P")
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <h3>{item.patient_name ?? "Patient"}</h3>
          <p className="appt-detail">{formatVisitWhen(item.scheduled_at)}</p>
          <p className="appt-detail">{item.reason ?? "Follow-up"}</p>
        </div>
      </div>
      <div className="compact-actions">
        <Link
          className="btn btn-primary btn-sm"
          href={`/therapist/consult/${item.id}`}
        >
          Join
        </Link>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          disabled={busy}
          onClick={onComplete}
        >
          Done
        </button>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
