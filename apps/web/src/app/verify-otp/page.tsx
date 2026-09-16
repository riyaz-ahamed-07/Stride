"use client";

import { Suspense } from "react";
import VerifyOtpForm from "./VerifyOtpForm";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="auth-page"><p className="subtitle">Loading…</p></div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
