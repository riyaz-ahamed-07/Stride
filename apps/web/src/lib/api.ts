import {
  isAuthFailureStatus,
  messageFromHttpBody,
  networkErrorMessage,
  userFacingError,
} from "./userFacingError";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type Role = "patient" | "physiotherapist" | "administrator";

export type Session = {
  access_token: string;
  role: Role;
  full_name: string;
  user_id: string;
  status?: string;
  email_verified?: boolean;
};

const KEY = "stride.session";

export function saveSession(session: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function readSession(): Session | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

function redirectToLogin() {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (err) {
    throw new Error(userFacingError(err, networkErrorMessage()));
  }

  if (!response.ok) {
    if (isAuthFailureStatus(response.status)) {
      redirectToLogin();
      throw new Error("Your session has expired. Please sign in again.");
    }
    let detail: unknown;
    try {
      const body = await response.json();
      detail = body.detail;
    } catch {
      detail = undefined;
    }
    throw new Error(messageFromHttpBody(detail, response.status));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<Session> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
  } catch (err) {
    throw new Error(userFacingError(err, networkErrorMessage()));
  }
  if (!response.ok) {
    let detail = "Email or password is not correct.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string" && body.detail.trim()) detail = body.detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  const session = (await response.json()) as Session;
  saveSession(session);
  return session;
}

export function routeAfterLogin(session: Session): string {
  if (session.status === "pending_email") return "/verify-otp";
  if (session.status === "pending_onboarding") {
    return session.role === "patient" ? "/onboarding/patient" : "/onboarding/therapist";
  }
  if (session.status === "pending_approval") return "/pending-approval";
  return homeFor(session.role);
}

export function homeFor(role: Role) {
  if (role === "patient") return "/patient";
  if (role === "physiotherapist") return "/therapist";
  return "/admin";
}
