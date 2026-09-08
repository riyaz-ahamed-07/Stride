"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { login, routeAfterLogin } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await login(email.trim().toLowerCase(), password);
      window.location.href = routeAfterLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel title="Care and recovery, connected">
        <p>
          Sign in to follow your home exercises, check appointments, and join
          consultations with your physiotherapist.
        </p>
        <ul className="check-list light">
          <li>Large, readable patient screens</li>
          <li>Therapist review before records update</li>
          <li>Camera guidance on supported exercises</li>
        </ul>
      </AuthBrandPanel>
      <div className="auth-form-wrap">
        <div className="login-card auth-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in with the email you registered.</p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="subtitle" style={{ marginTop: 16 }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
          <p className="subtitle">
            New here? <Link href="/signup">Create an account</Link>
          </p>
          <Link className="auth-back" href="/">
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
