"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { homeFor, login } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("kamala@stride.clinic");
  const [password, setPassword] = useState("StrideClinic1!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await login(email.trim().toLowerCase(), password);
      window.location.href = homeFor(session.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <Link className="logo auth-logo" href="/">
          <span className="logo-mark">S</span>
          Stride
        </Link>
        <h1>Care & recovery, connected</h1>
        <p>
          Sign in to manage home exercises, book visits, and join video consultations with your physiotherapist.
        </p>
        <ul className="check-list light">
          <li>Large, readable patient screens</li>
          <li>Therapist review before records update</li>
          <li>Secure video visit UI</li>
        </ul>
      </div>
      <div className="auth-form-wrap">
        <div className="login-card auth-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Use the email your clinic provided.</p>
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
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="demo-box">
            <strong>Demo accounts</strong>
            <p>Patient: kamala@stride.clinic</p>
            <p>Therapist: therapist@stride.clinic</p>
            <p>Admin: admin@stride.clinic</p>
            <p>Password: StrideClinic1!</p>
          </div>
          <Link className="auth-back" href="/">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
