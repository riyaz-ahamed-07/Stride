"use client";

import { FormEvent, useState } from "react";
import { api, saveSession, type Role, type Session } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";

type BodyRegion =
  | "knee"
  | "hip"
  | "shoulder"
  | "ankle"
  | "back"
  | "neck"
  | "wrist_hand"
  | "pelvic_floor"
  | "general";

const STEPS = ["Profile", "Recovery", "Therapist", "Consent"] as const;

const BODY_REGIONS: { id: BodyRegion; label: string }[] = [
  { id: "knee", label: "Knee" },
  { id: "hip", label: "Hip" },
  { id: "shoulder", label: "Shoulder" },
  { id: "ankle", label: "Ankle / foot" },
  { id: "back", label: "Back" },
  { id: "neck", label: "Neck" },
  { id: "wrist_hand", label: "Wrist / hand" },
  { id: "pelvic_floor", label: "Pelvic floor" },
  { id: "general", label: "General mobility" },
];

const GOAL_HINTS = [
  "Walk more comfortably day to day",
  "Return to work or daily tasks",
  "Rebuild strength after assessment",
  "Move with less stiffness",
];

function formatApiError(err: unknown): string {
  return userFacingError(err, "Could not finish onboarding.");
}

export default function PatientOnboardingPage() {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | "">("");
  const [notes, setNotes] = useState("");
  const [rehabGoal, setRehabGoal] = useState("");
  const [invite, setInvite] = useState("");
  const [cameraConsent, setCameraConsent] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function validateStep(current: number): string {
    if (current === 0) {
      if (!fullName.trim()) return "Enter your full name.";
    }
    if (current === 1) {
      if (!bodyRegion) return "Choose the body area you are recovering.";
      if (!rehabGoal.trim()) return "Share a short recovery goal.";
    }
    if (current === 2) {
      if (invite.trim().length < 4)
        return "Enter the invite code from your physiotherapist.";
    }
    if (current === 3) {
      if (!cameraConsent) {
        return "Camera consent is required so guided movement sessions can run safely.";
      }
    }
    return "";
  }

  function goNext() {
    const issue = validateStep(step);
    if (issue) {
      setFieldError(issue);
      return;
    }
    setFieldError("");
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setFieldError("");
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    const issue = validateStep(step);
    if (issue) {
      setFieldError(issue);
      return;
    }
    setBusy(true);
    setError("");
    setFieldError("");
    try {
      const session = await api<
        Session & { status: string; email_verified?: boolean }
      >("/auth/onboarding/patient", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          date_of_birth: dateOfBirth || null,
          phone: phone.trim() || null,
          body_region: bodyRegion,
          rehab_goal: rehabGoal.trim(),
          notes: notes.trim() || null,
          therapist_invite_code: invite.trim().toUpperCase(),
          camera_analysis_consent: cameraConsent,
        }),
      });
      saveSession({ ...session, role: session.role as Role });
      window.location.href = "/patient";
    } catch (err) {
      setError(formatApiError(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth-page onboarding-page">
      <div
        className="auth-form-wrap"
        style={{ margin: "0 auto", maxWidth: 520 }}
      >
        <div className="login-card auth-card onboarding-card">
          <p className="onboarding-eyebrow">Patient setup</p>
          <h2>Set up your rehabilitation</h2>
          <p className="subtitle">
            A few short steps so your physiotherapist can personalise your home
            rehabilitation plan.
          </p>

          <ol className="onboarding-steps" aria-label="Onboarding progress">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={
                  index === step
                    ? "is-current"
                    : index < step
                      ? "is-done"
                      : undefined
                }
              >
                <span className="onboarding-step-index">{index + 1}</span>
                <span className="onboarding-step-label">{label}</span>
              </li>
            ))}
          </ol>

          <form onSubmit={onSubmit}>
            {step === 0 ? (
              <div className="onboarding-panel">
                <h3>Basic profile</h3>
                <p className="onboarding-help">
                  We use this to identify you in the clinic record.
                </p>
                <div className="field">
                  <label>
                    Full name <span className="req">Required</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={busy}
                  />
                </div>
                <div className="field">
                  <label>
                    Date of birth <span className="opt">Optional</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="field">
                  <label>
                    Phone <span className="opt">Optional</span>
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    disabled={busy}
                    placeholder="Clinic contact number"
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="onboarding-panel">
                <h3>Rehabilitation context</h3>
                <p className="onboarding-help">
                  Tell us the focus area and goal — your physiotherapist
                  confirms the clinical plan.
                </p>
                <div className="field">
                  <label>
                    Body region <span className="req">Required</span>
                  </label>
                  <div
                    className="region-grid"
                    role="listbox"
                    aria-label="Body region"
                  >
                    {BODY_REGIONS.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        role="option"
                        aria-selected={bodyRegion === region.id}
                        className={`region-chip${bodyRegion === region.id ? " is-selected" : ""}`}
                        onClick={() => setBodyRegion(region.id)}
                        disabled={busy}
                      >
                        {region.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>
                    Reason for therapy <span className="opt">Optional</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                    disabled={busy}
                    placeholder="e.g. Following my clinic assessment"
                  />
                </div>
                <div className="field">
                  <label>
                    Rehabilitation goal <span className="req">Required</span>
                  </label>
                  <input
                    value={rehabGoal}
                    onChange={(e) => setRehabGoal(e.target.value)}
                    maxLength={280}
                    disabled={busy}
                    placeholder="What would better movement help you do?"
                  />
                  <div className="goal-hints">
                    {GOAL_HINTS.map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        className="goal-hint"
                        onClick={() => setRehabGoal(hint)}
                        disabled={busy}
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="onboarding-panel">
                <h3>Connect with your physiotherapist</h3>
                <p className="onboarding-help">
                  Enter the invite code they gave you. Without a valid code you
                  cannot finish setup.
                </p>
                <div className="field">
                  <label>
                    Therapist invite code <span className="req">Required</span>
                  </label>
                  <input
                    value={invite}
                    onChange={(e) => setInvite(e.target.value.toUpperCase())}
                    autoCapitalize="characters"
                    disabled={busy}
                    placeholder="8-character code"
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="onboarding-panel">
                <h3>Movement session consent</h3>
                <p className="onboarding-help">
                  Some home exercises can use your device camera to count
                  repetitions on your device. Video is not uploaded for clinic
                  review unless your therapist asks you to share a session
                  summary.
                </p>
                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={cameraConsent}
                    onChange={(e) => setCameraConsent(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    I agree to camera-assisted movement analysis for my
                    rehabilitation exercises. Video stays on this device unless
                    you share a session summary.{" "}
                    <span className="req">Required</span>
                  </span>
                </label>
              </div>
            ) : null}

            {fieldError ? <p className="error">{fieldError}</p> : null}
            {error ? <p className="error">{error}</p> : null}

            <div className="onboarding-actions">
              {step > 0 ? (
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={goBack}
                  disabled={busy}
                >
                  Back
                </button>
              ) : (
                <span />
              )}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : step === STEPS.length - 1
                    ? "Finish and open my plan"
                    : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
