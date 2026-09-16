"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, saveSession } from "@/lib/api";
import type { PoseMetrics } from "@/components/PoseCamera";
import { recipeFor } from "@/lib/pose/recipes";
import {
  cameraStatusLabel,
  type CameraTrackingStatus,
} from "@/lib/pose/cameraStatus";
import type { ObservationDraft } from "@/lib/pose/observations";
import { dosageLabel, exercisePurpose, setupCues } from "@/lib/care";

const PoseCamera = dynamic(
  () => import("@/components/PoseCamera").then((m) => m.PoseCamera),
  { ssr: false },
);

type Plan = {
  goal?: string;
  items: {
    id: string;
    exercise_name: string;
    target_sets?: number;
    target_repetitions: number;
    instructions: string;
    safety_notes: string;
    pose_recipe_key?: string | null;
    demo_cue?: string;
    frequency_note?: string;
    body_region?: string;
  }[];
};

type Consent = {
  purpose: string;
  status: string;
};

function supportsPose(item: Plan["items"][0] | null): boolean {
  if (!item) return false;
  if (item.pose_recipe_key === "sit_to_stand") return true;
  const name = item.exercise_name.toLowerCase();
  return name.includes("sit to stand") || name.includes("sit-to-stand");
}

export default function MovePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed") === "1";
  const embedToken = searchParams.get("token");
  const [item, setItem] = useState<Plan["items"][0] | null>(null);
  const [reps, setReps] = useState("0");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [cameraConsent, setCameraConsent] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [metrics, setMetrics] = useState<PoseMetrics | null>(null);
  const [cameraStatus, setCameraStatus] =
    useState<CameraTrackingStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(embed);
  const [planGoal, setPlanGoal] = useState("");
  const [exitMode, setExitMode] = useState<"leave" | "camera_off">("leave");

  const poseEnabled = supportsPose(item);
  const recipe = recipeFor(item?.pose_recipe_key) ?? recipeFor("sit_to_stand");
  const target = item?.target_repetitions ?? 0;
  const counted = useCamera && metrics ? metrics.reps : Number(reps) || 0;
  const progressPct =
    target > 0 ? Math.min(100, Math.round((counted / target) * 100)) : 0;

  const guidance = useMemo(() => {
    if (useCamera && metrics?.guidance) return metrics.guidance;
    return (
      recipe?.patientCue ??
      item?.instructions ??
      "Follow your plan instructions."
    );
  }, [useCamera, metrics, recipe, item]);

  useEffect(() => {
    if (embedToken) {
      saveSession({
        access_token: embedToken,
        role: "patient",
        full_name: "Patient",
        user_id: "",
        status: "active",
      });
    }
    Promise.all([api<Plan[]>("/plans"), api<Consent[]>("/consent")])
      .then(([plans, consents]) => {
        const found = plans
          .flatMap((plan) => plan.items)
          .find((row) => row.id === id);
        setItem(found ?? null);
        setPlanGoal(
          plans.find((plan) => plan.items.some((row) => row.id === id))?.goal ??
            "",
        );
        if (found && !supportsPose(found)) {
          setReps(String(found.target_repetitions));
        }
        const granted = consents.some(
          (c) => c.purpose === "camera_analysis" && c.status === "granted",
        );
        setCameraConsent(granted);
        if (embed && (granted || embedToken)) {
          setStarted(true);
          setUseCamera(Boolean(found && supportsPose(found)));
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load exercise.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id, embedToken, embed]);

  useEffect(() => {
    if (useCamera && metrics) {
      setReps(String(metrics.reps));
    }
  }, [metrics, useCamera]);

  useEffect(() => {
    if (!useCamera || sessionId || !item) return;
    let cancelled = false;
    api<{ id: string }>("/sessions", {
      method: "POST",
      body: JSON.stringify({ plan_exercise_id: id }),
    })
      .then((session) => {
        if (!cancelled) setSessionId(session.id);
      })
      .catch(() => {
        /* completion path can still create a session */
      });
    return () => {
      cancelled = true;
    };
  }, [useCamera, sessionId, item, id]);

  async function grantConsent() {
    setError("");
    try {
      await api("/consent", {
        method: "POST",
        body: JSON.stringify({ purpose: "camera_analysis", granted: true }),
      });
      setCameraConsent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consent.");
    }
  }

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;
    const session = await api<{ id: string }>("/sessions", {
      method: "POST",
      body: JSON.stringify({ plan_exercise_id: id }),
    });
    setSessionId(session.id);
    return session.id;
  }

  async function onFinish(event: FormEvent) {
    event.preventDefault();
    if (saving || done) return;
    setError("");
    setSaving(true);
    try {
      const sid = await ensureSession();
      const count = Number(reps);
      const confidence =
        useCamera && metrics
          ? Math.min(1, Math.max(0, metrics.confidence))
          : 0.5;
      const noteParts = [notes.trim()].filter(Boolean);
      if (!useCamera || !metrics) {
        noteParts.push("Logged without camera analysis.");
      }

      const observations: ObservationDraft[] =
        useCamera && metrics?.observations?.length
          ? metrics.observations.map((row) =>
              row.metric === "repetitions" ? { ...row, value: count } : row,
            )
          : [{ metric: "repetitions", value: count, confidence }];

      await api(`/sessions/${sid}/complete`, {
        method: "POST",
        body: JSON.stringify({
          reported_repetitions: count,
          patient_notes: noteParts.join(" · ") || null,
          metric: "repetitions",
          value: count,
          confidence,
          observations,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this session.",
      );
    } finally {
      setSaving(false);
    }
  }

  function requestExit() {
    if (useCamera && !done) {
      setExitMode("leave");
      setConfirmExit(true);
      return;
    }
    window.location.href = "/patient/exercises";
  }

  if (done) {
    return (
      <div className="dashboard-page">
        <div className="success-screen inline">
          <div className="success-icon">✓</div>
          <h1>Session complete</h1>
          <p className="subtitle">
            Movement observations are saved as pending review. Your
            physiotherapist confirms them before they count as official
            progress.
          </p>
          <Link className="btn btn-primary" href="/patient">
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="care-page">
        <p className="care-status-copy">Loading exercise…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="care-page">
        <p className="care-alert" role="alert">
          {error || "This exercise is not on your plan."}
        </p>
        <Link className="care-text-link" href="/patient/exercises">
          Back to your plan
        </Link>
      </div>
    );
  }

  if (!started) {
    const purpose = exercisePurpose(
      {
        body_region: item.body_region ?? "general",
        pose_recipe_key: item.pose_recipe_key ?? null,
      },
      planGoal,
      recipeFor(item.pose_recipe_key)?.patientCue,
    );
    const cues = setupCues(item.demo_cue);
    return (
      <div className="care-page">
        <Link className="breadcrumb" href="/patient/exercises">
          ← Plan
        </Link>
        <header className="care-header">
          <p className="care-kicker">Home exercise</p>
          <h1>{item.exercise_name}</h1>
        </header>
        {purpose ? (
          <section className="care-section">
            <h2>Purpose</h2>
            <p className="care-empty">{purpose}</p>
          </section>
        ) : null}
        {cues.length ? (
          <section className="care-section">
            <h2>Setup and demonstration</h2>
            <ol className="care-steps">
              {cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ol>
          </section>
        ) : null}
        <section className="care-section">
          <h2>Movement</h2>
          <p className="care-empty">{item.instructions}</p>
        </section>
        <div className="alert-safety">
          <strong>Stop if you feel pain, dizziness, or unsteadiness</strong>
          {item.safety_notes}
        </div>
        <p className="care-dosage">
          {dosageLabel({
            target_sets: item.target_sets ?? 1,
            target_repetitions: item.target_repetitions,
            frequency_note: item.frequency_note ?? "",
          })}
        </p>
        {error ? <p className="error">{error}</p> : null}
        <button
          className="btn btn-primary care-primary"
          type="button"
          onClick={() => setStarted(true)}
        >
          Start exercise
        </button>
      </div>
    );
  }

  return (
    <div className={`dashboard-page${embed ? " embed-move" : ""}`}>
      {!embed ? (
        <header className="dashboard-header session-header">
          <div>
            <button
              className="breadcrumb linkish"
              type="button"
              onClick={requestExit}
            >
              ← End session
            </button>
            <h1>{item?.exercise_name ?? "Exercise"}</h1>
            <p className="subtitle session-target">
              Target: {target || "—"} reps
              {recipe ? ` · ${recipe.label}` : null}
            </p>
          </div>
          <div className="session-progress-chip" aria-label="Session progress">
            <strong>{counted}</strong>
            <span>/ {target || "—"}</span>
            <div className="session-progress-bar">
              <i style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </header>
      ) : (
        <div className="embed-session-bar">
          <h1>{item?.exercise_name ?? "Exercise"}</h1>
          <span>
            {counted}/{target || "—"}
          </span>
        </div>
      )}

      <div className="session-hud">
        <div className="session-hud-item">
          <span className="session-hud-label">State</span>
          <strong>{useCamera && metrics ? metrics.phase : "manual"}</strong>
        </div>
        <div className="session-hud-item">
          <span className="session-hud-label">Camera</span>
          <strong>
            {cameraStatusLabel(useCamera ? cameraStatus : "stopped")}
          </strong>
        </div>
        <div className="session-hud-item session-hud-wide">
          <span className="session-hud-label">Guidance</span>
          <strong>{guidance}</strong>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <section>
          <span className="badge badge-warning">Guided movement</span>
          <p className="subtitle" style={{ marginTop: 12 }}>
            {item?.instructions}
          </p>
          <div className="alert-safety">
            <strong>Stop immediately if you feel pain</strong>
            Dizziness or unsteadiness means stop and rest. {item?.safety_notes}
          </div>

          {poseEnabled ? (
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Camera pose assist (optional)</h2>
              <p className="subtitle">
                On-device MediaPipe estimates body landmarks. Exercise rules
                count sit-to-stand cycles. Only derived observations are sent —
                not raw video.
              </p>
              {!cameraConsent ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={grantConsent}
                >
                  I consent to camera analysis
                </button>
              ) : (
                <div className="pose-controls">
                  <label className="pose-toggle">
                    <input
                      type="checkbox"
                      checked={useCamera}
                      onChange={(e) => {
                        if (!e.target.checked && metrics && metrics.reps > 0) {
                          setExitMode("camera_off");
                          setConfirmExit(true);
                          return;
                        }
                        setUseCamera(e.target.checked);
                        if (!e.target.checked) setCameraStatus("stopped");
                      }}
                    />
                    Enable live pose tracking
                  </label>
                  {useCamera ? (
                    <PoseCamera
                      enabled={useCamera}
                      onMetrics={setMetrics}
                      targetReps={target}
                      onCameraStatus={setCameraStatus}
                      onError={(message) => setError(message)}
                    />
                  ) : null}
                  {useCamera && metrics ? (
                    <div className="pose-metrics">
                      <div>
                        <b>{metrics.reps}</b>
                        <span>reps counted</span>
                      </div>
                      <div>
                        <b>{Math.round(metrics.confidence * 100)}%</b>
                        <span>tracking confidence</span>
                      </div>
                      <div>
                        <b>{metrics.reliable ? metrics.phase : "reposition"}</b>
                        <span>phase</span>
                      </div>
                      <div>
                        <b>{metrics.kneeAngle || "—"}°</b>
                        <span>knee angle</span>
                      </div>
                      {metrics.incompleteAttempts > 0 ? (
                        <div>
                          <b>{metrics.incompleteAttempts}</b>
                          <span>incomplete</span>
                        </div>
                      ) : null}
                      {metrics.trunkLeanEvents > 0 ? (
                        <div>
                          <b>{metrics.trunkLeanEvents}</b>
                          <span>trunk offset flags</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <p className="subtitle" style={{ marginTop: 16 }}>
              Camera counting is available for Sit to stand. You can still log
              this exercise manually.
            </p>
          )}
        </section>

        <form onSubmit={onFinish} className="card">
          <h2>Finish session</h2>
          <div className="field">
            <label htmlFor="reps">How many repetitions did you complete?</label>
            <input
              id="reps"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              required
            />
            {useCamera ? (
              <small className="field-hint">
                Filled from pose tracking — you can correct it.
              </small>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="notes">Notes for your therapist (optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Last two were slower"
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : "Complete session"}
          </button>
          <button
            className="btn btn-outline btn-block"
            type="button"
            style={{ marginTop: 10 }}
            onClick={requestExit}
          >
            Exit without saving
          </button>
        </form>
      </div>

      {confirmExit ? (
        <div className="session-exit-modal" role="dialog" aria-modal="true">
          <div className="card session-exit-card">
            <h2>
              {exitMode === "camera_off"
                ? "Turn off camera?"
                : "Leave this session?"}
            </h2>
            <p className="subtitle">
              {exitMode === "camera_off"
                ? "Pose counting will pause. You can still finish and save your logged repetitions."
                : "Tracking will stop. Complete the session to save observations for therapist review, or exit without saving."}
            </p>
            <div className="session-exit-actions">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setConfirmExit(false)}
              >
                Keep going
              </button>
              {exitMode === "camera_off" ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setUseCamera(false);
                    setCameraStatus("stopped");
                    setConfirmExit(false);
                  }}
                >
                  Turn off camera
                </button>
              ) : (
                <Link className="btn btn-primary" href="/patient/exercises">
                  Exit now
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
