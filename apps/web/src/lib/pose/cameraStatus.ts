export type CameraTrackingStatus =
  | "idle"
  | "loading"
  | "requesting"
  | "tracking"
  | "no_person"
  | "low_confidence"
  | "multi_person"
  | "permission_denied"
  | "unavailable"
  | "stopped";

export function cameraStatusLabel(status: CameraTrackingStatus): string {
  switch (status) {
    case "idle":
      return "Camera idle";
    case "loading":
      return "Loading pose model…";
    case "requesting":
      return "Requesting camera…";
    case "tracking":
      return "Tracking";
    case "no_person":
      return "No person detected";
    case "low_confidence":
      return "Poor tracking — adjust position";
    case "multi_person":
      return "Multiple people — one person only";
    case "permission_denied":
      return "Camera permission denied";
    case "unavailable":
      return "Camera unavailable";
    case "stopped":
      return "Camera off";
  }
}

export function classifyCameraError(err: unknown): CameraTrackingStatus {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (
    message.includes("permission") ||
    message.includes("not allowed") ||
    message.includes("denied") ||
    message.includes("securityerror")
  ) {
    return "permission_denied";
  }
  if (
    message.includes("notfound") ||
    message.includes("not found") ||
    message.includes("devices not found") ||
    message.includes("overconstrained")
  ) {
    return "unavailable";
  }
  return "unavailable";
}
