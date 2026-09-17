"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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

const TOTAL = 6;
const AGES = Array.from({ length: 89 }, (_, i) => i + 12);

const BODY_REGIONS: {
  id: BodyRegion;
  label: string;
  tint: string;
  ink: string;
}[] = [
  { id: "knee", label: "Knee", tint: "#ECFCCB", ink: "#84CC16" },
  { id: "hip", label: "Hip", tint: "#EFF6FF", ink: "#60A5FA" },
  { id: "shoulder", label: "Shoulder", tint: "#EDE9FE", ink: "#8B5CF6" },
  { id: "ankle", label: "Ankle / foot", tint: "#FEF9C3", ink: "#FACC15" },
  { id: "back", label: "Back", tint: "#ECFCCB", ink: "#84CC16" },
  { id: "neck", label: "Neck", tint: "#EFF6FF", ink: "#60A5FA" },
  { id: "wrist_hand", label: "Wrist / hand", tint: "#EDE9FE", ink: "#8B5CF6" },
  {
    id: "pelvic_floor",
    label: "Pelvic floor",
    tint: "#E3E4E3",
    ink: "#647067",
  },
  { id: "general", label: "General mobility", tint: "#FEF9C3", ink: "#FACC15" },
];

const GOAL_HINTS: { label: string; tint: string; ink: string }[] = [
  {
    label: "Walk more comfortably day to day",
    tint: "#ECFCCB",
    ink: "#84CC16",
  },
  {
    label: "Return to work or daily tasks",
    tint: "#EFF6FF",
    ink: "#60A5FA",
  },
  {
    label: "Rebuild strength after assessment",
    tint: "#EDE9FE",
    ink: "#8B5CF6",
  },
  {
    label: "Move with less stiffness",
    tint: "#FEF9C3",
    ink: "#FACC15",
  },
];

const TITLES = [
  "What should we call you?",
  "What's your age?",
  "Select your focus area",
  "Select your goal",
  "Connect with your physiotherapist",
  "Camera-assisted movement",
];

function ageToDob(age: number): string {
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

function formatApiError(err: unknown): string {
  return userFacingError(err, "Could not finish onboarding.");
}

export default function PatientOnboardingPage() {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState(55);
  const [phone, setPhone] = useState("");
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | "">("");
  const [notes, setNotes] = useState("");
  const [rehabGoal, setRehabGoal] = useState("");
  const [invite, setInvite] = useState("");
  const [cameraConsent, setCameraConsent] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== 1 || !ageListRef.current) return;
    const el = ageListRef.current.querySelector<HTMLButtonElement>(
      `[data-age="${age}"]`,
    );
    el?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [step, age]);

  function validateStep(current: number): string {
    if (current === 0 && !fullName.trim()) return "Enter your full name.";
    if (current === 2 && !bodyRegion)
      return "Choose the body area you are recovering.";
    if (current === 3 && !rehabGoal.trim())
      return "Share a short recovery goal.";
    if (current === 4 && invite.trim().length < 4) {
      return "Enter the invite code from your physiotherapist.";
    }
    if (current === 5 && !cameraConsent) {
      return "Camera consent is required for guided movement sessions.";
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
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  }

  function goBack() {
    setFieldError("");
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (step < TOTAL - 1) {
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
          date_of_birth: ageToDob(age),
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

  const customGoal = GOAL_HINTS.some((h) => h.label === rehabGoal)
    ? ""
    : rehabGoal;

  return (
    <div className="ob-flow">
      <div className="ob-top">
        {step > 0 ? (
          <button type="button" className="ob-back" onClick={goBack}>
            ‹
          </button>
        ) : (
          <span className="ob-back-spacer" />
        )}
        <p className="ob-nav-title">Profile Setup</p>
        <span className="ob-step-tag">
          {step + 1}/{TOTAL}
        </span>
      </div>

      <form className="ob-card" onSubmit={onSubmit}>
        <h1 className="ob-title">{TITLES[step]}</h1>
        {step === 2 ? (
          <p className="ob-sub">
            Pick one focus area. Your physiotherapist confirms the clinical
            plan.
          </p>
        ) : null}
        {step === 5 ? (
          <p className="ob-sub">
            Some home exercises can use your camera on this device to count
            reps. Video is not uploaded unless you share a summary.
          </p>
        ) : null}

        {step === 0 ? (
          <div className="ob-stack">
            <label className="ob-label">Full name</label>
            <input
              className="ob-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={busy}
              placeholder="Your name"
            />
            <label className="ob-label">Phone (optional)</label>
            <input
              className="ob-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              disabled={busy}
              placeholder="Clinic contact number"
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="ob-age" ref={ageListRef}>
            <div className="ob-age-highlight" aria-hidden />
            {AGES.map((n) => (
              <button
                key={n}
                type="button"
                data-age={n}
                className={`ob-age-item${n === age ? " is-active" : ""}`}
                onClick={() => setAge(n)}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="ob-goals">
            {BODY_REGIONS.map((region) => (
              <button
                key={region.id}
                type="button"
                className={`ob-goal${bodyRegion === region.id ? " is-selected" : ""}`}
                onClick={() => setBodyRegion(region.id)}
                disabled={busy}
              >
                <span
                  className="ob-goal-icon"
                  style={{ background: region.tint }}
                >
                  <span style={{ background: region.ink }} />
                </span>
                <span className="ob-goal-label">{region.label}</span>
                <span className="ob-radio" />
              </button>
            ))}
            <label className="ob-label">Reason (optional)</label>
            <textarea
              className="ob-input ob-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={busy}
              placeholder="e.g. Following my clinic assessment"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="ob-goals">
            {GOAL_HINTS.map((hint) => (
              <button
                key={hint.label}
                type="button"
                className={`ob-goal${rehabGoal === hint.label ? " is-selected" : ""}`}
                onClick={() => setRehabGoal(hint.label)}
                disabled={busy}
              >
                <span
                  className="ob-goal-icon"
                  style={{ background: hint.tint }}
                >
                  <span style={{ background: hint.ink }} />
                </span>
                <span className="ob-goal-label">{hint.label}</span>
                <span className="ob-radio" />
              </button>
            ))}
            <input
              className="ob-input"
              value={customGoal}
              onChange={(e) => setRehabGoal(e.target.value)}
              maxLength={280}
              disabled={busy}
              placeholder="Or write your own goal…"
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="ob-stack">
            <p className="ob-sub">
              Enter the invite code your physiotherapist gave you.
            </p>
            <input
              className="ob-input ob-code"
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              disabled={busy}
              placeholder="8-character code"
              spellCheck={false}
            />
          </div>
        ) : null}

        {step === 5 ? (
          <label className={`ob-consent${cameraConsent ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={cameraConsent}
              onChange={(e) => setCameraConsent(e.target.checked)}
              disabled={busy}
            />
            <span>
              I agree to camera-assisted movement analysis for my rehabilitation
              exercises.
            </span>
          </label>
        ) : null}

        {fieldError ? <p className="ob-error">{fieldError}</p> : null}
        {error ? <p className="ob-error">{error}</p> : null}

        <button className="ob-continue" type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : step === TOTAL - 1
              ? "Finish setup →"
              : "Continue →"}
        </button>
      </form>
    </div>
  );
}
