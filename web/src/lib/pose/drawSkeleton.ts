import {
  Landmark,
  POSE_CONNECTIONS,
  POSE_JOINTS,
  kneeAngle,
  pickSide,
  trackingConfidence,
} from "./landmarks";
import type { SitStandPhase } from "./sitToStand";

const VISIBILITY_MIN = 0.35;

export type SkeletonOverlay = {
  phase?: SitStandPhase;
  showReference?: boolean;
  showGuides?: boolean;
  showBadge?: boolean;
  showGoniometer?: boolean;
  progress?: number;
  cue?: string;
};

/** Kinovea capture-style alignment guides (plumb line, shoulder band, floor, frame). */
function drawAlignmentGuides(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.06);
  ctx.lineTo(width * 0.5, height * 0.94);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.18, height * 0.2);
  ctx.lineTo(width * 0.82, height * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.12, height * 0.88);
  ctx.lineTo(width * 0.88, height * 0.88);
  ctx.stroke();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(width * 0.14, height * 0.12, width * 0.72, height * 0.78);
  ctx.setLineDash([]);
  ctx.restore();
}

/** Ideal sit/stand stick figure for visual comparison (not a clinical template). */
function drawReferenceSilhouette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: SitStandPhase | undefined,
) {
  const standing = phase === "standing" || phase === "rising" || phase === "unknown";
  const cx = width * 0.18;
  const headY = height * (standing ? 0.22 : 0.34);
  const hipY = height * (standing ? 0.52 : 0.58);
  const kneeY = height * (standing ? 0.72 : 0.7);
  const ankleY = height * 0.88;
  const kneeX = standing ? cx : cx + width * 0.04;

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
  ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(cx, headY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, headY + 10);
  ctx.lineTo(cx, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(cx, ankleY);
  ctx.moveTo(cx, hipY);
  ctx.lineTo(cx - width * 0.05, kneeY);
  ctx.lineTo(cx - width * 0.02, ankleY);
  ctx.moveTo(cx, headY + 22);
  ctx.lineTo(cx - width * 0.05, hipY - 8);
  ctx.moveTo(cx, headY + 22);
  ctx.lineTo(cx + width * 0.05, hipY - 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(standing ? "Stand cue" : "Sit cue", cx - 24, height * 0.12);
  ctx.restore();
}

function drawProgressRing(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const p = Math.min(1, Math.max(0, progress));
  const x = width - 48;
  const y = 48;
  const r = 22;
  ctx.save();
  ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#d8ff58";
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(p * 100)}%`, x, y + 4);
  ctx.restore();
}

function drawPhaseBadge(
  ctx: CanvasRenderingContext2D,
  width: number,
  phase: SitStandPhase | undefined,
  cue?: string,
) {
  if (!phase) return;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(12, 12, Math.min(width - 24, 280), cue ? 52 : 30);
  ctx.fillStyle = "#d8ff58";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(phase.replace("_", " ").toUpperCase(), 22, 32);
  if (cue) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(cue.slice(0, 42), 22, 50);
  }
  ctx.restore();
}

function drawGoniometer(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  mirrored: boolean,
) {
  const side = pickSide(landmarks);
  const conf = trackingConfidence(landmarks, side);
  if (conf < VISIBILITY_MIN) return;

  const angle = kneeAngle(landmarks, side);
  const hipI = side === "left" ? 23 : 24;
  const kneeI = side === "left" ? 25 : 26;
  const ankleI = side === "left" ? 27 : 28;
  const hip = landmarks[hipI];
  const knee = landmarks[kneeI];
  const ankle = landmarks[ankleI];
  if (!hip || !knee || !ankle) return;

  const mapX = (x: number) => (mirrored ? (1 - x) * width : x * width);
  const mapY = (y: number) => y * height;
  const kx = mapX(knee.x);
  const ky = mapY(knee.y);
  const r = 36;
  const a1 = Math.atan2(mapY(hip.y) - ky, mapX(hip.x) - kx);
  const a2 = Math.atan2(mapY(ankle.y) - ky, mapX(ankle.x) - kx);

  ctx.save();
  ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(kx, ky, r, a1, a2, false);
  ctx.stroke();
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fillRect(kx + 8, ky - 28, 72, 22);
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(`${Math.round(angle)}°`, kx + 14, ky - 12);
  ctx.restore();
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  mirrored = true,
  overlay?: SkeletonOverlay,
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (overlay?.showGuides !== false) {
    drawAlignmentGuides(ctx, width, height);
  }
  if (overlay?.showReference !== false) {
    drawReferenceSilhouette(ctx, width, height, overlay?.phase);
  }
  if (typeof overlay?.progress === "number") {
    drawProgressRing(ctx, width, height, overlay.progress);
  }
  if (overlay?.showBadge !== false) {
    drawPhaseBadge(ctx, width, overlay?.phase, overlay?.cue);
  }

  if (!landmarks.length) {
    ctx.restore();
    return;
  }

  const mapX = (x: number) => (mirrored ? (1 - x) * width : x * width);
  const mapY = (y: number) => y * height;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const ls = landmarks[11];
  const rs = landmarks[12];
  const lh = landmarks[23];
  const rh = landmarks[24];
  if (ls && rs && lh && rh) {
    const vis = Math.min(ls.visibility ?? 0, rs.visibility ?? 0, lh.visibility ?? 0, rh.visibility ?? 0);
    if (vis >= VISIBILITY_MIN) {
      ctx.fillStyle = "rgba(216, 255, 88, 0.08)";
      ctx.beginPath();
      ctx.moveTo(mapX(ls.x), mapY(ls.y));
      ctx.lineTo(mapX(rs.x), mapY(rs.y));
      ctx.lineTo(mapX(rh.x), mapY(rh.y));
      ctx.lineTo(mapX(lh.x), mapY(lh.y));
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.strokeStyle = "#d8ff58";
  ctx.lineWidth = 4;
  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb) continue;
    if ((pa.visibility ?? 0) < VISIBILITY_MIN || (pb.visibility ?? 0) < VISIBILITY_MIN) continue;
    ctx.beginPath();
    ctx.moveTo(mapX(pa.x), mapY(pa.y));
    ctx.lineTo(mapX(pb.x), mapY(pb.y));
    ctx.stroke();
  }

  for (const idx of POSE_JOINTS) {
    const p = landmarks[idx];
    if (!p || (p.visibility ?? 0) < VISIBILITY_MIN) continue;
    const radius = idx === 0 ? 6 : [11, 12, 23, 24, 25, 26, 27, 28].includes(idx) ? 5.5 : 4;
    ctx.beginPath();
    ctx.arc(mapX(p.x), mapY(p.y), radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#10110f";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (overlay?.showGoniometer !== false) {
    drawGoniometer(ctx, landmarks, width, height, mirrored);
  }

  ctx.restore();
}
