"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type TherapistContact = {
  full_name: string;
  phone: string | null;
  clinic_name: string | null;
};

function phoneHref(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return `tel:${hasPlus ? `+${digits}` : digits}`;
}

function urgentCopy(therapist: TherapistContact | null) {
  if (therapist?.phone) {
    const clinic = therapist.clinic_name ? ` at ${therapist.clinic_name}` : "";
    return {
      body: `If exercise causes sudden or severe pain, stop immediately and call ${therapist.full_name}${clinic}. For life-threatening emergencies, call your local emergency number.`,
      canCall: true,
    };
  }
  if (therapist) {
    return {
      body: `Contact ${therapist.full_name}${therapist.clinic_name ? ` (${therapist.clinic_name})` : ""} through your clinic if you have sudden or severe pain. For life-threatening emergencies, call your local emergency number.`,
      canCall: false,
    };
  }
  return {
    body: "If exercise causes sudden or severe pain, stop immediately and contact your clinic. For life-threatening emergencies, call your local emergency number.",
    canCall: false,
  };
}

export default function HelpPage() {
  const [therapist, setTherapist] = useState<TherapistContact | null>(null);

  useEffect(() => {
    api<TherapistContact>("/auth/my-therapist")
      .then(setTherapist)
      .catch(() => setTherapist(null));
  }, []);

  const urgent = useMemo(() => urgentCopy(therapist), [therapist]);
  const dial = therapist?.phone ? phoneHref(therapist.phone) : "";

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Support</p>
          <h1>Help</h1>
        </div>
      </header>
      <p className="subtitle">
        Simple answers for patients and family helpers.
      </p>

      <div className="help-grid">
        <article className="card">
          <h2>If something hurts</h2>
          <p className="subtitle">
            Stop the exercise. Sit down. If pain is sudden or severe, call your
            physiotherapist using the button below.
          </p>
        </article>
        <article className="card">
          <h2>Video consultations</h2>
          <p className="subtitle">
            Use Chrome or Edge on a computer or tablet. Allow camera and
            microphone when prompted. If video fails, call your physiotherapist.
          </p>
        </article>
        <article className="card">
          <h2>If text looks small</h2>
          <p className="subtitle">
            On a computer, press Ctrl and + to enlarge. On phone, use the Stride
            mobile app.
          </p>
        </article>
        <article className="card">
          <h2>Family helpers</h2>
          <p className="subtitle">
            You may tap buttons for the patient. Do not change the prescribed
            plan without the therapist.
          </p>
        </article>
        <article className="card">
          <h2>Urgent help</h2>
          <p className="subtitle">{urgent.body}</p>
          {urgent.canCall && dial ? (
            <a className="btn btn-primary" href={dial}>
              Call {therapist!.full_name}
            </a>
          ) : therapist && !therapist.phone ? (
            <p className="subtitle" style={{ marginTop: "0.75rem" }}>
              No phone number on file — contact your clinic directly.
            </p>
          ) : null}
        </article>
      </div>
    </div>
  );
}
