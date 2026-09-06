/** Turn API / network failures into short messages safe to show patients and clinicians. */

const STATUS_FALLBACKS: Record<number, string> = {
  400: "That request could not be completed. Check your details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "We could not find what you were looking for.",
  409: "This action conflicts with the current state. Refresh and try again.",
  422: "Some details look invalid. Check the form and try again.",
  429: "Too many attempts. Wait a moment and try again.",
  500: "The server had a problem. Please try again in a moment.",
  502: "The service is temporarily unavailable. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

function isNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === "TypeError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed")
  );
}

function formatDetail(detail: unknown, status: number): string {
  if (typeof detail === "string" && detail.trim()) {
    const trimmed = detail.trim();
    if (trimmed.length > 280 || looksLikeStack(trimmed)) {
      return STATUS_FALLBACKS[status] ?? "Could not complete that request. Please try again.";
    }
    return trimmed;
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  if (detail && typeof detail === "object") {
    const body = detail as { message?: string; password?: string[]; code?: string };
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
    if (Array.isArray(body.password) && body.password.length) {
      return `Password must include: ${body.password.join(", ")}.`;
    }
  }
  return STATUS_FALLBACKS[status] ?? "Could not complete that request. Please try again.";
}

function looksLikeStack(text: string): boolean {
  return (
    text.includes("Traceback") ||
    text.includes("at Object.") ||
    text.includes("File \"") ||
    /Error:\s*\n/.test(text)
  );
}

export function networkErrorMessage(): string {
  return "Could not reach the Stride server. Check your connection and that the API is running, then try again.";
}

export function messageFromHttpBody(detail: unknown, status: number, fallback?: string): string {
  const formatted = formatDetail(detail, status);
  if (formatted) return formatted;
  return fallback ?? STATUS_FALLBACKS[status] ?? "Could not complete that request. Please try again.";
}

export function userFacingError(err: unknown, fallback = "Could not complete that request. Please try again."): string {
  if (isNetworkFailure(err)) return networkErrorMessage();
  if (err instanceof Error && err.message.trim()) {
    const msg = err.message.trim();
    if (looksLikeStack(msg) || msg.startsWith("[")) {
      try {
        return formatDetail(JSON.parse(msg), 400);
      } catch {
        return fallback;
      }
    }
    if (msg.toLowerCase().includes("something went wrong")) {
      return fallback === "Something went wrong. Please try again."
        ? "Could not complete that request. Please try again."
        : fallback;
    }
    return msg;
  }
  return fallback;
}

export function isAuthFailureStatus(status: number): boolean {
  return status === 401;
}
