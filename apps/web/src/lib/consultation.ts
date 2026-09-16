export type ConsultationRole = "patient" | "physiotherapist";

export type ConsultationParticipant = {
  id: string;
  full_name: string;
  role: ConsultationRole | "administrator";
  clinic_name?: string | null;
  specialty?: string | null;
};

export type ConsultationExercise = {
  name: string;
  target_sets: number;
  target_repetitions: number;
  frequency_note: string;
  week_number: number | null;
};

export type ConsultationPlan = {
  id: string;
  title: string;
  goal: string;
  items: ConsultationExercise[];
};

export type ConsultationContext = {
  appointment_id: string;
  scheduled_at: string;
  status: string;
  reason: string | null;
  patient: ConsultationParticipant;
  therapist: ConsultationParticipant;
  plan: ConsultationPlan | null;
  room_name: string;
};

export type ConsultationJoin = {
  livekit_url: string;
  token: string;
  token_expires_at: string;
  identity: string;
  role: ConsultationRole;
  display_name: string;
  consultation: ConsultationContext;
};

export function peerFor(join: ConsultationJoin): ConsultationParticipant {
  return join.role === "patient"
    ? join.consultation.therapist
    : join.consultation.patient;
}

export function dosageLabel(item: ConsultationExercise): string {
  const dose = `${item.target_sets} × ${item.target_repetitions}`;
  return item.frequency_note ? `${dose} · ${item.frequency_note}` : dose;
}
