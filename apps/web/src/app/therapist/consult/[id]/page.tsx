"use client";

import { use, useEffect } from "react";
import { ConsultationRoom } from "@/components/ConsultationRoom";
import { readSession } from "@/lib/api";

export default function TherapistConsultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== "physiotherapist") {
      window.location.href = "/login";
    }
  }, []);
  return (
    <ConsultationRoom
      appointmentId={id}
      variant="therapist"
      backHref="/therapist/appointments"
    />
  );
}
