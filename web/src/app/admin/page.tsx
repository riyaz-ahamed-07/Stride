"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock, SuccessBanner } from "@/components/AsyncState";
import { api } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  license_number?: string | null;
  clinic_name?: string | null;
  specialty?: string | null;
  invite_code?: string | null;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [lastInvite, setLastInvite] = useState<{ name: string; code: string } | null>(null);

  async function refresh() {
    setError("");
    const [all, queue] = await Promise.all([
      api<User[]>("/admin/users"),
      api<User[]>("/admin/users/pending"),
    ]);
    setUsers(all);
    setPending(queue);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err: unknown) => setError(userFacingError(err, "Could not load accounts.")))
      .finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    setActionError("");
    try {
      const approved = await api<User>(`/admin/users/${id}/approve`, { method: "POST" });
      if (approved.invite_code) {
        setLastInvite({ name: approved.full_name || approved.email, code: approved.invite_code });
      }
      await refresh();
    } catch (err) {
      setActionError(userFacingError(err, "Could not approve this account."));
    }
  }

  async function reject(id: string) {
    setActionError("");
    setLastInvite(null);
    try {
      await api(`/admin/users/${id}/reject`, { method: "POST" });
      await refresh();
    } catch (err) {
      setActionError(userFacingError(err, "Could not reject this application."));
    }
  }

  async function toggle(user: User) {
    setActionError("");
    try {
      const next = user.status === "active" ? "inactive" : "active";
      await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await refresh();
    } catch (err) {
      setActionError(userFacingError(err, "Could not update this account."));
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <LoadingBlock label="Loading accounts…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <ErrorState message={error} onRetry={() => {
          setLoading(true);
          refresh()
            .catch((err: unknown) => setError(userFacingError(err, "Could not load accounts.")))
            .finally(() => setLoading(false));
        }} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Administration</p>
          <h1>Account management</h1>
        </div>
      </header>

      {actionError ? <ErrorState message={actionError} /> : null}
      {lastInvite ? (
        <SuccessBanner
          message={`Approved ${lastInvite.name}. Patient invite code: ${lastInvite.code}`}
        />
      ) : null}

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Awaiting approval ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState
            title="No applications waiting"
            body="Physiotherapist applications appear here after they finish onboarding."
          />
        ) : (
          pending.map((user) => (
            <div key={user.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <strong>{user.full_name || user.email}</strong>
              <div className="subtitle">
                {user.email}
                {user.clinic_name ? ` · ${user.clinic_name}` : ""}
                {user.license_number ? ` · License ${user.license_number}` : ""}
                {user.specialty ? ` · ${user.specialty}` : ""}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" type="button" onClick={() => approve(user.id)}>
                  Approve
                </button>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => reject(user.id)}>
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <p className="subtitle">Manage clinic accounts. Approved therapists receive a patient invite code.</p>
      <div className="card">
        {users.length === 0 ? (
          <p className="subtitle">No accounts yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Invite</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.full_name || user.email}</strong>
                      <div className="subtitle">{user.email}</div>
                    </td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`badge ${user.status === "active" ? "badge-success" : "badge-warning"}`}>
                        {user.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{user.invite_code ?? "n/a"}</td>
                    <td>
                      {user.status === "active" || user.status === "inactive" ? (
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => toggle(user)}>
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
