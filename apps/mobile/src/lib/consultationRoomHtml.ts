import type { ConsultationJoin } from "../types";

const LIVEKIT_CLIENT =
  "https://cdn.jsdelivr.net/npm/livekit-client@2.22.3/dist/livekit-client.umd.js";

export function buildConsultationHtml(join: ConsultationJoin): string {
  const peerName =
    join.role === "patient"
      ? join.consultation.therapist.full_name
      : join.consultation.patient.full_name;
  const config = JSON.stringify({
    url: join.livekit_url,
    token: join.token,
    tokenExpiresAt: join.token_expires_at,
    role: join.role,
    displayName: join.display_name,
    peerName,
    reason: join.consultation.reason,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Stride consultation</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #020617; color: #f8fafc; }
    .wrap { min-height: 100dvh; display: flex; flex-direction: column; }
    .stage { flex: 1; position: relative; background: #1e293b; min-height: 240px; }
    video.remote { width: 100%; height: 100%; object-fit: cover; }
    .placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; font-size: 18px; line-height: 1.45; }
    .overlay { position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 10px 14px; border-radius: 999px; background: rgba(15,23,42,.8); }
    .overlay strong { display: block; }
    .pip { position: absolute; top: 12px; right: 12px; width: 96px; height: 128px; border-radius: 12px; overflow: hidden; border: 2px solid #fff; background: #334155; z-index: 2; }
    .pip video { width: 100%; height: 100%; object-fit: cover; }
    .pip .off { height: 100%; display: grid; place-items: center; font-size: 12px; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 16px; }
    button { border: 0; border-radius: 999px; min-height: 48px; padding: 0 16px; font-size: 16px; font-weight: 700; background: #334155; color: #fff; }
    button.off { background: #7f1d1d; }
    button.end { background: #ef4444; }
    .alert { color: #fecaca; padding: 0 16px 12px; font-size: 15px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="stage" id="stage">
      <video class="remote" id="remote" autoplay playsinline></video>
      <div class="placeholder" id="placeholder">Connecting to the consultation…</div>
      <div class="overlay"><strong id="peer">${escapeHtml(peerName)}</strong><span id="status">Connecting</span></div>
      <div class="pip"><video id="local" autoplay playsinline muted></video><div class="off" id="localOff" hidden>Camera off</div></div>
    </div>
    <p class="alert" id="alert"></p>
    <div class="controls">
      <button type="button" id="mic">Microphone on</button>
      <button type="button" id="cam">Camera on</button>
      <button type="button" id="speaker">Speaker on</button>
      <button type="button" id="end" class="end">Leave consultation</button>
    </div>
  </div>
  <script>window.__STRIDE_CONSULT__ = ${config};</script>
  <script src="${LIVEKIT_CLIENT}"></script>
  <script>
    const cfg = window.__STRIDE_CONSULT__;
    const { Room, RoomEvent, Track, DisconnectReason } = LivekitClient;
    const remote = document.getElementById("remote");
    const local = document.getElementById("local");
    const localOff = document.getElementById("localOff");
    const placeholder = document.getElementById("placeholder");
    const statusEl = document.getElementById("status");
    const alertEl = document.getElementById("alert");
    const micBtn = document.getElementById("mic");
    const camBtn = document.getElementById("cam");
    const speakerBtn = document.getElementById("speaker");
    let room = null;
    let leaving = false;
    let replacing = false;
    let cameraOn = true;
    let micOn = true;
    let speakerOn = true;
    let refreshTimer = 0;

    function post(type, extra) {
      const payload = JSON.stringify(Object.assign({ type: type }, extra || {}));
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
    }
    function setStatus(text) { statusEl.textContent = text; placeholder.textContent = text; }
    function permissionText(kind, err) {
      const name = err && err.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        return kind === "camera"
          ? "Camera permission was denied. Enable it to be seen."
          : "Microphone permission was denied. Enable it to be heard.";
      }
      return kind === "camera" ? "Camera could not be started." : "Microphone could not be started.";
    }
    function applySpeaker() {
      if (!room) return;
      room.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          (pub.track && pub.track.attachedElements || []).forEach((el) => { el.muted = !speakerOn; });
        });
      });
      if (speakerOn) room.startAudio();
    }
    async function enableMedia() {
      try {
        await room.localParticipant.setCameraEnabled(true);
        cameraOn = true;
        camBtn.textContent = "Camera on";
        camBtn.classList.remove("off");
        localOff.hidden = true;
        const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (cam && cam.track) cam.track.attach(local);
      } catch (err) {
        cameraOn = false;
        camBtn.textContent = "Camera off";
        camBtn.classList.add("off");
        localOff.hidden = false;
        alertEl.textContent = permissionText("camera", err);
        post("permission-camera");
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        micOn = true;
        micBtn.textContent = "Microphone on";
        micBtn.classList.remove("off");
      } catch (err) {
        micOn = false;
        micBtn.textContent = "Microphone off";
        micBtn.classList.add("off");
        alertEl.textContent = (alertEl.textContent ? alertEl.textContent + " " : "") + permissionText("microphone", err);
        post("permission-mic");
      }
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
          track.attach(remote);
          placeholder.style.display = "none";
          document.getElementById("peer").textContent = participant.name || cfg.peerName;
          setStatus("In consultation");
        }
        if (track.kind === Track.Kind.Audio) {
          const els = track.attach();
          els.forEach((el) => { el.muted = !speakerOn; });
          if (speakerOn) room.startAudio();
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
        if (track.kind === Track.Kind.Video) {
          placeholder.style.display = "flex";
          setStatus("Waiting for the other person.");
        }
      });
      room.on(RoomEvent.Reconnecting, () => setStatus("Reconnecting…"));
      room.on(RoomEvent.Reconnected, () => setStatus(room.remoteParticipants.size ? "In consultation" : "Waiting for the other person."));
      room.on(RoomEvent.Disconnected, (reason) => {
        if (leaving || replacing) return;
        if (reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED) {
          setStatus("This consultation has ended.");
          post("ended");
          return;
        }
        if (reason !== DisconnectReason.CLIENT_INITIATED) post("need-token");
      });
      setStatus("Connecting to the consultation…");
      try {
        await room.connect(cfg.url, cfg.token);
      } catch (err) {
        setStatus("Could not connect to the consultation room.");
        post("failed", { message: String(err && err.message || err) });
        return;
      }
      await enableMedia();
      setStatus(room.remoteParticipants.size ? "In consultation" : (cfg.role === "patient" ? "Waiting for your physiotherapist." : "Waiting for the patient."));
      scheduleRefresh(cfg.tokenExpiresAt);
    }
    window.__strideRefresh = function (payload) { connect(payload); };
    window.__strideHangUp = async function () {
      leaving = true;
      clearTimeout(refreshTimer);
      try { if (room) await room.disconnect(); } catch (e) {}
      post("end");
    };
    micBtn.onclick = async () => {
      if (!room) return;
      try {
        await room.localParticipant.setMicrophoneEnabled(!micOn);
        micOn = !micOn;
        micBtn.textContent = micOn ? "Microphone on" : "Microphone off";
        micBtn.classList.toggle("off", !micOn);
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
        camBtn.textContent = cameraOn ? "Camera on" : "Camera off";
        camBtn.classList.toggle("off", !cameraOn);
        localOff.hidden = cameraOn;
      } catch (err) {
        alertEl.textContent = permissionText("camera", err);
        post("permission-camera");
      }
    };
    speakerBtn.onclick = () => {
      speakerOn = !speakerOn;
      speakerBtn.textContent = speakerOn ? "Speaker on" : "Speaker off";
      speakerBtn.classList.toggle("off", !speakerOn);
      applySpeaker();
    };
    document.getElementById("end").onclick = () => window.__strideHangUp();
    connect();
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
