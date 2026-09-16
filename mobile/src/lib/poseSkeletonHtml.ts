/** Inline HTML for WebView pose overlay — BlazePose + Kinovea-style guides & goniometer. */

const FULL_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const LITE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type PoseMetricsPayload = {
  reps: number;
  confidence: number;
  kneeAngle: number;
  phase: string;
  reliable: boolean;
};

export type PoseSkeletonOptions = {
  /** Enables sit-to-stand rep counting when set. */
  recipeKey?: string | null;
};

export function buildPoseSkeletonHtml(
  facing: "front" | "back",
  options: PoseSkeletonOptions = {},
): string {
  const facingMode = facing === "front" ? "user" : "environment";
  const mirrorStage = facing === "front" ? "scaleX(-1)" : "none";
  const recipeKey = options.recipeKey ?? "";
  const countReps = recipeKey === "sit_to_stand";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
  #stage {
    position: relative; width: 100%; height: 100%;
    transform: ${mirrorStage};
  }
  video, canvas {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover;
  }
  canvas { pointer-events: none; }
  #status {
    position: absolute; left: 12px; top: 12px; z-index: 2;
    transform: ${mirrorStage === "none" ? "none" : "scaleX(-1)"};
    background: rgba(15, 23, 42, 0.72); color: #e2e8f0;
    font: 600 12px/1.3 system-ui, sans-serif; padding: 8px 12px; border-radius: 999px;
    max-width: 90%;
  }
</style>
</head>
<body>
<div id="stage">
  <video id="video" playsinline muted autoplay></video>
  <canvas id="canvas"></canvas>
  <div id="status">Starting…</div>
</div>
<script>
(function () {
  var WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
  var FULL_MODEL = "${FULL_MODEL}";
  var LITE_MODEL = "${LITE_MODEL}";
  var RECIPE = ${JSON.stringify(recipeKey)};
  var COUNT_REPS = ${countReps ? "true" : "false"};
  var CONNECTIONS = ${JSON.stringify([
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
    [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
  ])};
  var JOINTS = [0,11,12,13,14,15,16,23,24,25,26,27,28,29,30,31,32];
  var VIS_MIN = 0.35;
  var SMOOTH = 0.42;
  var STAND_DEG = 155;
  var SIT_DEG = 115;
  var MIN_CONF = 0.55;
  var statusEl = document.getElementById("status");
  var video = document.getElementById("video");
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var landmarker = null;
  var stream = null;
  var raf = 0;
  var lastTs = -1;
  var smoothPts = null;
  var sitState = { reps: 0, phase: "unknown", lastAngle: 0, reliable: false };
  var holdRef = { count: 0, candidate: "unknown" };

  function post(msg) {
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (_) {}
  }
  function setStatus(text) {
    statusEl.textContent = text;
    post({ type: "status", text: text });
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus("Camera API blocked");
    post({ type: "error", message: "Camera is not available. Close and reopen the exercise." });
    return;
  }

  function mapX(x, w) { return x * w; }
  function mapY(y, h) { return y * h; }

  function visOf(arr) {
    if (!arr.length) return 0;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i].visibility || 0;
    return s / arr.length;
  }

  function pickSide(lm) {
    var left = visOf([lm[23], lm[25], lm[27]]);
    var right = visOf([lm[24], lm[26], lm[28]]);
    return left >= right ? "left" : "right";
  }

  function jointAngle(a, b, c) {
    var r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    var deg = Math.abs(r * 180 / Math.PI);
    return deg > 180 ? 360 - deg : deg;
  }

  function kneeAngle(lm, side) {
    if (side === "left") return jointAngle(lm[23], lm[25], lm[27]);
    return jointAngle(lm[24], lm[26], lm[28]);
  }

  function trackingConfidence(lm, side) {
    if (side === "left") return visOf([lm[23], lm[25], lm[27]]);
    return visOf([lm[24], lm[26], lm[28]]);
  }

  function updateSitStand(angle, conf) {
    var reliable = conf >= MIN_CONF && isFinite(angle);
    if (!reliable) return { reps: sitState.reps, phase: sitState.phase, reliable: false, kneeAngle: angle, confidence: conf };
    var candidate = sitState.phase;
    if (angle >= STAND_DEG) candidate = "standing";
    else if (angle <= SIT_DEG) candidate = "sitting";
    if (candidate === "unknown" || candidate === sitState.phase) {
      holdRef.count = 0;
      holdRef.candidate = candidate;
      sitState.lastAngle = angle;
      sitState.reliable = true;
      return { reps: sitState.reps, phase: sitState.phase, reliable: true, kneeAngle: angle, confidence: conf };
    }
    if (holdRef.candidate !== candidate) {
      holdRef.candidate = candidate;
      holdRef.count = 1;
      sitState.lastAngle = angle;
      sitState.reliable = true;
      return { reps: sitState.reps, phase: sitState.phase, reliable: true, kneeAngle: angle, confidence: conf };
    }
    holdRef.count += 1;
    if (holdRef.count < 4) {
      sitState.lastAngle = angle;
      sitState.reliable = true;
      return { reps: sitState.reps, phase: sitState.phase, reliable: true, kneeAngle: angle, confidence: conf };
    }
    holdRef.count = 0;
    var reps = sitState.reps;
    if (sitState.phase === "standing" && candidate === "sitting") reps += 1;
    sitState.reps = reps;
    sitState.phase = candidate;
    sitState.lastAngle = angle;
    sitState.reliable = true;
    return { reps: reps, phase: candidate, reliable: true, kneeAngle: angle, confidence: conf };
  }

  function smoothLandmarks(raw) {
    if (!raw || !raw.length) return raw;
    if (!smoothPts) {
      smoothPts = raw.map(function (p) { return { x: p.x, y: p.y, visibility: p.visibility || 0 }; });
      return smoothPts;
    }
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i];
      if (!p) continue;
      smoothPts[i].x = smoothPts[i].x * (1 - SMOOTH) + p.x * SMOOTH;
      smoothPts[i].y = smoothPts[i].y * (1 - SMOOTH) + p.y * SMOOTH;
      smoothPts[i].visibility = p.visibility || 0;
    }
    return smoothPts;
  }

  /** Kinovea capture-style alignment guides (static overlay, separate from skeleton topology). */
  function drawAlignmentGuides(w, h) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.06);
    ctx.lineTo(w * 0.5, h * 0.94);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.2);
    ctx.lineTo(w * 0.82, h * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.88);
    ctx.lineTo(w * 0.88, h * 0.88);
    ctx.stroke();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(w * 0.14, h * 0.12, w * 0.72, h * 0.78);
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** Goniometer-style knee angle readout (Kinovea measurement tools). */
  function drawGoniometer(lm, side, angle, conf, w, h) {
    if (conf < VIS_MIN) return;
    var hipI = side === "left" ? 23 : 24;
    var kneeI = side === "left" ? 25 : 26;
    var ankleI = side === "left" ? 27 : 28;
    var hip = lm[hipI], knee = lm[kneeI], ankle = lm[ankleI];
    if (!hip || !knee || !ankle) return;
    var kx = mapX(knee.x, w), ky = mapY(knee.y, h);
    var r = 36;
    var a1 = Math.atan2(mapY(hip.y, h) - ky, mapX(hip.x, w) - kx);
    var a2 = Math.atan2(mapY(ankle.y, h) - ky, mapX(ankle.x, w) - kx);
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
    ctx.fillText(Math.round(angle) + "°", kx + 14, ky - 12);
    ctx.restore();
  }

  function drawSkeleton(landmarks, w, h, metrics) {
    ctx.clearRect(0, 0, w, h);
    drawAlignmentGuides(w, h);
    if (!landmarks || !landmarks.length) {
      setStatus("Step into frame — align to guides");
      return;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    var ls = landmarks[11], rs = landmarks[12], lh = landmarks[23], rh = landmarks[24];
    if (ls && rs && lh && rh) {
      var torsoVis = Math.min(ls.visibility||0, rs.visibility||0, lh.visibility||0, rh.visibility||0);
      if (torsoVis >= VIS_MIN) {
        ctx.fillStyle = "rgba(216, 255, 88, 0.08)";
        ctx.beginPath();
        ctx.moveTo(mapX(ls.x,w), mapY(ls.y,h));
        ctx.lineTo(mapX(rs.x,w), mapY(rs.y,h));
        ctx.lineTo(mapX(rh.x,w), mapY(rh.y,h));
        ctx.lineTo(mapX(lh.x,w), mapY(lh.y,h));
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = "#d8ff58";
    ctx.lineWidth = 4;
    for (var i = 0; i < CONNECTIONS.length; i++) {
      var a = CONNECTIONS[i][0], b = CONNECTIONS[i][1];
      var pa = landmarks[a], pb = landmarks[b];
      if (!pa || !pb) continue;
      if ((pa.visibility||0) < VIS_MIN || (pb.visibility||0) < VIS_MIN) continue;
      ctx.beginPath();
      ctx.moveTo(mapX(pa.x,w), mapY(pa.y,h));
      ctx.lineTo(mapX(pb.x,w), mapY(pb.y,h));
      ctx.stroke();
    }

    for (var j = 0; j < JOINTS.length; j++) {
      var idx = JOINTS[j];
      var p = landmarks[idx];
      if (!p || (p.visibility||0) < VIS_MIN) continue;
      var rad = idx === 0 ? 6 : (idx >= 11 && idx <= 28 ? 5.5 : 4);
      ctx.beginPath();
      ctx.arc(mapX(p.x,w), mapY(p.y,h), rad, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#10110f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (metrics) {
      var side = pickSide(landmarks);
      drawGoniometer(landmarks, side, metrics.kneeAngle, metrics.confidence, w, h);
      if (metrics.reliable) {
        var label = COUNT_REPS
          ? "Reps " + metrics.reps + " · " + metrics.phase + " · " + Math.round(metrics.kneeAngle) + "°"
          : Math.round(metrics.kneeAngle) + "° knee · tracking OK";
        setStatus(label);
      } else {
        setStatus("Low confidence — reposition using guides");
      }
    }
  }

  function loop() {
    if (!landmarker || !video || video.readyState < 2) {
      raf = requestAnimationFrame(loop);
      return;
    }
    var vw = video.videoWidth || 640;
    var vh = video.videoHeight || 480;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }
    var now = performance.now();
    var metrics = null;
    if (now > lastTs) {
      var result = landmarker.detectForVideo(video, now);
      lastTs = now;
      var raw = result.landmarks && result.landmarks[0] ? result.landmarks[0] : [];
      var pts = smoothLandmarks(raw);
      if (pts && pts.length) {
        var side = pickSide(pts);
        var angle = kneeAngle(pts, side);
        var conf = trackingConfidence(pts, side);
        if (COUNT_REPS) {
          metrics = updateSitStand(angle, conf);
        } else {
          metrics = {
            reps: 0,
            phase: "unknown",
            reliable: conf >= MIN_CONF,
            kneeAngle: angle,
            confidence: conf,
          };
        }
        post({
          type: "metrics",
          reps: metrics.reps,
          confidence: Number(conf.toFixed(2)),
          kneeAngle: Number(angle.toFixed(1)),
          phase: metrics.phase,
          reliable: metrics.reliable,
        });
      } else {
        post({ type: "metrics", reps: sitState.reps, confidence: 0, kneeAngle: 0, phase: sitState.phase, reliable: false });
      }
      drawSkeleton(pts, canvas.width, canvas.height, metrics);
    }
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null;
    if (landmarker) landmarker.close();
    landmarker = null;
    if (video) video.srcObject = null;
    smoothPts = null;
  }
  window.__strideStopPose = stop;

  function createLandmarker(pkg, vision, modelPath, delegate) {
    return pkg.PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelPath, delegate: delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
  }

  import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm")
    .then(function (pkg) {
      return pkg.FilesetResolver.forVisionTasks(WASM).then(function (vision) {
        setStatus("Loading pose model…");
        return createLandmarker(pkg, vision, FULL_MODEL, "GPU")
          .catch(function () { return createLandmarker(pkg, vision, FULL_MODEL, "CPU"); })
          .catch(function () { return createLandmarker(pkg, vision, LITE_MODEL, "CPU"); })
          .then(function (lm) {
            landmarker = lm;
            setStatus("Opening camera…");
            return navigator.mediaDevices.getUserMedia({
              video: { facingMode: "${facingMode}", width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
          })
          .then(function (s) {
            stream = s;
            video.srcObject = stream;
            return video.play();
          })
          .then(function () {
            setStatus("Align to guides — tracking");
            post({ type: "ready" });
            loop();
          });
      });
    })
    .catch(function (err) {
      var msg = err && err.message ? err.message : "Pose overlay failed";
      setStatus(msg);
      post({ type: "error", message: msg });
    });
})();
</script>
</body>
</html>`;
}
