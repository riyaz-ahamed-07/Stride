"use client";

import { use, useEffect } from "react";
import { ConsultationRoom } from "@/components/ConsultationRoom";
import { readSession } from "@/lib/api";

export default function PatientConsultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== "patient") {
      window.location.href = "/login";
    }
  }, []);
  return (
    <ConsultationRoom
      appointmentId={id}
      variant="patient"
      backHref="/patient/appointments"
    />
  );
}
