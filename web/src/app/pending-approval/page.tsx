"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  clearSession,
  homeFor,
  readSession,
  saveSession,
  type Role,
  type Session,
} from "@/lib/api";

type Profile = {
  status: string;
  full_name: string;
  role: Role;
  invite_code?: string | null;
};

export default function PendingApprovalPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    if (session.role !== "physiotherapist") {
      window.location.href = homeFor(session.role);
      return;
    }
    if (session.status === "active") {
      window.location.href = "/therapist";
      return;
    }
    if (session.status && session.status !== "pending_approval") {
      window.location.href =
        session.status === "pending_onboarding"
          ? "/onboarding/therapist"
          : "/login";
      return;
    }
    setChecking(false);
  }, []);

  async function checkStatus() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const profile = await api<Profile>("/auth/me");
      const session = readSession();
      if (session) {
        const next: Session = {
          ...session,
          status: profile.status,
          full_name: profile.full_name || session.full_name,
          role: profile.role,
        };
        saveSession(next);
      }
      if (profile.status === "active") {
        window.location.href = "/therapist";
        return;
      }
      if (profile.status === "inactive") {
        clearSession();
        setMessage(
          "This application was not approved. Contact your clinic administrator.",
        );
        return;
      }
      setMessage("Still waiting for admin approval. Check again soon.");
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Could not check status.";
      if (text.toLowerCase().includes("inactive")) {
        clearSession();
        setMessage(
          "This application was not approved. Contact your clinic administrator.",
        );
      } else {
        setMessage(text);
      }
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="auth-page">
        <div
          className="auth-form-wrap"
          style={{ margin: "0 auto", maxWidth: 480 }}
        >
          <div className="login-card auth-card">
            <p className="subtitle">Checking your application…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div
        className="auth-form-wrap"
        style={{ margin: "0 auto", maxWidth: 480 }}
      >
        <div className="login-card auth-card">
          <h2>Pending approval</h2>
          <p className="subtitle">
            Your physiotherapist account is with the clinic administrator. You
            will receive access once approved, including your patient invite
            code.
          </p>
          {message ? (
            <p
              className={
                message.includes("not approved") ? "error" : "subtitle"
              }
            >
              {message}
            </p>
          ) : null}
          <button
            className="btn btn-primary btn-block"
            type="button"
            onClick={checkStatus}
            disabled={busy}
          >
            {busy ? "Checking…" : "Check status"}
          </button>
          <button
            className="btn btn-outline btn-block"
            type="button"
            style={{ marginTop: 10 }}
            onClick={() => {
              clearSession();
              window.location.href = "/login";
            }}
          >
            Sign out
          </button>
          <Link className="auth-back" href="/">
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
