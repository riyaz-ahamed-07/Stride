"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Plan = {
  title: string;
  items: {
    id: string;
    exercise_name: string;
    target_sets: number;
    target_repetitions: number;
    instructions: string;
    safety_notes: string;
  }[];
};

export default function ExercisesPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Plan[]>("/plans")
      .then((rows) => setPlan(rows[0] ?? null))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Your plan</p>
          <h1>Home exercises</h1>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      {!plan ? (
        <div className="card">
          <p className="subtitle">No active plan yet. Your physiotherapist will assign exercises here.</p>
        </div>
      ) : (
        <>
          <div className="card card-gradient" style={{ marginBottom: 24 }}>
            <h2>{plan.title}</h2>
            <p className="subtitle">{plan.items.length} exercises · Complete at your own pace</p>
          </div>
          <div className="exercise-grid">
            {plan.items.map((item) => (
              <article className="card exercise-card" key={item.id}>
                <span className="badge badge-warning">Guided movement</span>
                <h3>{item.exercise_name}</h3>
                <p className="subtitle">{item.instructions}</p>
                <p className="exercise-meta">
                  {item.target_sets} sets × {item.target_repetitions} reps
                </p>
                <div className="alert-safety compact">
                  <strong>Stop if you feel pain</strong>
                  {item.safety_notes}
                </div>
                <Link className="btn btn-primary btn-block" href={`/patient/move/${item.id}`}>
                  Start exercise
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
