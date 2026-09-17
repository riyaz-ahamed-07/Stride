import type {
  Appointment,
  AuthSession,
  ConsultationJoin,
  ExerciseSession,
  Plan,
  TherapistContact,
  UserProfile,
} from "./types";

/** Set EXPO_PUBLIC_API_URL in `.env` to your PC LAN IP, e.g. http://192.168.1.5:8000 */
const rawApi = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export const API =
  !rawApi || rawApi.includes("REPLACE_WITH") || rawApi.includes("YOUR_LAN_IP")
    ? "http://127.0.0.1:8000"
    : rawApi.replace(/\/$/, "");

const rawWeb = process.env.EXPO_PUBLIC_WEB_URL ?? "";

/** Web app for signup, forgot-password fallback, and pose embed pages. */
export const WEB_URL =
  !rawWeb || rawWeb.includes("REPLACE_WITH") || rawWeb.includes("YOUR_LAN_IP")
    ? "http://127.0.0.1:3001"
    : rawWeb.replace(/\/$/, "");

console.log(`[Stride] API base URL = ${API}`);

function networkHint() {
  if (API.includes("127.0.0.1") || API.includes("localhost")) {
    return " On a physical phone, set EXPO_PUBLIC_API_URL in mobile/.env to your laptop LAN IP (ipconfig), e.g. http://192.168.1.5:8000, then restart Expo with npm run start:dev.";
  }
  if (API.includes("trycloudflare.com")) {
    return " Remove the old Cloudflare URL from mobile/.env — use your laptop LAN IP instead (same Wi‑Fi), then restart Expo.";
  }
  if (API.includes("169.254.")) {
    return " Your laptop has a 169.254 address (no real Wi‑Fi). Connect laptop + phone to the same router/hotspot, run ipconfig, put the 192.168.x.x (or 10.x) IP in .env, then restart Expo.";
  }
  return " Check phone + laptop are on the same Wi‑Fi, API is bound to 0.0.0.0:8000, and Windows Firewall allows port 8000.";
}

async function loggedFetch(
  label: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const method = init?.method ?? "GET";
  console.log(`[Stride] → ${method} ${url}`);
  const started = Date.now();
  try {
    const response = await fetch(url, init);
    console.log(
      `[Stride] ← ${method} ${url} → ${response.status} (${Date.now() - started}ms)`,
    );
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Stride] ✕ ${method} ${url} FAILED after ${Date.now() - started}ms: ${message}`,
    );
    throw new Error(`Network request failed.${networkHint()}`);
  }
}

async function readErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  const err = (await response.json().catch(() => null)) as {
    detail?:
      | string
      | { password?: string[]; message?: string }
      | { msg?: string }[];
  } | null;
  const detail = err?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) =>
        item && typeof item === "object" && item.msg ? String(item.msg) : null,
      )
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    if (typeof detail.message === "string" && detail.message.trim())
      return detail.message.trim();
    if (Array.isArray(detail.password) && detail.password.length) {
      return `Password must include: ${detail.password.join(", ")}.`;
    }
  }
  if (response.status === 401)
    return "Your session has expired. Please sign in again.";
  if (response.status === 403) return "You do not have permission to do that.";
  if (response.status === 404)
    return "We could not find what you were looking for.";
  if (response.status >= 500)
    return "The server had a problem. Please try again in a moment.";
  return fallback;
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthSession> {
  console.log(`[Stride] signIn start for ${email.trim().toLowerCase()}`);
  const body = new URLSearchParams({
    username: email.trim().toLowerCase(),
    password,
  });
  const response = await loggedFetch("signIn", `${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    console.warn(`[Stride] signIn rejected: HTTP ${response.status}`);
    let detail = "Email or password is not correct.";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string" && body.detail.trim())
        detail = body.detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  const data = (await response.json()) as AuthSession;
  console.log(
    `[Stride] signIn ok · role=${data.role} · name=${data.full_name}`,
  );
  return data;
}

export async function registerAccount(
  email: string,
  password: string,
  role: "patient" | "physiotherapist",
): Promise<AuthSession> {
  const response = await loggedFetch("register", `${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      role,
    }),
  });
  if (!response.ok) {
    throw new Error(
      await readErrorDetail(response, "Could not create account."),
    );
  }
  return (await response.json()) as AuthSession;
}

/** @deprecated use registerAccount */
export async function registerPatient(
  email: string,
  password: string,
): Promise<AuthSession> {
  return registerAccount(email, password, "patient");
}

export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<AuthSession> {
  const response = await loggedFetch("verify-otp", `${API}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  });
  if (!response.ok) {
    throw new Error(
      await readErrorDetail(response, "Invalid or expired code."),
    );
  }
  return (await response.json()) as AuthSession;
}

export async function resendEmailOtp(
  email: string,
): Promise<{ detail: string; dev_code?: string | null }> {
  const response = await loggedFetch("resend-otp", `${API}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Could not resend code."));
  }
  return (await response.json()) as {
    detail: string;
    dev_code?: string | null;
  };
}

export async function validateTherapistInvite(
  token: string,
  inviteCode: string,
): Promise<{ valid: boolean; therapist_name: string }> {
  const response = await loggedFetch(
    "validate-invite",
    `${API}/auth/validate-invite`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        therapist_invite_code: inviteCode.trim().toUpperCase(),
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      await readErrorDetail(response, "That invite code was not found."),
    );
  }
  return (await response.json()) as { valid: boolean; therapist_name: string };
}

export async function completePatientOnboarding(
  token: string,
  payload: {
    full_name: string;
    date_of_birth?: string | null;
    phone?: string | null;
    gender?: string | null;
    body_region: string;
    rehab_goal: string;
    notes?: string | null;
    therapist_invite_code: string;
    camera_analysis_consent: boolean;
  },
): Promise<AuthSession> {
  const response = await loggedFetch(
    "onboarding-patient",
    `${API}/auth/onboarding/patient`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: payload.full_name.trim(),
        date_of_birth: payload.date_of_birth || null,
        phone: payload.phone?.trim() || null,
        gender: payload.gender || null,
        body_region: payload.body_region,
        rehab_goal: payload.rehab_goal.trim(),
        notes: payload.notes?.trim() || null,
        therapist_invite_code: payload.therapist_invite_code
          .trim()
          .toUpperCase(),
        camera_analysis_consent: payload.camera_analysis_consent,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Could not finish setup."));
  }
  return (await response.json()) as AuthSession;
}

export async function completeTherapistOnboarding(
  token: string,
  payload: {
    full_name: string;
    phone?: string | null;
    license_number: string;
    clinic_name: string;
    specialty?: string | null;
  },
): Promise<AuthSession> {
  const response = await loggedFetch(
    "onboarding-therapist",
    `${API}/auth/onboarding/therapist`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: payload.full_name.trim(),
        phone: payload.phone?.trim() || null,
        license_number: payload.license_number.trim(),
        clinic_name: payload.clinic_name.trim(),
        specialty: payload.specialty?.trim() || null,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Could not finish setup."));
  }
  return (await response.json()) as AuthSession;
}

export type PatientSummary = {
  id: string;
  full_name: string;
  email: string;
  status: string;
};

export async function fetchPatients(token: string): Promise<PatientSummary[]> {
  const response = await loggedFetch("patients", `${API}/patients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Could not load patients.");
  }
  return (await response.json()) as PatientSummary[];
}

export async function fetchPlans(token: string): Promise<Plan[]> {
  const response = await loggedFetch("plans", `${API}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.warn(`[Stride] plans failed: HTTP ${response.status}`);
    throw new Error(
      await readErrorDetail(response, "Could not load your exercise plan."),
    );
  }
  const plans = (await response.json()) as Plan[];
  console.log(`[Stride] plans loaded: ${plans.length}`);
  return plans;
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const response = await loggedFetch("profile", `${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Could not load your profile.");
  }
  return (await response.json()) as UserProfile;
}

export async function updateProfile(
  token: string,
  patch: {
    full_name?: string;
    phone?: string | null;
    notes?: string | null;
    date_of_birth?: string | null;
  },
): Promise<UserProfile> {
  const response = await loggedFetch("profile-update", `${API}/auth/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      typeof err?.detail === "string" ? err.detail : "Could not save profile.",
    );
  }
  return (await response.json()) as UserProfile;
}

export async function changeTherapist(
  token: string,
  therapistInviteCode: string,
): Promise<TherapistContact> {
  const response = await loggedFetch(
    "change-therapist",
    `${API}/auth/change-therapist`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        therapist_invite_code: therapistInviteCode.trim(),
      }),
    },
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      typeof err?.detail === "string"
        ? err.detail
        : "Could not change physiotherapist.",
    );
  }
  return (await response.json()) as TherapistContact;
}

export async function deleteAccount(token: string): Promise<void> {
  const response = await loggedFetch("delete-account", `${API}/auth/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Could not delete account.");
  }
}

export async function fetchMyTherapist(
  token: string,
): Promise<TherapistContact | null> {
  const response = await loggedFetch(
    "my-therapist",
    `${API}/auth/my-therapist`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (response.status === 404) {
    console.log("[Stride] no therapist assigned");
    return null;
  }
  if (!response.ok) {
    console.warn(`[Stride] my-therapist failed: HTTP ${response.status}`);
    return null;
  }
  const row = (await response.json()) as TherapistContact;
  console.log(`[Stride] therapist loaded: ${row.full_name}`);
  return row;
}

export async function fetchSessions(token: string): Promise<ExerciseSession[]> {
  const response = await loggedFetch("sessions", `${API}/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.warn(`[Stride] sessions failed: HTTP ${response.status}`);
    throw new Error(
      await readErrorDetail(response, "Could not load your progress."),
    );
  }
  const rows = (await response.json()) as ExerciseSession[];
  console.log(`[Stride] sessions loaded: ${rows.length}`);
  return rows;
}

export async function fetchAppointments(token: string): Promise<Appointment[]> {
  const response = await loggedFetch("appointments", `${API}/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.warn(`[Stride] appointments failed: HTTP ${response.status}`);
    throw new Error(
      await readErrorDetail(response, "Could not load appointments."),
    );
  }
  const rows = (await response.json()) as Appointment[];
  console.log(`[Stride] appointments loaded: ${rows.length}`);
  return rows;
}

export type ObservationRow = {
  id: string;
  metric: string;
  value: number;
  confidence: number;
  review_status: string;
  exercise_name?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  reported_repetitions?: number | null;
  patient_notes?: string | null;
};

export async function fetchObservations(
  token: string,
): Promise<ObservationRow[]> {
  const response = await loggedFetch("observations", `${API}/observations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(
      await readErrorDetail(response, "Could not load observations."),
    );
  }
  return (await response.json()) as ObservationRow[];
}

export async function completeExerciseSession(
  token: string,
  exerciseId: string,
  reps: number,
  notes: string,
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const started = await loggedFetch("session-start", `${API}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan_exercise_id: exerciseId }),
  });
  if (!started.ok) throw new Error("Could not start session.");
  const session = (await started.json()) as { id: string };

  const completed = await loggedFetch(
    "session-complete",
    `${API}/sessions/${session.id}/complete`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        reported_repetitions: reps,
        patient_notes: notes || "Completed from the Stride phone app.",
        metric: "repetitions",
        value: reps,
        confidence: 0.7,
      }),
    },
  );
  if (!completed.ok) {
    throw new Error("Could not save this session.");
  }
  console.log(`[Stride] session ${session.id} completed · reps=${reps}`);
}

export async function requestPasswordReset(
  email: string,
): Promise<{ detail: string; dev_reset_token?: string | null }> {
  const response = await loggedFetch(
    "forgot-password",
    `${API}/auth/forgot-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    },
  );
  if (!response.ok) {
    throw new Error(
      "Could not send reset instructions. Check your email and try again.",
    );
  }
  return (await response.json()) as {
    detail: string;
    dev_reset_token?: string | null;
  };
}

export async function joinConsultation(
  token: string,
  appointmentId: string,
): Promise<ConsultationJoin> {
  const response = await loggedFetch(
    "consult-join",
    `${API}/video/consultations/${appointmentId}/join`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (response.status === 401)
    throw new Error("Please sign in again to join this consultation.");
  if (response.status === 403)
    throw new Error("You are not authorized to join this consultation.");
  if (response.status === 404)
    throw new Error("This consultation was not found.");
  if (response.status === 503)
    throw new Error("Video consultation is not configured on this server.");
  if (!response.ok) {
    throw new Error(
      await readErrorDetail(response, "Could not join the consultation."),
    );
  }
  return (await response.json()) as ConsultationJoin;
}

export async function endConsultation(
  token: string,
  appointmentId: string,
): Promise<void> {
  const response = await loggedFetch(
    "consult-end",
    `${API}/video/consultations/${appointmentId}/end`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok && response.status !== 403) {
    throw new Error(
      await readErrorDetail(response, "Could not end the consultation."),
    );
  }
}
