"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { VideoRoom } from "@/components/VideoRoom";
import { api, readSession } from "@/lib/api";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  patient_name: string | null;
};

export default function TherapistConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patientName, setPatientName] = useState("Patient");
  const [displayName, setDisplayName] = useState("Physiotherapist");

  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== "physiotherapist") {
      window.location.href = "/login";
      return;
    }
    setDisplayName(session.full_name);
    api<Appointment[]>("/appointments").then((rows) => {
      const found = rows.find((row) => row.id === id) ?? rows[0];
      setAppointment(found ?? null);
      if (found?.patient_name) setPatientName(found.patient_name);
    });
  }, [id]);

  return (
    <>
      <div className="video-topbar">
        <Link href="/therapist/appointments">← Back to schedule</Link>
        {appointment ? (
          <span>
            With {appointment.patient_name} · {new Date(appointment.scheduled_at).toLocaleString()}
          </span>
        ) : null}
      </div>
      <VideoRoom
        appointmentId={id}
        role="physiotherapist"
        displayName={displayName}
        peerLabel={patientName}
        backHref="/therapist/appointments"
      />
    </>
  );
}
