export type AuthSession = {
  access_token: string;
  role: string;
  full_name: string;
  user_id?: string;
  status?: string;
  email_verified?: boolean;
  email?: string;
  dev_code?: string | null;
};

export type SessionType = "home" | "supervised";

export type PlanItem = {
  id: string;
  exercise_name: string;
  target_sets: number;
  target_repetitions: number;
  instructions: string;
  safety_notes: string;
  week_number: number;
  day_of_week: number | null;
  session_type: SessionType;
  pose_recipe_key?: string | null;
  demo_cue?: string;
  frequency_note?: string;
  body_region?: string;
};

export type Plan = {
  id: string;
  title: string;
  start_date: string;
  duration_weeks: number;
  goal: string;
  items: PlanItem[];
};

export type ExerciseSession = {
  id: string;
  plan_exercise_id: string;
  started_at: string;
  ended_at: string | null;
  status: "in_progress" | "completed" | "abandoned";
  reported_repetitions: number | null;
  patient_notes: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  phone: string | null;
  notes: string | null;
  date_of_birth: string | null;
  therapist_id: string | null;
  license_number?: string | null;
  clinic_name?: string | null;
  specialty?: string | null;
};

export type TherapistContact = {
  full_name: string;
  phone: string | null;
  clinic_name: string | null;
};

export type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
};

export type ConsultationJoin = {
  livekit_url: string;
  token: string;
  token_expires_at: string;
  identity: string;
  role: "patient" | "physiotherapist";
  display_name: string;
  consultation: {
    appointment_id: string;
    scheduled_at: string;
    status: string;
    reason: string | null;
    patient: {
      id: string;
      full_name: string;
      role: string;
      clinic_name?: string | null;
    };
    therapist: {
      id: string;
      full_name: string;
      role: string;
      clinic_name?: string | null;
    };
    plan: {
      id: string;
      title: string;
      goal: string;
      items: {
        name: string;
        target_sets: number;
        target_repetitions: number;
        frequency_note: string;
        week_number: number | null;
      }[];
    } | null;
    room_name: string;
  };
};

export type AppTab = "home" | "plan" | "appointments" | "help";

/** @deprecated use AppTab */
export type PatientTab = AppTab;

export type PatientRoute =
  | { name: "tab"; tab: AppTab }
  | { name: "account" }
  | { name: "appointments" }
  | { name: "progress" }
  | { name: "move"; exerciseId: string }
  | { name: "moveSuccess" }
  | { name: "consult"; appointmentId: string };

export type AuthRoute =
  | "landing"
  | "login"
  | "forgot"
  | "signup"
  | "verifyOtp"
  | "onboarding"
  | "pendingApproval";
