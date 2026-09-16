"use client";

import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page"><p className="subtitle">Loading…</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
