"use client";

import { useEffect } from "react";

/** Exercise library lives inside Plans — keep this URL working. */
export default function ExerciseLibraryRedirect() {
  useEffect(() => {
    window.location.replace("/therapist/plans");
  }, []);
  return (
    <div className="dashboard-page">
      <p className="subtitle">Opening plans…</p>
    </div>
  );
}
