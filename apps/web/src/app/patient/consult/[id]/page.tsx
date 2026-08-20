"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { VideoRoom } from "@/components/VideoRoom";
import { api, readSession } from "@/lib/api";

type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
};

export default function PatientConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [displayName, setDisplayName] = useState("Patient");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== "patient") {
      window.location.href = "/login";
      return;
    }
    setDisplayName(session.full_name);
    if (id === "demo") {
      setReady(true);
      return;
    }
    api<Appointment[]>("/appointments")
      .then((rows) => {
        setAppointment(rows.find((row) => row.id === id) ?? rows[0] ?? null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [id]);

  if (!ready) {
    return (
      <div className="video-room loading">
        <p>Connecting to your visit…</p>
      </div>
    );
  }

  return (
    <>
      <div className="video-topbar">
        <Link href="/patient/appointments">← Leave waiting room</Link>
        {appointment ? (
          <span>
            {new Date(appointment.scheduled_at).toLocaleString()} · {appointment.reason}
          </span>
        ) : (
          <span>Demo consultation room</span>
        )}
      </div>
      <VideoRoom
        appointmentId={id}
        role="patient"
        displayName={displayName}
        peerLabel="Dr. Patel"
        backHref="/patient/appointments"
      />
    </>
  );
}
