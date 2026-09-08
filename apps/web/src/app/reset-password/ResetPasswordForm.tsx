"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/authFlow";
import { passwordRules, passwordValid } from "@/lib/passwordStrength";

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const tokenFromLink = (params.get("token") ?? "").trim();
  const [token, setToken] = useState(tokenFromLink);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const rules = useMemo(() => passwordRules(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!token.trim()) {
      setError("This reset link is missing a token. Request a new one from Forgot password.");
      return;
    }
    if (!passwordValid(password)) {
      setError("Please meet all password requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resetPassword(token.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form-wrap" style={{ margin: "0 auto", maxWidth: 420 }}>
        <div className="login-card auth-card">
          <h2>Reset password</h2>
          {done ? (
            <div className="stack">
              <p className="subtitle">Your password was updated. Sign in with your new password.</p>
              <Link className="btn btn-primary btn-block" href="/login">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="subtitle">Choose a new password for your Stride account.</p>
              <form onSubmit={onSubmit}>
                {tokenFromLink ? null : (
                  <div className="field">
                    <label htmlFor="token">Reset token</label>
                    <input
                      id="token"
                      type="text"
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="off"
                      required
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="password">New password</label>
                  <div className="password-field">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <ul className="password-rules" style={{ marginTop: 10, paddingLeft: 18 }}>
                    {rules.map((rule) => (
                      <li key={rule.id} style={{ color: rule.ok ? "var(--mint-deep)" : "var(--text-muted)" }}>
                        {rule.ok ? "✓" : "○"} {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <div className="password-field">
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch ? (
                    <p className="error">Passwords do not match.</p>
                  ) : null}
                </div>
                {error ? <p className="error">{error}</p> : null}
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Update password"}
                </button>
              </form>
            </>
          )}
          {done ? null : (
            <Link className="auth-back" href="/login">
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
