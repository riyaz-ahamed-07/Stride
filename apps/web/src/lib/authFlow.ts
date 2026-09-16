import { API_URL, type Role, type Session, saveSession } from "./api";

export type AuthSession = Session & {
  status: string;
  email_verified?: boolean;
  dev_code?: string | null;
};

const DEV_OTP_KEY = "stride.dev_otp";

function rememberDevOtp(code: string | null | undefined) {
  if (!code) return;
  try {
    sessionStorage.setItem(DEV_OTP_KEY, code);
  } catch {
    /* ignore */
  }
}

export async function registerAccount(
  email: string,
  password: string,
  role: "patient" | "physiotherapist",
): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not create account.");
  }
  const session = (await response.json()) as AuthSession;
  rememberDevOtp(session.dev_code);
  saveSession(session);
  return session;
}

export async function verifyOtp(email: string, code: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
  });
  if (!response.ok) throw new Error("Invalid or expired code.");
  const session = (await response.json()) as AuthSession;
  saveSession(session);
  return session;
}

export async function resendOtp(email: string): Promise<{ detail: string; dev_code?: string | null }> {
  const response = await fetch(`${API_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not resend code.");
  }
  const body = (await response.json()) as { detail: string; dev_code?: string | null };
  rememberDevOtp(body.dev_code);
  return body;
}

export async function forgotPassword(
  email: string,
): Promise<{ detail: string; dev_reset_token?: string | null }> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!response.ok) throw new Error("Could not send reset instructions.");
  return (await response.json()) as { detail: string; dev_reset_token?: string | null };
}

export async function resetPassword(token: string, password: string): Promise<{ detail: string }> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
  if (!response.ok) {
    throw new Error(resetPasswordError(body.detail));
  }
  return {
    detail:
      typeof body.detail === "string" ? body.detail : "Password updated. Sign in with your new password.",
  };
}

const RESET_TOKEN_ERRORS: Record<string, string> = {
  invalid: "This reset link is invalid.",
  expired: "This reset link has expired. Request a new one.",
  already_used: "This reset link has already been used. Request a new one.",
};

function resetPasswordError(detail: unknown): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const body = detail as { code?: string; message?: string; password?: string[] };
    if (body.code && RESET_TOKEN_ERRORS[body.code]) return RESET_TOKEN_ERRORS[body.code];
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (Array.isArray(body.password) && body.password.length) {
      return `Password must include: ${body.password.join(", ")}.`;
    }
  }
  return "Could not reset password.";
}

export function routeForStatus(session: AuthSession): string {
  if (session.status === "pending_email") return `/verify-otp`;
  if (session.status === "pending_onboarding") {
    if (session.role === "patient") return "/onboarding/patient";
    if (session.role === "physiotherapist") return "/onboarding/therapist";
  }
  if (session.status === "pending_approval") return "/pending-approval";
  return homeForRole(session.role);
}

export function homeForRole(role: Role) {
  if (role === "patient") return "/patient";
  if (role === "physiotherapist") return "/therapist";
  return "/admin";
}

export function routeAfterAuth(session: AuthSession, email?: string): string {
  if (session.status === "pending_email") {
    return `/verify-otp?email=${encodeURIComponent(email ?? "")}`;
  }
  if (session.status === "pending_onboarding") {
    return session.role === "patient" ? "/onboarding/patient" : "/onboarding/therapist";
  }
  if (session.status === "pending_approval") return "/pending-approval";
  return homeForRole(session.role);
}
