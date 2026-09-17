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

const HELP_ITEMS = [
  {
    title: "If something hurts",
    body: "Stop the exercise. Sit down. If pain is sudden or severe, call your physiotherapist using the urgent help card.",
  },
  {
    title: "Video consultations",
    body: "Use Chrome or Edge on a computer or tablet. Allow camera and microphone when prompted. If video fails, call your physiotherapist.",
  },
  {
    title: "If text looks small",
    body: "On a computer, press Ctrl and + to enlarge. On phone, use the Stride mobile app.",
  },
  {
    title: "Family helpers",
    body: "You may tap buttons for the patient. Do not change the prescribed plan without the therapist.",
  },
] as const;

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
    <div className="dashboard-page bento-page patient-bento">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Support</p>
          <h1>Help</h1>
          <p className="subtitle">
            Simple answers for patients and family helpers.
          </p>
        </div>
      </header>

      <div className="bento-grid bento-patient-help">
        {HELP_ITEMS.map((item) => (
          <article className="bento-tile" key={item.title}>
            <h2>{item.title}</h2>
            <p className="subtitle">{item.body}</p>
          </article>
        ))}

        <article className="bento-tile tile-urgent">
          <p className="review-kicker">Priority</p>
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
