"use client";

import { FormEvent, useState } from "react";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { api, saveSession, type Role, type Session } from "@/lib/api";
import { routeAfterAuth } from "@/lib/authFlow";

export default function TherapistOnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [clinic, setClinic] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api<
        Session & { status: string; email_verified?: boolean }
      >("/auth/onboarding/therapist", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          license_number: license,
          clinic_name: clinic,
          specialty: specialty || null,
        }),
      });
      saveSession({ ...session, role: session.role as Role });
      window.location.href = routeAfterAuth(session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not finish onboarding.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel title="Physiotherapist registration">
        <p>
          Submit your credentials. An administrator will review and activate
          clinic access.
        </p>
      </AuthBrandPanel>
      <div className="auth-form-wrap">
        <div className="login-card auth-card">
          <h2>Professional details</h2>
          <p className="subtitle">
            These details appear on patient records and consultations.
          </p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>License number</label>
              <input
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Clinic name</label>
              <input
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Specialty (optional)</label>
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
            >
              {busy ? "Submitting…" : "Submit for approval"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
