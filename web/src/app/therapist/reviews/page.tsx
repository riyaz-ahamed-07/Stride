"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";

export type ObservationRow = {
  id: string;
  session_id: string;
  metric: string;
  value: number;
  confidence: number;
  review_status: "pending" | "approved" | "corrected" | "rejected";
  therapist_comment: string | null;
  original_value: number | null;
  patient_name: string | null;
  exercise_name: string | null;
  plan_title: string | null;
  started_at: string | null;
  ended_at: string | null;
  reported_repetitions: number | null;
  patient_notes: string | null;
  target_sets: number | null;
  target_repetitions: number | null;
  created_at: string | null;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Time not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time not recorded";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function metricLabel(metric: string): string {
  if (metric === "repetitions") return "Repetitions (system-derived)";
  return metric.replace(/_/g, " ");
}

export default function TherapistReviewsPage() {
  const [rows, setRows] = useState<ObservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [showRecent, setShowRecent] = useState(true);

  const refresh = useCallback(async () => {
    setError("");
    const observationRows = await api<ObservationRow[]>("/observations");
    setRows(observationRows);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load observations.")),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const pending = useMemo(
    () => rows.filter((row) => row.review_status === "pending"),
    [rows],
  );
  const recent = useMemo(
    () => rows.filter((row) => row.review_status !== "pending").slice(0, 12),
    [rows],
  );

  async function runReview(
    id: string,
    body: {
      review_status: string;
      therapist_comment?: string | null;
      value?: number;
    },
  ) {
    setBusyId(id);
    setActionError("");
    try {
      await api(`/observations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditingId(null);
      setRejectId(null);
      await refresh();
    } catch (err) {
      setActionError(
        userFacingError(err, "Could not update this observation."),
      );
      try {
        await refresh();
      } catch {
        /* keep prior error */
      }
    } finally {
      setBusyId(null);
    }
  }

  function startCorrect(row: ObservationRow) {
    setRejectId(null);
    setEditingId(row.id);
    setEditValue(String(row.value));
    setEditNote(row.therapist_comment ?? "");
    setActionError("");
  }

  function startReject(row: ObservationRow) {
    setEditingId(null);
    setRejectId(row.id);
    setRejectNote("");
    setActionError("");
  }

  async function submitCorrect(event: FormEvent, row: ObservationRow) {
    event.preventDefault();
    const next = Number(editValue);
    if (!Number.isFinite(next)) {
      setActionError("Enter a valid corrected value.");
      return;
    }
    await runReview(row.id, {
      review_status: "corrected",
      value: next,
      therapist_comment: editNote.trim() || "Corrected after clinical review.",
    });
  }

  async function submitReject(event: FormEvent, row: ObservationRow) {
    event.preventDefault();
    if (!rejectNote.trim()) {
      setActionError("Add a short note when rejecting.");
      return;
    }
    await runReview(row.id, {
      review_status: "rejected",
      therapist_comment: rejectNote.trim(),
    });
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Movement review</p>
          <h1>Observation queue</h1>
          <p className="subtitle" style={{ marginTop: 8, maxWidth: "54ch" }}>
            System-derived movement metrics need your confirmation before they
            become part of the rehabilitation record. They are not clinical
            diagnoses.
          </p>
        </div>
        <Link className="btn btn-outline" href="/therapist/progress">
          View progress
        </Link>
      </header>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            refresh()
              .catch((err: unknown) =>
                setError(userFacingError(err, "Could not load observations.")),
              )
              .finally(() => setLoading(false));
          }}
        />
      ) : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {loading ? <LoadingBlock label="Loading observations…" /> : null}

      {!loading && !error && pending.length === 0 ? (
        <EmptyState
          title="No pending observations"
          body="When patients finish home sessions, derived metrics appear here for approve, correct, or reject."
          action={
            <Link className="btn btn-outline" href="/therapist/progress">
              View progress
            </Link>
          }
        />
      ) : null}

      <div className="review-stack">
        {pending.map((row) => {
          const busy = busyId === row.id;
          return (
            <article
              className="card review-card review-card-pending"
              key={row.id}
            >
              <div className="review-card-head">
                <div>
                  <p className="review-kicker">Pending review</p>
                  <h2>
                    {row.patient_name ?? "Patient"} ·{" "}
                    {row.exercise_name ?? "Exercise"}
                  </h2>
                  <p className="subtitle">
                    {row.plan_title ?? "Rehabilitation plan"} ·{" "}
                    {formatWhen(row.started_at ?? row.created_at)}
                  </p>
                </div>
                <span className="badge badge-pending">Pending</span>
              </div>

              <div className="review-grid">
                <div>
                  <p className="review-label">Prescribed target</p>
                  <p className="review-value">
                    {row.target_sets ?? "—"} × {row.target_repetitions ?? "—"}{" "}
                    reps
                  </p>
                </div>
                <div>
                  <p className="review-label">Patient-reported reps</p>
                  <p className="review-value">
                    {row.reported_repetitions ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="review-label">{metricLabel(row.metric)}</p>
                  <p className="review-value">{row.value}</p>
                </div>
                <div>
                  <p className="review-label">Tracking confidence</p>
                  <p className="review-value">
                    {Math.round(row.confidence * 100)}%
                  </p>
                </div>
              </div>

              {row.patient_notes ? (
                <div className="review-notes">
                  <p className="review-label">Patient-reported notes</p>
                  <p>{row.patient_notes}</p>
                </div>
              ) : (
                <p className="subtitle">No patient notes for this session.</p>
              )}

              {row.therapist_comment ? (
                <div className="review-notes">
                  <p className="review-label">Existing therapist note</p>
                  <p>{row.therapist_comment}</p>
                </div>
              ) : null}

              <div className="queue-actions">
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runReview(row.id, {
                      review_status: "approved",
                      therapist_comment:
                        row.therapist_comment ??
                        "Confirmed for rehabilitation record.",
                    })
                  }
                >
                  {busy && editingId !== row.id && rejectId !== row.id
                    ? "Saving…"
                    : "Approve"}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={() => startCorrect(row)}
                >
                  Correct
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={() => startReject(row)}
                >
                  Reject
                </button>
              </div>

              {editingId === row.id ? (
                <form
                  className="review-inline-form"
                  onSubmit={(e) => submitCorrect(e, row)}
                >
                  <div className="field">
                    <label>Corrected {row.metric} value</label>
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      inputMode="decimal"
                      disabled={busy}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Therapist note</label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={2}
                      disabled={busy}
                      placeholder="What changed and why"
                    />
                  </div>
                  <div className="queue-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? "Saving…" : "Save correction"}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {rejectId === row.id ? (
                <form
                  className="review-inline-form"
                  onSubmit={(e) => submitReject(e, row)}
                >
                  <div className="field">
                    <label>Rejection note (required)</label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      disabled={busy}
                      required
                      placeholder="Why this should not enter the confirmed record"
                    />
                  </div>
                  <div className="queue-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? "Saving…" : "Confirm reject"}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      disabled={busy}
                      onClick={() => setRejectId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="card" style={{ marginTop: 24 }}>
        <div className="section-title">
          <h2 style={{ margin: 0 }}>Recently reviewed</h2>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowRecent((v) => !v)}
          >
            {showRecent ? "Hide" : "Show"}
          </button>
        </div>
        {showRecent ? (
          recent.length === 0 ? (
            <p className="subtitle">No reviewed observations yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Exercise</th>
                    <th>Metric</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id}>
                      <td>{row.patient_name}</td>
                      <td>{row.exercise_name}</td>
                      <td>
                        {row.metric}: {row.value}
                        {row.original_value != null
                          ? ` (was ${row.original_value})`
                          : ""}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.review_status === "rejected"
                              ? "badge-danger"
                              : row.review_status === "corrected"
                                ? "badge-warning"
                                : "badge-success"
                          }`}
                        >
                          {row.review_status}
                        </span>
                      </td>
                      <td>
                        {formatWhen(
                          row.ended_at ?? row.started_at ?? row.created_at,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
