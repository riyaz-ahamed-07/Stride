"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { POSE_RECIPES } from "@/lib/pose/recipes";

type Exercise = {
  id: string;
  name: string;
  instructions: string;
  safety_notes: string;
  body_region: string;
  category: string;
  default_sets: number;
  default_repetitions: number;
  demo_cue: string;
  pose_recipe_key: string | null;
  is_system: boolean;
  source_id?: string | null;
  source?: string | null;
};

const emptyForm = {
  name: "",
  instructions: "",
  safety_notes: "Stop if pain, dizziness, or swelling increases.",
  body_region: "knee",
  category: "strength",
  default_sets: 2,
  default_repetitions: 8,
  demo_cue: "",
  pose_recipe_key: "",
};

export default function ExerciseLibraryPage() {
  const [rows, setRows] = useState<Exercise[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function refresh() {
    const data = await api<Exercise[]>("/exercises");
    setRows(data);
  }

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, []);

  function startEdit(row: Exercise) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      instructions: row.instructions,
      safety_notes: row.safety_notes,
      body_region: row.body_region,
      category: row.category,
      default_sets: row.default_sets,
      default_repetitions: row.default_repetitions,
      demo_cue: row.demo_cue,
      pose_recipe_key: row.pose_recipe_key ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    const body = {
      ...form,
      pose_recipe_key: form.pose_recipe_key || null,
    };
    try {
      if (editingId) {
        await api(`/exercises/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/exercises", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save exercise.");
    }
  }

  const visible = rows.filter((row) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.body_region.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Exercise library</p>
          <h1>Clinic exercises</h1>
          <p className="subtitle" style={{ marginTop: 8 }}>
            Clinic library includes{" "}
            <a href="https://github.com/cutemo0953/open-rehab-exercises" target="_blank" rel="noreferrer">
              Open Rehab Exercises
            </a>{" "}
            (CC BY 4.0). Add custom HEP items anytime. Pose assist uses preset recipes — you set dosage and cues, not
            joint angles.
          </p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="dashboard-grid-2">
        <section className="card">
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              placeholder="Search name, region…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Region</th>
                  <th>Dose</th>
                  <th>Pose</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      {row.is_system ? (
                        <span className="badge badge-success" style={{ marginLeft: 8 }}>
                          {row.source === "open-rehab-exercises" ? "Open Rehab" : "System"}
                        </span>
                      ) : (
                        <span className="badge" style={{ marginLeft: 8 }}>
                          Custom
                        </span>
                      )}
                    </td>
                    <td>
                      {row.body_region} · {row.category}
                    </td>
                    <td>
                      {row.default_sets}×{row.default_repetitions}
                    </td>
                    <td>{row.pose_recipe_key ?? "—"}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>{editingId ? "Edit exercise" : "New custom exercise"}</h2>
          <form onSubmit={save}>
            <div className="field">
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Instructions (patient language)</label>
              <textarea
                required
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Safety notes</label>
              <textarea
                required
                value={form.safety_notes}
                onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Demo cue (short)</label>
              <input value={form.demo_cue} onChange={(e) => setForm({ ...form, demo_cue: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Body region</label>
                <select value={form.body_region} onChange={(e) => setForm({ ...form, body_region: e.target.value })}>
                  <option value="knee">Knee</option>
                  <option value="hip">Hip</option>
                  <option value="ankle">Ankle</option>
                  <option value="shoulder">Shoulder</option>
                  <option value="spine">Spine</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="strength">Strength</option>
                  <option value="mobility">Mobility</option>
                  <option value="activation">Activation</option>
                  <option value="functional">Functional</option>
                  <option value="balance">Balance</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Default sets</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.default_sets}
                  onChange={(e) => setForm({ ...form, default_sets: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Default reps</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.default_repetitions}
                  onChange={(e) => setForm({ ...form, default_repetitions: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="field">
              <label>Pose recipe (optional)</label>
              <select
                value={form.pose_recipe_key}
                onChange={(e) => setForm({ ...form, pose_recipe_key: e.target.value })}
              >
                <option value="">None — manual / cue only</option>
                {Object.values(POSE_RECIPES).map((recipe) => (
                  <option key={recipe.key} value={recipe.key}>
                    {recipe.label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Recipes carry joint logic. You never tune degrees — pick a matching pattern if camera assist applies.
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" type="submit">
                {editingId ? "Save changes" : "Add to library"}
              </button>
              {editingId ? (
                <button className="btn btn-outline" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
