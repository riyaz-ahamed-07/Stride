/** Turn API / network failures into short messages safe to show patients. */

function looksLikeStack(text: string): boolean {
  return (
    text.includes("Traceback") ||
    text.includes("at Object.") ||
    text.includes("File \"") ||
    /Error:\s*\n/.test(text)
  );
}

export function userFacingError(
  err: unknown,
  fallback = "Could not complete that request. Please try again.",
): string {
  if (!(err instanceof Error) || !err.message.trim()) return fallback;
  const msg = err.message.trim();
  if (looksLikeStack(msg)) return fallback;
  if (msg.toLowerCase().includes("something went wrong")) return fallback;
  return msg;
}

export function cameraPermissionHelp(): string {
  return "Camera access is needed for movement guidance. Open your phone Settings → Apps → Stride → Permissions, enable Camera, then return here.";
}
