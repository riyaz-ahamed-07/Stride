import type { Appointment, AuthSession, Plan } from "./types";

/** Set EXPO_PUBLIC_API_URL in `.env` to your PC LAN IP, e.g. http://192.168.1.5:8000 */
const rawApi = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/** Used only when Metro still has a stale placeholder from an older .env */
const FALLBACK_LAN_API = "https://pope-charts-toxic-poker.trycloudflare.com";

export const API =
  !rawApi || rawApi.includes("REPLACE_WITH") ? FALLBACK_LAN_API : rawApi;

console.log(
  `[Stride] API base URL = ${API}${rawApi !== API ? ` (overrode stale ${rawApi})` : ""}`,
);

function networkHint() {
  if (API.includes("127.0.0.1") || API.includes("localhost")) {
    return " On a phone, set EXPO_PUBLIC_API_URL in apps/mobile/.env to your laptop Wi‑Fi IP (ipconfig) and restart Expo.";
  }
  if (API.includes("169.254.")) {
    return " Your laptop has a 169.254 address (no real Wi‑Fi). Connect laptop + phone to the same router/hotspot, run ipconfig, put the 192.168.x.x IP in .env, then restart Expo.";
  }
  return " Check that the API is running with --host 0.0.0.0 and that phone + laptop share the same Wi‑Fi.";
}

async function loggedFetch(label: string, url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  console.log(`[Stride] → ${method} ${url}`);
  const started = Date.now();
  try {
    const response = await fetch(url, init);
    console.log(`[Stride] ← ${method} ${url} → ${response.status} (${Date.now() - started}ms)`);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Stride] ✕ ${method} ${url} FAILED after ${Date.now() - started}ms: ${message}`);
    throw new Error(`Network request failed.${networkHint()}`);
  }
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  console.log(`[Stride] signIn start for ${email.trim().toLowerCase()}`);
  const body = new URLSearchParams({ username: email.trim().toLowerCase(), password });
  const response = await loggedFetch("signIn", `${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    console.warn(`[Stride] signIn rejected: HTTP ${response.status}`);
    throw new Error("Email or password is not correct.");
  }
  const data = (await response.json()) as AuthSession;
  console.log(`[Stride] signIn ok · role=${data.role} · name=${data.full_name}`);
  return data;
}

export async function fetchPlans(token: string): Promise<Plan[]> {
  const response = await loggedFetch("plans", `${API}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.warn(`[Stride] plans failed: HTTP ${response.status}`);
    throw new Error("Could not load your exercise plan.");
  }
  const plans = (await response.json()) as Plan[];
  console.log(`[Stride] plans loaded: ${plans.length}`);
  return plans;
}

export async function fetchAppointments(token: string): Promise<Appointment[]> {
  const response = await loggedFetch("appointments", `${API}/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.warn(`[Stride] appointments failed: HTTP ${response.status}`);
    throw new Error("Could not load appointments.");
  }
  const rows = (await response.json()) as Appointment[];
  console.log(`[Stride] appointments loaded: ${rows.length}`);
  return rows;
}

export async function completeExerciseSession(
  token: string,
  exerciseId: string,
  reps: number,
  notes: string,
): Promise<void> {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const started = await loggedFetch("session-start", `${API}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan_exercise_id: exerciseId }),
  });
  if (!started.ok) throw new Error("Could not start session.");
  const session = (await started.json()) as { id: string };

  const completed = await loggedFetch("session-complete", `${API}/sessions/${session.id}/complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reported_repetitions: reps,
      patient_notes: notes || "Completed from the Stride phone app.",
      metric: "repetitions",
      value: reps,
      confidence: 0.7,
    }),
  });
  if (!completed.ok) {
    throw new Error("Could not save this session.");
  }
  console.log(`[Stride] session ${session.id} completed · reps=${reps}`);
}

export function videoRoomUrl(appointmentId: string, displayName: string) {
  const params = new URLSearchParams({ name: displayName, role: "patient" });
  return `${API}/video/room/${appointmentId}?${params.toString()}`;
}
