"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Patient = { id: string; full_name: string };
type Exercise = {
  id: string;
  name: string;
  body_region: string;
  default_sets: number;
  default_repetitions: number;
  pose_recipe_key: string | null;
};

type DraftItem = {
  key: string;
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_repetitions: number;
  week_number: number;
  day_of_week: number;
  session_type: "home" | "supervised";
  sort_order: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PlanBuilderPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("Knee rehabilitation plan");
  const [goal, setGoal] = useState("Restore safe sit-to-stand and walking confidence.");
  const [weeks, setWeeks] = useState(4);
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState(0);
  const [sessionType, setSessionType] = useState<"home" | "supervised">("home");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [quickName, setQuickName] = useState("");

  useEffect(() => {
    Promise.all([api<Patient[]>("/patients"), api<Exercise[]>("/exercises")])
      .then(([p, e]) => {
        setPatients(p);
        setLibrary(e);
        if (p[0]) setPatientId(p[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const dayItems = useMemo(
    () =>
      items
        .filter((row) => row.week_number === activeWeek && row.day_of_week === activeDay)
        .sort((a, b) => a.sort_order - b.sort_order),
    [items, activeWeek, activeDay],
  );

  function addExercise(ex: Exercise) {
    setItems((prev) => [
      ...prev,
      {
        key: uid(),
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_sets: ex.default_sets,
        target_repetitions: ex.default_repetitions,
        week_number: activeWeek,
        day_of_week: activeDay,
        session_type: sessionType,
        sort_order: prev.filter((r) => r.week_number === activeWeek && r.day_of_week === activeDay).length,
      },
    ]);
    setOk(`Added ${ex.name} to Week ${activeWeek} · ${DAYS[activeDay]}`);
  }

  function onDragStart(event: DragEvent, exerciseId: string) {
    event.dataTransfer.setData("text/exercise-id", exerciseId);
    event.dataTransfer.effectAllowed = "copy";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/exercise-id");
    const ex = library.find((row) => row.id === id);
    if (ex) addExercise(ex);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((row) => row.key !== key));
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function createOnTheFly(event: FormEvent) {
    event.preventDefault();
    if (!quickName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const created = await api<Exercise>("/exercises", {
        method: "POST",
        body: JSON.stringify({
          name: quickName.trim(),
          instructions: `${quickName.trim()} as demonstrated in clinic. Move slowly and stop if pain increases.`,
          safety_notes: "Stop if pain, dizziness, or unsteadiness.",
          body_region: "general",
          category: "functional",
          default_sets: 2,
          default_repetitions: 8,
          demo_cue: "Follow the therapist demonstration.",
        }),
      });
      setLibrary((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      addExercise(created);
      setQuickName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create exercise.");
    } finally {
      setCreating(false);
    }
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    if (savingPlan) return;
    setError("");
    setOk("");
    if (!items.length) {
      setError("Add at least one exercise to a day.");
      return;
    }
    setSavingPlan(true);
    try {
      await api("/plans", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          title,
          goal,
          duration_weeks: weeks,
          start_date: new Date().toISOString().slice(0, 10),
          items: items.map((row, index) => ({
            exercise_id: row.exercise_id,
            target_sets: row.target_sets,
            target_repetitions: row.target_repetitions,
            week_number: row.week_number,
            day_of_week: row.day_of_week,
            session_type: row.session_type,
            sort_order: index,
          })),
        }),
      });
      setOk("Rehabilitation plan saved. The patient will see home and supervised days on their schedule.");
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Rehabilitation plan</p>
          <h1>Plan builder</h1>
          <p className="subtitle" style={{ marginTop: 8 }}>
            Build a multi-week rehabilitation plan. Add exercises to a day, then mark each day as home or supervised.
          </p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {ok ? <p className="subtitle" style={{ color: "var(--mint-deep)" }}>{ok}</p> : null}

      <form onSubmit={savePlan} className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <div className="field">
            <label>Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label>Duration (weeks)</label>
            <input
              type="number"
              min={1}
              max={16}
              value={weeks}
              onChange={(e) => {
                const next = Number(e.target.value);
                setWeeks(next);
                if (activeWeek > next) setActiveWeek(next);
              }}
            />
          </div>
        </div>
        <div className="field">
          <label>Goal</label>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={savingPlan || !items.length}>
          {savingPlan ? "Saving…" : `Save rehabilitation plan (${items.length} exercises)`}
        </button>
      </form>

      <div className="dashboard-grid-2">
        <section className="card">
          <h2>Library</h2>
          <p className="subtitle">Drag onto the day board, or click Add.</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 8 }}>
            {library.map((ex) => (
              <li
                key={ex.id}
                draggable
                onDragStart={(e) => onDragStart(e, ex.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--surface-muted)",
                  cursor: "grab",
                }}
              >
                <div>
                  <strong>{ex.name}</strong>
                  <div className="subtitle">
                    {ex.body_region} · {ex.default_sets}×{ex.default_repetitions}
                    {ex.pose_recipe_key ? ` · pose:${ex.pose_recipe_key}` : ""}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => addExercise(ex)}>
                  Add
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={createOnTheFly} style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <h3>Create while planning</h3>
            <div className="field">
              <input
                placeholder="New exercise name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create & add to this day"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>
            Week {activeWeek} · {DAYS[activeDay]}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                type="button"
                className={`btn btn-sm ${activeWeek === w ? "btn-primary" : "btn-outline"}`}
                onClick={() => setActiveWeek(w)}
              >
                W{w}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {DAYS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`btn btn-sm ${activeDay === index ? "btn-teal" : "btn-outline"}`}
                onClick={() => setActiveDay(index)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Session type for new items</label>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as "home" | "supervised")}>
              <option value="home">Home (unguided HEP)</option>
              <option value="supervised">Supervised (clinic / video)</option>
            </select>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            style={{
              minHeight: 220,
              border: "2px dashed var(--border)",
              borderRadius: 16,
              padding: 16,
              background: "var(--surface-muted)",
            }}
          >
            {dayItems.length === 0 ? (
              <p className="subtitle">Drop exercises here for this day.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {dayItems.map((row) => (
                  <li
                    key={row.key}
                    style={{
                      padding: 12,
                      background: "var(--surface)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{row.exercise_name}</strong>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => removeItem(row.key)}>
                        Remove
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                      <label className="subtitle">
                        Sets
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={row.target_sets}
                          onChange={(e) => updateItem(row.key, { target_sets: Number(e.target.value) })}
                        />
                      </label>
                      <label className="subtitle">
                        Reps
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={row.target_repetitions}
                          onChange={(e) => updateItem(row.key, { target_repetitions: Number(e.target.value) })}
                        />
                      </label>
                      <label className="subtitle">
                        Type
                        <select
                          value={row.session_type}
                          onChange={(e) =>
                            updateItem(row.key, { session_type: e.target.value as "home" | "supervised" })
                          }
                        >
                          <option value="home">Home</option>
                          <option value="supervised">Supervised</option>
                        </select>
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="field-hint" style={{ marginTop: 12 }}>
            Typical pattern: home HEP most days; one supervised day per week for video or clinic review.
          </p>
        </section>
      </div>
    </div>
  );
}
