"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type User = { id: string; full_name: string; email: string; role: string; status: string };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api<User[]>("/admin/users").then(setUsers);
  }, []);

  async function toggle(user: User) {
    const next = user.status === "active" ? "inactive" : "active";
    await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setUsers(await api<User[]>("/admin/users"));
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Administration</p>
          <h1>Account management</h1>
        </div>
      </header>
      <p className="subtitle">Activate or deactivate clinic accounts.</p>
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                    <div className="subtitle">{user.email}</div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    {user.status === "active" ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-warning">Inactive</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => toggle(user)}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
