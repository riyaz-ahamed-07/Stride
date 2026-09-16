"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { resendOtp, routeAfterAuth, verifyOtp } from "@/lib/authFlow";

const DEV_OTP_KEY = "stride.dev_otp";

export default function VerifyOtpForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [devHint, setDevHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DEV_OTP_KEY);
      if (stored) {
        setDevHint(stored);
        setCode(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await verifyOtp(email, code);
      try {
        sessionStorage.removeItem(DEV_OTP_KEY);
      } catch {
        /* ignore */
      }
      window.location.href = routeAfterAuth(session, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setBusy(false);
    }
  }

  async function onResend() {
    if (resending || !email.trim()) return;
    setResending(true);
    setError("");
    try {
      const result = await resendOtp(email);
      if (result.dev_code) {
        setDevHint(result.dev_code);
        setCode(result.dev_code);
        try {
          sessionStorage.setItem(DEV_OTP_KEY, result.dev_code);
        } catch {
          /* ignore */
        }
      } else {
        setDevHint("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel title="Verify your email">
        <p>
          Enter the 6-digit code sent to your inbox so we can confirm your
          account.
        </p>
      </AuthBrandPanel>
      <div className="auth-form-wrap">
        <div className="login-card auth-card">
          <h2>Email verification</h2>
          <p className="subtitle">
            Enter the 6-digit code sent to your inbox.
            {devHint ? " Local demo code is shown below." : ""}
          </p>
          {devHint ? <p className="field-hint">Demo code: {devHint}</p> : null}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="otp-email">Email</label>
              <input
                id="otp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="otp-code">Verification code</label>
              <input
                id="otp-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>
          <button
            className="auth-back"
            type="button"
            onClick={onResend}
            disabled={resending}
            style={{ marginTop: 16, width: "100%", background: "none" }}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
          <Link className="auth-back" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
