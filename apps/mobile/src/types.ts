export type AuthSession = { access_token: string; role: string; full_name: string };

export type PlanItem = {
  id: string;
  exercise_name: string;
  target_sets: number;
  target_repetitions: number;
  instructions: string;
  safety_notes: string;
};

export type Plan = {
  id: string;
  title: string;
  items: PlanItem[];
};

export type Appointment = {
  id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
};

export type PatientTab = "home" | "plan" | "help";

export type PatientRoute =
  | { name: "tab"; tab: PatientTab }
  | { name: "appointments" }
  | { name: "move"; exerciseId: string }
  | { name: "moveSuccess" }
  | { name: "consult"; appointmentId: string };

export type AuthRoute = "landing" | "login";
