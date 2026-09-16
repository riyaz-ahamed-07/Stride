"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { forgotPassword } from "@/lib/authFlow";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const result = await forgotPassword(email);
      setResetToken(result.dev_reset_token ?? null);
      setSent(true);
    } catch {
      setError("Could not send reset instructions.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form-wrap" style={{ margin: "0 auto", maxWidth: 420 }}>
        <div className="login-card auth-card">
          <h2>Forgot password</h2>
          {sent ? (
            <div className="stack">
              {resetToken ? (
                <>
                  <p className="subtitle">
                    If that email exists, you can continue below. Local demo mode is not sending email
                    (SMTP is not configured).
                  </p>
                  <p className="field-hint">This reset link is only shown in local demo.</p>
                  <Link
                    className="btn btn-primary btn-block"
                    href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                  >
                    Continue to reset password
                  </Link>
                </>
              ) : (
                <p className="subtitle">
                  If that email is registered, reset instructions were sent. Check your inbox — the
                  link expires in 15 minutes.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <p className="subtitle">Enter the email on your Stride account.</p>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  required
                />
              </div>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
          <Link className="auth-back" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
