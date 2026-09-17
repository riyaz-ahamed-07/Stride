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
  const [goal, setGoal] = useState(
    "Restore safe sit-to-stand and walking confidence.",
  );
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
        .filter(
          (row) =>
            row.week_number === activeWeek && row.day_of_week === activeDay,
        )
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
        sort_order: prev.filter(
          (r) => r.week_number === activeWeek && r.day_of_week === activeDay,
        ).length,
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
    setItems((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
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
      setLibrary((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      addExercise(created);
      setQuickName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create exercise.",
      );
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
      setOk("Rehabilitation plan saved.");
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <div className="dashboard-page bento-page">
      {(error || ok) && (
        <p
          className="page-status"
          style={{ color: error ? "var(--danger)" : "var(--mint-deep)" }}
        >
          {error || ok}
        </p>
      )}

      <div className="bento-grid bento-plans">
        <form onSubmit={savePlan} className="bento-tile tile-meta">
          <div className="compact-form-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Patient</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Weeks</label>
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
            <div
              className="field"
              style={{ marginBottom: 0, gridColumn: "span 2" }}
            >
              <label>Goal</label>
              <input value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={savingPlan || !items.length}
            >
              {savingPlan ? "Saving…" : `Save plan (${items.length})`}
            </button>
          </div>
        </form>

        <section className="bento-tile">
          <div className="bento-tile-head">
            <h2>Library</h2>
            <span className="subtitle">{library.length} exercises</span>
          </div>
          <div className="bento-scroll">
            <div className="exercise-bento">
              {library.map((ex) => (
                <div
                  key={ex.id}
                  className="exercise-bento-card"
                  draggable
                  onDragStart={(e) => onDragStart(e, ex.id)}
                >
                  <strong>{ex.name}</strong>
                  <p className="subtitle">
                    {ex.body_region} · {ex.default_sets}×
                    {ex.default_repetitions}
                  </p>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => addExercise(ex)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
          <form
            onSubmit={createOnTheFly}
            className="compact-form-row"
            style={{ marginTop: 8, flexShrink: 0 }}
          >
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                placeholder="New exercise name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={creating}
            >
              {creating ? "Creating…" : "Create & add"}
            </button>
          </form>
        </section>

        <section className="bento-tile">
          <div className="bento-tile-head">
            <h2>
              Week {activeWeek} · {DAYS[activeDay]}
            </h2>
            <select
              className="day-session-select"
              value={sessionType}
              onChange={(e) =>
                setSessionType(e.target.value as "home" | "supervised")
              }
            >
              <option value="home">Home</option>
              <option value="supervised">Supervised</option>
            </select>
          </div>
          <div
            className="compact-actions"
            style={{ marginBottom: 8, flexShrink: 0 }}
          >
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
          <div
            className="compact-actions"
            style={{ marginBottom: 8, flexShrink: 0 }}
          >
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
          <div
            className="day-drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            {dayItems.length === 0 ? (
              <p className="subtitle">Drop exercises here for this day.</p>
            ) : (
              <div className="exercise-bento">
                {dayItems.map((row) => (
                  <div
                    className="exercise-bento-card is-scheduled"
                    key={row.key}
                  >
                    <strong>{row.exercise_name}</strong>
                    <p className="subtitle">
                      {row.target_sets}×{row.target_repetitions} ·{" "}
                      {row.session_type === "home" ? "Home" : "Supervised"}
                    </p>
                    <div className="day-item-controls">
                      <label className="day-item-field">
                        <span>Sets</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={row.target_sets}
                          onChange={(e) =>
                            updateItem(row.key, {
                              target_sets: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="day-item-field">
                        <span>Reps</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={row.target_repetitions}
                          onChange={(e) =>
                            updateItem(row.key, {
                              target_repetitions: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="day-item-field day-item-field-type">
                        <span>Type</span>
                        <select
                          value={row.session_type}
                          onChange={(e) =>
                            updateItem(row.key, {
                              session_type: e.target.value as
                                | "home"
                                | "supervised",
                            })
                          }
                        >
                          <option value="home">Home</option>
                          <option value="supervised">Supervised</option>
                        </select>
                      </label>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => removeItem(row.key)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
