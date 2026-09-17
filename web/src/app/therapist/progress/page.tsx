"use client";

import { useEffect } from "react";

/** Patient progress lives under Reviews — keep this URL working. */
export default function TherapistProgressRedirect() {
  useEffect(() => {
    window.location.replace("/therapist/reviews?tab=progress");
  }, []);
  return (
    <div className="dashboard-page">
      <p className="subtitle">Opening reviews…</p>
    </div>
  );
}
