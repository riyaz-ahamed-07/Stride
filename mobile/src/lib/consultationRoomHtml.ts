import type { ConsultationJoin } from "../types";

const LIVEKIT_CLIENT =
  "https://cdn.jsdelivr.net/npm/livekit-client@2.22.3/dist/livekit-client.umd.js";

export function buildConsultationHtml(
  join: ConsultationJoin,
  prefs?: { cameraOn?: boolean; micOn?: boolean },
): string {
  const isPatient = join.role === "patient";
  const therapist = join.consultation.therapist;
  const patient = join.consultation.patient;
  const headerName = isPatient ? therapist.full_name : patient.full_name;
  const headerRole = isPatient
    ? therapist.clinic_name || "Physiotherapist"
    : join.consultation.reason || "Patient";
  const preferCam = prefs?.cameraOn !== false;
  const preferMic = prefs?.micOn !== false;
  const selfName = join.display_name || (isPatient ? patient.full_name : therapist.full_name);
  const selfInitials = escapeHtml(
    selfName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?",
  );
  const planTitle = join.consultation.plan?.title || "";
  const planGoal = join.consultation.plan?.goal || "";
  const planItems = (join.consultation.plan?.items || [])
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(
          `${item.target_sets}×${item.target_repetitions}${item.frequency_note ? ` · ${item.frequency_note}` : ""}`,
        )}</span></li>`,
    )
    .join("");
  const config = JSON.stringify({
    url: join.livekit_url,
    token: join.token,
    tokenExpiresAt: join.token_expires_at,
    role: join.role,
    displayName: join.display_name,
    headerName,
    headerRole,
    reason: join.consultation.reason,
    preferCam,
    preferMic,
    selfName,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <title>Stride consultation</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b1220; color: #0f172a; }
    .stage { position: relative; min-height: 100dvh; overflow: hidden; background: radial-gradient(120% 80% at 50% 20%, #dfe7f2 0%, #c5d0de 55%, #aeb9c9 100%); }
    .main { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .25s ease; }
    .main.on { opacity: 1; }
    .pose-canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; z-index: 2; }
    .pose-status { position: absolute; left: 50%; top: max(72px, calc(env(safe-area-inset-top) + 56px)); transform: translateX(-50%); z-index: 4; margin: 0; padding: 6px 12px; border-radius: 999px; background: rgba(15,23,42,.55); color: #fff; font-size: 12px; font-weight: 600; pointer-events: none; }
    .placeholder { position: absolute; inset: 0; display: grid; place-items: center; place-content: center; gap: 10px; padding: 28px; text-align: center; z-index: 1; background: radial-gradient(90% 80% at 50% 35%, #243047 0%, #111827 62%, #0b1220 100%); }
    .placeholder p { margin: 0; color: #e2e8f0; font-size: 18px; font-weight: 700; line-height: 1.35; }
    .placeholder span { color: #94a3b8; font-size: 14px; max-width: 16rem; }
    .avatar { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; font-size: 28px; font-weight: 800; color: #fff; background: linear-gradient(145deg, #26baa4 0%, #1a8f7d 100%); box-shadow: 0 12px 28px rgba(38,186,164,.28); }
    .avatar.sm { width: 40px; height: 40px; font-size: 14px; box-shadow: none; }
    .header { position: absolute; top: max(18px, env(safe-area-inset-top)); left: 64px; right: 120px; z-index: 5; text-align: center; pointer-events: none; }
    .header strong { display: block; font-size: 18px; font-weight: 800; letter-spacing: -0.03em; color: #13233f; }
    .header span { display: block; margin-top: 2px; font-size: 14px; font-weight: 500; color: #64748b; }
    .pip { position: absolute; top: max(16px, env(safe-area-inset-top)); right: 14px; width: 104px; aspect-ratio: 3/4; border-radius: 22px; overflow: hidden; background: #1e293b; border: 3px solid rgba(255,255,255,.92); box-shadow: 0 12px 28px rgba(15,23,42,.22); z-index: 6; }
    .pip video { width: 100%; height: 100%; object-fit: cover; }
    .pip .off { height: 100%; display: grid; place-items: center; place-content: center; gap: 6px; padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #cbd5e1; background: radial-gradient(90% 80% at 50% 30%, #3b4a63 0%, #1e293b 70%); }
    .dock { position: absolute; left: 0; right: 0; bottom: max(18px, env(safe-area-inset-bottom)); z-index: 8; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 14px; }
    .timer { display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 14px; border-radius: 999px; background: rgba(30,41,59,.72); color: #fff; font-size: 14px; font-weight: 600; backdrop-filter: blur(8px); }
    .controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .ctrl { border: 0; color: #fff; display: grid; place-items: center; background: #1a1f2b; box-shadow: 0 10px 24px rgba(15,23,42,.28); }
    .ctrl.size-sm { width: 44px; height: 44px; border-radius: 14px; }
    .ctrl.size-md { width: 56px; height: 56px; border-radius: 18px; }
    .ctrl.size-lg { width: 72px; height: 72px; border-radius: 22px; }
    .ctrl.off { background: #7f1d1d; }
    .ctrl.active { outline: 2px solid #26baa4; outline-offset: 2px; }
    .ctrl.end { background: #EF4444; box-shadow: 0 14px 28px rgba(239,68,68,.35); }
    .alert { position: absolute; left: 56px; right: 56px; top: 88px; z-index: 7; color: #fecaca; font-size: 14px; text-align: center; }
    .sheet { position: absolute; left: 12px; right: 12px; bottom: max(110px, calc(env(safe-area-inset-bottom) + 100px)); z-index: 40; max-height: min(58dvh, 520px); overflow: auto; padding: 20px 20px 24px; border-radius: 28px; background: rgba(255,255,255,.98); box-shadow: 0 20px 48px rgba(15,23,42,.28); color: #0f172a; }
    .sheet.hidden { display: none; }
    .sheet-close { float: right; border: 0; background: transparent; color: #26baa4; font-weight: 700; font-size: 15px; padding: 4px 0; }
    .sheet .kicker { margin: 0 0 6px; clear: both; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
    .sheet h2, .sheet h3 { margin: 0 0 8px; font-size: 22px; line-height: 1.3; }
    .sheet p { margin: 0 0 12px; color: #475569; font-size: 16px; }
    .sheet .meta { color: #64748b; }
    .sheet ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 12px; }
    .sheet li { display: grid; gap: 2px; }
    .sheet li span { color: #64748b; font-size: 14px; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="stage" id="stage">
    <video class="main" id="patient" autoplay playsinline ${isPatient ? "muted" : ""}></video>
    <canvas class="pose-canvas" id="poseCanvas" aria-hidden="true"></canvas>
    <p class="pose-status hidden" id="poseStatus"></p>
    <div class="placeholder" id="placeholder">
      <div class="avatar" id="placeholderAvatar">${selfInitials}</div>
      <p id="placeholderTitle">Connecting…</p>
      <span id="placeholderHint">Setting up your consultation</span>
    </div>
    <header class="header">
      <strong id="title">${escapeHtml(headerName)}</strong>
      <span id="subtitle">${escapeHtml(headerRole)}</span>
    </header>
    <div class="pip">
      <video id="therapist" autoplay playsinline ${isPatient ? "" : "muted"}></video>
      <div class="off" id="pipOff">Waiting…</div>
    </div>
    <p class="alert" id="alert"></p>
    <aside class="sheet hidden" id="sheet" aria-label="Consultation details">
      <button type="button" class="sheet-close" id="sheetClose">Close</button>
      ${
        isPatient
          ? `<p class="kicker">Physiotherapist</p>
             <h2>${escapeHtml(therapist.full_name)}</h2>
             ${therapist.clinic_name ? `<p>${escapeHtml(therapist.clinic_name)}</p>` : ""}
             ${planTitle ? `<p class="meta">${escapeHtml(planTitle)}</p>` : ""}
             ${join.consultation.reason ? `<p class="meta">${escapeHtml(join.consultation.reason)}</p>` : ""}`
          : `<p class="kicker">Patient</p>
             <h2>${escapeHtml(patient.full_name)}</h2>
             ${join.consultation.reason ? `<p>${escapeHtml(join.consultation.reason)}</p>` : ""}
             ${
               planTitle
                 ? `<p class="kicker">Rehabilitation plan</p>
                    <h3>${escapeHtml(planTitle)}</h3>
                    ${planGoal ? `<p>${escapeHtml(planGoal)}</p>` : ""}
                    <ul>${planItems}</ul>`
                 : `<p class="meta">No rehabilitation plan is linked to this appointment.</p>`
             }`
      }
    </aside>
    <div class="dock">
      <div class="timer" id="timer">⏱ 00:00</div>
      <div class="controls">
        <button type="button" class="ctrl size-sm" id="speaker" aria-label="Speaker">${speakerSvg(false)}</button>
        <button type="button" class="ctrl size-md" id="mic" aria-label="Microphone">${micSvg(false)}</button>
        <button type="button" class="ctrl size-lg end" id="end" aria-label="End call">${phoneSvg()}</button>
        <button type="button" class="ctrl size-md" id="cam" aria-label="Camera">${camSvg(false)}</button>
        <button type="button" class="ctrl size-sm" id="chat" aria-label="Details">${chatSvg()}</button>
      </div>
    </div>
  </div>
  <script>window.__STRIDE_CONSULT__ = ${config};</script>
  <script src="${LIVEKIT_CLIENT}"></script>
  <script>
    const cfg = window.__STRIDE_CONSULT__;
    const isPatient = cfg.role === "patient";
    const { Room, RoomEvent, Track, DisconnectReason } = LivekitClient;
    const patientEl = document.getElementById("patient");
    const therapistEl = document.getElementById("therapist");
    const poseCanvas = document.getElementById("poseCanvas");
    const poseStatus = document.getElementById("poseStatus");
    const pipOff = document.getElementById("pipOff");
    const placeholder = document.getElementById("placeholder");
    const placeholderAvatar = document.getElementById("placeholderAvatar");
    const placeholderTitle = document.getElementById("placeholderTitle");
    const placeholderHint = document.getElementById("placeholderHint");
    const alertEl = document.getElementById("alert");
    const micBtn = document.getElementById("mic");
    const camBtn = document.getElementById("cam");
    const speakerBtn = document.getElementById("speaker");
    const chatBtn = document.getElementById("chat");
    const sheet = document.getElementById("sheet");
    const timerEl = document.getElementById("timer");
    let room = null;
    let leaving = false;
    let replacing = false;
    let cameraOn = !!cfg.preferCam;
    let micOn = !!cfg.preferMic;
    let speakerOn = true;
    let poseOn = true;
    let sheetOpen = false;
    const volume = 0.85;
    let refreshTimer = 0;
    let liveStartedAt = null;
    let tickTimer = 0;

    function post(type, extra) {
      const payload = JSON.stringify(Object.assign({ type: type }, extra || {}));
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
    }
    function setStatus(title, hint) {
      placeholderTitle.textContent = title;
      placeholderHint.textContent = hint || "";
      placeholderHint.style.display = hint ? "block" : "none";
    }
    function showCamOffPlaceholder() {
      placeholder.style.display = "grid";
      placeholderAvatar.style.display = "grid";
      setStatus("Your camera is off", "Tap the camera control to turn it back on");
    }
    function showStatusPlaceholder(title, hint) {
      placeholder.style.display = "grid";
      placeholderAvatar.style.display = "none";
      setStatus(title, hint);
    }
    function hidePlaceholder() {
      placeholder.style.display = "none";
    }
    function formatElapsed(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(Math.floor(sec % 60)).padStart(2, "0");
      return m + ":" + s;
    }
    function startClock() {
      if (!liveStartedAt) liveStartedAt = Date.now();
      clearInterval(tickTimer);
      tickTimer = setInterval(() => {
        timerEl.textContent = "⏱ " + formatElapsed(Math.floor((Date.now() - liveStartedAt) / 1000));
      }, 1000);
    }
    function permissionText(kind, err) {
      const name = err && err.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        return kind === "camera"
          ? "Camera permission was denied. Enable it to be seen."
          : "Microphone permission was denied. Enable it to be heard.";
      }
      return kind === "camera" ? "Camera could not be started." : "Microphone could not be started.";
    }
    function localVideoEl() { return isPatient ? patientEl : therapistEl; }
    function remoteVideoEl() { return isPatient ? therapistEl : patientEl; }
    function refreshMediaIcons() {
      camBtn.classList.toggle("off", !cameraOn);
      camBtn.innerHTML = cameraOn ? ${JSON.stringify(camSvg(false))} : ${JSON.stringify(camSvg(true))};
      micBtn.classList.toggle("off", !micOn);
      micBtn.innerHTML = micOn ? ${JSON.stringify(micSvg(false))} : ${JSON.stringify(micSvg(true))};
    }
    function syncLocalVisibility() {
      if (isPatient) {
        patientEl.classList.toggle("on", cameraOn);
        if (cameraOn) hidePlaceholder();
        else showCamOffPlaceholder();
      } else {
        therapistEl.classList.toggle("hidden", !cameraOn);
        pipOff.hidden = false;
        if (cameraOn) {
          pipOff.hidden = true;
        } else {
          pipOff.innerHTML = '<div class="avatar sm">${selfInitials}</div><span>Camera off</span>';
        }
      }
      if (!cameraOn && localVideoEl()) localVideoEl().removeAttribute("srcObject");
    }
    function applySpeaker() {
      const gain = speakerOn ? volume : 0;
      if (!room) return;
      room.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          (pub.track && pub.track.attachedElements || []).forEach((el) => {
            el.muted = !speakerOn || volume === 0;
            el.volume = gain;
          });
        });
      });
      if (speakerOn && volume > 0) room.startAudio();
      refreshSpeakerIcons();
    }
    function refreshSpeakerIcons() {
      const off = !speakerOn;
      speakerBtn.classList.toggle("off", off);
      speakerBtn.innerHTML = off ? ${JSON.stringify(speakerSvg(true))} : ${JSON.stringify(speakerSvg(false))};
    }
    function setSheet(open) {
      sheetOpen = open;
      sheet.classList.toggle("hidden", !open);
      chatBtn.classList.toggle("active", open);
    }
    async function enableMedia() {
      try {
        await room.localParticipant.setCameraEnabled(!!cfg.preferCam);
        cameraOn = !!cfg.preferCam;
        if (cameraOn) {
          const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (cam && cam.track) cam.track.attach(localVideoEl());
        }
        syncLocalVisibility();
      } catch (err) {
        cameraOn = false;
        syncLocalVisibility();
        alertEl.textContent = permissionText("camera", err);
        post("permission-camera");
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(!!cfg.preferMic);
        micOn = !!cfg.preferMic;
      } catch (err) {
        micOn = false;
        alertEl.textContent = (alertEl.textContent ? alertEl.textContent + " " : "") + permissionText("microphone", err);
        post("permission-mic");
      }
      refreshMediaIcons();
    }
    function scheduleRefresh(expiresAt) {
      clearTimeout(refreshTimer);
      const wait = Math.max(5000, new Date(expiresAt).getTime() - Date.now() - 45000);
      refreshTimer = setTimeout(() => { if (!leaving) post("need-token"); }, wait);
    }
    async function connect(next) {
      Object.assign(cfg, next || {});
      replacing = true;
      if (room) { try { await room.disconnect(); } catch (e) {} }
      replacing = false;
      room = new Room({ adaptiveStream: true, dynacast: true });
      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Video) {
          track.attach(remoteVideoEl());
          if (isPatient) {
            therapistEl.classList.remove("hidden");
            pipOff.hidden = true;
          } else {
            patientEl.classList.add("on");
            if (!isPatient) hidePlaceholder();
          }
          if (participant && participant.name) document.getElementById("title").textContent = participant.name;
          if (isPatient && !cameraOn) showCamOffPlaceholder();
          startClock();
        }
        if (track.kind === Track.Kind.Audio) {
          const els = track.attach();
          els.forEach((el) => {
            el.muted = !speakerOn || volume === 0;
            el.volume = speakerOn ? volume : 0;
          });
          if (speakerOn && volume > 0) room.startAudio();
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
        if (track.kind === Track.Kind.Video) {
          if (isPatient) {
            pipOff.hidden = false;
            pipOff.textContent = "Waiting…";
          } else {
            patientEl.classList.remove("on");
            showStatusPlaceholder("Waiting for the patient", "They will appear here when they join");
          }
        }
      });
      room.on(RoomEvent.Reconnecting, () => showStatusPlaceholder("Reconnecting…", "Hang tight"));
      room.on(RoomEvent.Reconnected, () => {
        if (isPatient && !cameraOn) showCamOffPlaceholder();
        else if (!room.remoteParticipants.size && !isPatient) {
          showStatusPlaceholder("Waiting for the patient", "They will appear here when they join");
        }
      });
      room.on(RoomEvent.Disconnected, (reason) => {
        if (leaving || replacing) return;
        if (reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED) {
          showStatusPlaceholder("This consultation has ended", "");
          post("ended");
          return;
        }
        if (reason !== DisconnectReason.CLIENT_INITIATED) post("need-token");
      });
      showStatusPlaceholder("Connecting…", "Setting up your consultation");
      try {
        await room.connect(cfg.url, cfg.token);
      } catch (err) {
        showStatusPlaceholder("Could not connect", "Check your connection and try again");
        post("failed", { message: String(err && err.message || err) });
        return;
      }
      await enableMedia();
      if (!room.remoteParticipants.size) {
        if (isPatient) {
          if (cameraOn) hidePlaceholder();
          else showCamOffPlaceholder();
        } else {
          showStatusPlaceholder("Waiting for the patient", "They will appear here when they join");
        }
      } else if (isPatient && !cameraOn) {
        showCamOffPlaceholder();
      }
      if (room.remoteParticipants.size) startClock();
      scheduleRefresh(cfg.tokenExpiresAt);
      refreshSpeakerIcons();
      refreshMediaIcons();
    }
    window.__strideRefresh = function (payload) { connect(payload); };
    window.__strideHangUp = async function () {
      leaving = true;
      clearTimeout(refreshTimer);
      clearInterval(tickTimer);
      try { if (room) await room.disconnect(); } catch (e) {}
      post("end");
    };
    micBtn.onclick = async () => {
      if (!room) return;
      try {
        await room.localParticipant.setMicrophoneEnabled(!micOn);
        micOn = !micOn;
        refreshMediaIcons();
      } catch (err) {
        alertEl.textContent = permissionText("microphone", err);
        post("permission-mic");
      }
    };
    camBtn.onclick = async () => {
      if (!room) return;
      try {
        await room.localParticipant.setCameraEnabled(!cameraOn);
        cameraOn = !cameraOn;
        if (cameraOn) {
          const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (cam && cam.track) cam.track.attach(localVideoEl());
        }
        refreshMediaIcons();
        syncLocalVisibility();
      } catch (err) {
        alertEl.textContent = permissionText("camera", err);
        post("permission-camera");
      }
    };
    function setSpeaker(next) {
      speakerOn = next;
      refreshSpeakerIcons();
      applySpeaker();
    }
    speakerBtn.onclick = () => setSpeaker(!speakerOn);
    document.getElementById("end").onclick = () => window.__strideHangUp();
    chatBtn.onclick = () => setSheet(!sheetOpen);
    document.getElementById("sheetClose").onclick = () => setSheet(false);
    refreshMediaIcons();
    connect();
  </script>
  <script type="module">
    import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm";

    const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
    const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
    const CONNECTIONS = [[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32],[27,31],[28,32]];
    const JOINTS = [0,11,12,13,14,15,16,23,24,25,26,27,28];
    const video = document.getElementById("patient");
    const canvas = document.getElementById("poseCanvas");
    const statusEl = document.getElementById("poseStatus");
    let landmarker = null;
    let raf = 0;
    let lastTs = -1;
    let enabled = true;

    function setStatus(text) {
      if (!text) {
        statusEl.classList.add("hidden");
        statusEl.textContent = "";
        return;
      }
      statusEl.textContent = text;
      statusEl.classList.remove("hidden");
    }

    function drawSkeleton(landmarks) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!landmarks || !landmarks.length) return;
      const w = canvas.width;
      const h = canvas.height;
      const mapX = (x) => x * w;
      const mapY = (y) => y * h;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#d8ff58";
      ctx.lineWidth = Math.max(3, w / 240);
      for (const [a, b] of CONNECTIONS) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) continue;
        if ((pa.visibility || 0) < 0.35 || (pb.visibility || 0) < 0.35) continue;
        ctx.beginPath();
        ctx.moveTo(mapX(pa.x), mapY(pa.y));
        ctx.lineTo(mapX(pb.x), mapY(pb.y));
        ctx.stroke();
      }
      for (const idx of JOINTS) {
        const p = landmarks[idx];
        if (!p || (p.visibility || 0) < 0.35) continue;
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), idx === 0 ? 6 : 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#10110f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function loop() {
      if (!enabled || !landmarker) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const now = performance.now();
        if (now > lastTs) {
          try {
            const result = landmarker.detectForVideo(video, now);
            lastTs = now;
            drawSkeleton(result.landmarks && result.landmarks[0] ? result.landmarks[0] : []);
            if (statusEl.textContent === "Loading skeleton…") setStatus("");
          } catch (e) {}
        }
      }
      raf = requestAnimationFrame(loop);
    }

    window.__strideSetPose = (on) => {
      enabled = !!on;
      if (!enabled) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    setStatus("Loading skeleton…");
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM);
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
      setStatus("");
      raf = requestAnimationFrame(loop);
    } catch (err) {
      setStatus("Pose overlay unavailable");
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function speakerSvg(off: boolean): string {
  if (off) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M4 10v4h3l5 4V6l-5 4H4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 9l5 5M21 9l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M4 10v4h3l5 4V6l-5 4H4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function micSvg(off: boolean): string {
  if (off) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.5V6a3 3 0 0 0-5.8-1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 10v1a7 7 0 0 0 11 5.75M12 18v3M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="2"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function camSvg(off: boolean): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="7" width="13" height="11" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M16 11l5-2.5v8L16 14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>${off ? `<path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` : ""}</svg>`;
}

function phoneSvg(): string {
  return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none"><path d="M8.5 4.5h2.2l1.1 3.2-1.6 1.2a12 12 0 0 0 4.9 4.9l1.2-1.6 3.2 1.1v2.2a2 2 0 0 1-2.2 2A15 15 0 0 1 4.5 6.7a2 2 0 0 1 2-2.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

function chatSvg(): string {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
