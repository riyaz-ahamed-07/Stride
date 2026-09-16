"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { registerAccount, routeAfterAuth } from "@/lib/authFlow";
import { passwordRules, passwordValid } from "@/lib/passwordStrength";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"patient" | "physiotherapist">("patient");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = useMemo(() => passwordRules(password), [password]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!passwordValid(password)) {
      setError("Please meet all password requirements.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await registerAccount(email, password, role);
      window.location.href = routeAfterAuth(session, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel title="Create your Stride account">
        <p>
          Patients join with a physiotherapist invite code. Physiotherapists
          wait for clinic approval.
        </p>
      </AuthBrandPanel>
      <div className="auth-form-wrap">
        <div className="login-card auth-card">
          <h2>Create your account</h2>
          <p className="subtitle">
            Patients join with a physiotherapist invite code after verification.
            Physiotherapists wait for administrator approval.
          </p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>I am a</label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "patient" | "physiotherapist")
                }
              >
                <option value="patient">Patient</option>
                <option value="physiotherapist">Physiotherapist</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
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
              <ul
                className="password-rules"
                style={{ marginTop: 10, paddingLeft: 18 }}
              >
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    style={{
                      color: rule.ok ? "var(--mint-deep)" : "var(--text-muted)",
                    }}
                  >
                    {rule.ok ? "✓" : "○"} {rule.label}
                  </li>
                ))}
              </ul>
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
            >
              {busy ? "Creating…" : "Continue"}
            </button>
          </form>
          <p className="subtitle" style={{ marginTop: 16 }}>
            Email sign-up only. Google sign-in is not enabled for this demo.
          </p>
          <Link className="auth-back" href="/login">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
