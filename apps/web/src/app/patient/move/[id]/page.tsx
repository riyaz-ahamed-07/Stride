"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Plan = {
  items: {
    id: string;
    exercise_name: string;
    target_repetitions: number;
    instructions: string;
    safety_notes: string;
  }[];
};

export default function MovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Plan["items"][0] | null>(null);
  const [reps, setReps] = useState("8");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Plan[]>("/plans").then((plans) => {
      const found = plans.flatMap((plan) => plan.items).find((row) => row.id === id);
      setItem(found ?? null);
      if (found) setReps(String(found.target_repetitions));
    });
  }, [id]);

  async function onFinish(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const session = await api<{ id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({ plan_exercise_id: id }),
      });
      const count = Number(reps);
      await api(`/sessions/${session.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          reported_repetitions: count,
          patient_notes: notes,
          metric: "repetitions",
          value: count,
          confidence: 0.7,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this session.");
    }
  }

  if (done) {
    return (
      <div className="dashboard-page">
        <div className="success-screen inline">
          <div className="success-icon">✓</div>
          <h1>Well done!</h1>
          <p className="subtitle">Your session is saved. Your physiotherapist will review it and add it to your record.</p>
          <Link className="btn btn-primary" href="/patient">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <Link className="breadcrumb" href="/patient/exercises">
            ← Exercises
          </Link>
          <h1>{item?.exercise_name ?? "Exercise"}</h1>
        </div>
      </header>

      <div className="dashboard-grid-2">
        <section>
          <span className="badge badge-warning">Guided movement</span>
          <p className="subtitle" style={{ marginTop: 12 }}>
            {item?.instructions}
          </p>
          <div className="alert-safety">
            <strong>Stop immediately if you feel pain</strong>
            Dizziness or unsteadiness means stop and rest. {item?.safety_notes}
          </div>
        </section>

        <form onSubmit={onFinish} className="card">
          <h2>Log your session</h2>
          <div className="field">
            <label htmlFor="reps">How many repetitions did you complete?</label>
            <input id="reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="notes">Notes for your therapist (optional)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Last two were slower" />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary btn-block" type="submit">
            I have finished
          </button>
          <Link className="btn btn-outline btn-block" href="/patient/exercises" style={{ marginTop: 10 }}>
            Not today
          </Link>
        </form>
      </div>
    </div>
  );
}
