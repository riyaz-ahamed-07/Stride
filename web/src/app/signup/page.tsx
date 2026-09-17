"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { registerAccount, routeAfterAuth } from "@/lib/authFlow";
import { passwordRules, passwordValid } from "@/lib/passwordStrength";

const ROLES = [
  {
    id: "patient" as const,
    label: "I am a Patient",
    hint: "Home exercises & video visits",
    art: "/onboarding/role-patient.jpg",
  },
  {
    id: "physiotherapist" as const,
    label: "I am a Physiotherapist",
    hint: "Clinic plans & consultations",
    art: "/onboarding/role-therapist.jpg",
  },
];

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
            Choose how you will use Stride, then create your login.
          </p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Are you a patient or physiotherapist?</label>
              <div className="role-cards" role="radiogroup">
                {ROLES.map((item) => {
                  const selected = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`role-card${selected ? " is-selected" : ""}`}
                      onClick={() => setRole(item.id)}
                      disabled={busy}
                    >
                      <div className="role-card-art">
                        <Image
                          src={item.art}
                          alt=""
                          width={280}
                          height={280}
                          className="role-card-img"
                          priority
                        />
                      </div>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </button>
                  );
                })}
              </div>
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
                      color: rule.ok ? "var(--success)" : "var(--text-muted)",
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
