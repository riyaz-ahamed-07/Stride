"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/AsyncState";
import { api } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";
import { ProgressOverview } from "./ProgressOverview";

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

type ReviewsTab = "queue" | "progress";

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

function tabFromSearch(raw: string | null): ReviewsTab {
  return raw === "progress" ? "progress" : "queue";
}

function TherapistReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromSearch(searchParams.get("tab"));

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

  const refresh = useCallback(async () => {
    setError("");
    const observationRows = await api<ObservationRow[]>("/observations");
    setRows(observationRows);
  }, []);

  useEffect(() => {
    if (tab !== "queue") return;
    setLoading(true);
    refresh()
      .catch((err: unknown) =>
        setError(userFacingError(err, "Could not load observations.")),
      )
      .finally(() => setLoading(false));
  }, [refresh, tab]);

  const pending = useMemo(
    () => rows.filter((row) => row.review_status === "pending"),
    [rows],
  );
  const recent = useMemo(
    () => rows.filter((row) => row.review_status !== "pending").slice(0, 12),
    [rows],
  );

  function setTab(next: ReviewsTab) {
    const href =
      next === "progress"
        ? "/therapist/reviews?tab=progress"
        : "/therapist/reviews";
    router.replace(href);
  }

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
    <div className="dashboard-page bento-page">
      <div
        className="page-toolbar"
        role="tablist"
        aria-label="Reviews sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "queue"}
          className={`reviews-tab${tab === "queue" ? " is-active" : ""}`}
          onClick={() => setTab("queue")}
        >
          Queue
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "progress"}
          className={`reviews-tab${tab === "progress" ? " is-active" : ""}`}
          onClick={() => setTab("progress")}
        >
          Progress
        </button>
      </div>

      <div className="bento-reviews">
        {tab === "progress" ? (
          <div className="bento-tile" style={{ flex: 1 }}>
            <h2>Recovery overview</h2>
            <div className="bento-scroll">
              <ProgressOverview />
            </div>
          </div>
        ) : null}

        {tab === "queue" ? (
          <div
            className="bento-grid"
            style={{
              gridTemplateColumns: "minmax(0, 1.7fr) minmax(240px, 0.9fr)",
              flex: 1,
            }}
          >
            <section className="bento-tile">
              <div className="bento-tile-head">
                <h2>Pending ({pending.length})</h2>
              </div>
              {error ? (
                <ErrorState
                  message={error}
                  onRetry={() => {
                    setLoading(true);
                    refresh()
                      .catch((err: unknown) =>
                        setError(
                          userFacingError(err, "Could not load observations."),
                        ),
                      )
                      .finally(() => setLoading(false));
                  }}
                />
              ) : null}
              {actionError ? <ErrorState message={actionError} /> : null}
              {loading ? <LoadingBlock label="Loading observations…" /> : null}
              <div className="bento-scroll">
                {!loading && !error && pending.length === 0 ? (
                  <EmptyState
                    title="No pending observations"
                    body="Derived metrics appear here after home sessions."
                    action={
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setTab("progress")}
                      >
                        View progress
                      </button>
                    }
                  />
                ) : null}
                <div className="review-bento">
                  {pending.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <article
                        className="card review-card review-card-pending"
                        key={row.id}
                      >
                        <div className="review-card-head">
                          <div>
                            <p className="review-kicker">Pending</p>
                            <h2>
                              {row.patient_name ?? "Patient"} ·{" "}
                              {row.exercise_name ?? "Exercise"}
                            </h2>
                            <p className="subtitle">
                              {formatWhen(row.started_at ?? row.created_at)}
                            </p>
                          </div>
                          <span className="badge badge-pending">Pending</span>
                        </div>

                        <div className="review-grid">
                          <div>
                            <p className="review-label">Target</p>
                            <p className="review-value">
                              {row.target_sets ?? "—"}×
                              {row.target_repetitions ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="review-label">Reported</p>
                            <p className="review-value">
                              {row.reported_repetitions ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="review-label">
                              {metricLabel(row.metric)}
                            </p>
                            <p className="review-value">{row.value}</p>
                          </div>
                          <div>
                            <p className="review-label">Confidence</p>
                            <p className="review-value">
                              {Math.round(row.confidence * 100)}%
                            </p>
                          </div>
                        </div>

                        {row.patient_notes ? (
                          <div className="review-notes">
                            <p className="review-label">Patient notes</p>
                            <p style={{ margin: 0 }}>{row.patient_notes}</p>
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
                              <label>Corrected {row.metric}</label>
                              <input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                inputMode="decimal"
                                disabled={busy}
                                required
                              />
                            </div>
                            <div className="field">
                              <label>Note</label>
                              <textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                rows={2}
                                disabled={busy}
                              />
                            </div>
                            <div className="queue-actions">
                              <button
                                className="btn btn-primary btn-sm"
                                type="submit"
                                disabled={busy}
                              >
                                Save
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
                              <label>Rejection note</label>
                              <textarea
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                rows={2}
                                disabled={busy}
                                required
                              />
                            </div>
                            <div className="queue-actions">
                              <button
                                className="btn btn-primary btn-sm"
                                type="submit"
                                disabled={busy}
                              >
                                Reject
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
              </div>
            </section>

            <section className="bento-tile">
              <h2>Recently reviewed</h2>
              <div className="bento-scroll">
                {recent.length === 0 ? (
                  <p className="subtitle">No reviewed observations yet.</p>
                ) : (
                  recent.map((row) => (
                    <div className="appt-row-compact" key={row.id}>
                      <div>
                        <h3>
                          {row.patient_name} · {row.exercise_name}
                        </h3>
                        <p className="appt-detail">
                          {row.metric}: {row.value}
                          {row.original_value != null
                            ? ` (was ${row.original_value})`
                            : ""}
                        </p>
                        <p className="appt-detail">
                          {formatWhen(
                            row.ended_at ?? row.started_at ?? row.created_at,
                          )}
                        </p>
                      </div>
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
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TherapistReviewsRoute() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-page bento-page">
          <LoadingBlock label="Loading reviews…" />
        </div>
      }
    >
      <TherapistReviewsPage />
    </Suspense>
  );
}
