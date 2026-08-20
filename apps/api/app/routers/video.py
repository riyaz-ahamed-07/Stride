from __future__ import annotations

import json
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from app.video_signaling import Peer, disconnect_peer, get_room, list_rooms

router = APIRouter(tags=["Video"])

# One shared room so phone (patient) + laptop (therapist) always meet in the demo.
DEMO_ROOM_ID = "stride-demo-room"

ROOM_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Stride video visit</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #fff; }
    .wrap { display: flex; flex-direction: column; height: 100vh; height: 100dvh; }
    .remote { flex: 1; position: relative; background: #1e293b; overflow: hidden; }
    .remote video { width: 100%; height: 100%; object-fit: cover; background: #0f172a; }
    .remote-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; }
    .pip { position: absolute; right: 12px; bottom: 12px; width: 96px; height: 128px; border-radius: 12px; overflow: hidden; border: 2px solid #fff; background: #334155; z-index: 2; }
    .pip video { width: 100%; height: 100%; object-fit: cover; }
    .bar { position: absolute; left: 12px; right: 12px; top: 12px; display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,.85); padding: 8px 12px; border-radius: 999px; font-size: 13px; z-index: 2; }
    .controls { display: flex; justify-content: center; gap: 16px; padding: 16px; background: #0f172a; }
    button { border: 0; border-radius: 999px; min-width: 56px; min-height: 56px; font-size: 22px; cursor: pointer; background: #334155; color: #fff; }
    button.end { background: #ef4444; }
    button.active { background: #64748b; }
    .status { text-align: center; font-size: 13px; color: #94a3b8; padding: 0 16px 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="remote" id="remote">
      <div class="remote-placeholder" id="waiting"><div style="font-size:48px">👨‍⚕️</div><div id="waitText">Waiting for the other person…</div></div>
      <div class="bar"><span id="label">Connecting…</span><span id="timer">00:00</span></div>
      <div class="pip"><video id="local" autoplay playsinline muted></video></div>
    </div>
    <div class="controls">
      <button id="mute" type="button">🎤</button>
      <button id="cam" type="button">🎥</button>
      <button id="end" class="end" type="button">✕</button>
    </div>
    <p class="status" id="status">Starting camera…</p>
  </div>
  <script>
    const params = new URLSearchParams(location.search);
    const roomId = __ROOM_ID__;
    const displayName = params.get("name") || "Participant";
    const role = params.get("role") || "patient";
    const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/video/${roomId}`;
    const ICE = {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        {
          urls: [
            "turn:openrelay.metered.ca:80",
            "turn:openrelay.metered.ca:443",
            "turn:openrelay.metered.ca:443?transport=tcp"
          ],
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ]
    };
    const peers = new Map();
    const pendingIce = new Map();
    let localStream = null;
    let ws = null;
    let elapsed = 0;
    let micOn = false;

    const localVideo = document.getElementById("local");
    const remoteWrap = document.getElementById("remote");
    const waiting = document.getElementById("waiting");
    const label = document.getElementById("label");
    const statusEl = document.getElementById("status");
    const timerEl = document.getElementById("timer");
    const muteBtn = document.getElementById("mute");
    muteBtn.classList.add("active");
    muteBtn.textContent = "🔇";

    console.log("[Stride video] room=", roomId, "ws=", wsUrl, "role=", role);
    setInterval(() => {
      elapsed++;
      timerEl.textContent = String(Math.floor(elapsed/60)).padStart(2,"0")+":"+String(elapsed%60).padStart(2,"0");
    }, 1000);

    async function startMedia() {
      const insecure = location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1";
      if (insecure) {
        throw new Error("Camera needs HTTPS. Use the Cloudflare API URL in mobile .env.");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not available. Allow camera/mic when prompted.");
      }
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
      localVideo.srcObject = localStream;
      statusEl.textContent = "Camera ready (mic muted). Joining room…";
    }

    function remoteVideoEl() {
      let video = document.getElementById("remote-video");
      if (!video) {
        video = document.createElement("video");
        video.id = "remote-video";
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.muted = true;
        remoteWrap.insertBefore(video, remoteWrap.firstChild);
      }
      return video;
    }

    async function showRemote(stream) {
      waiting.style.display = "none";
      const video = remoteVideoEl();
      video.srcObject = stream;
      try { await video.play(); } catch (_) {}
      label.textContent = "Live visit";
      statusEl.textContent = "Connected · mic is muted (tap to unmute)";
    }

    function createPeerConnection(peerId) {
      const pc = new RTCPeerConnection(ICE);
      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      } else {
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
      }
      pc.onicecandidate = (event) => {
        if (event.candidate && ws?.readyState === 1) {
          ws.send(JSON.stringify({ type: "ice", target: peerId, candidate: event.candidate }));
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log("[Stride video] ice", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          statusEl.textContent = "Media connected · mic muted";
        }
        if (pc.iceConnectionState === "failed") {
          statusEl.textContent = "Connection failed. Leave and rejoin on both devices.";
        }
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        showRemote(stream);
      };
      peers.set(peerId, pc);
      return pc;
    }

    async function flushIce(from) {
      const pc = peers.get(from);
      const queued = pendingIce.get(from) || [];
      pendingIce.set(from, []);
      for (const candidate of queued) {
        try { await pc.addIceCandidate(candidate); } catch (_) {}
      }
    }

    async function handleOffer(from, sdp) {
      let pc = peers.get(from);
      if (!pc) pc = createPeerConnection(from);
      await pc.setRemoteDescription(sdp);
      await flushIce(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "answer", target: from, sdp: pc.localDescription }));
    }

    async function handleAnswer(from, sdp) {
      const pc = peers.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(sdp);
      await flushIce(from);
    }

    async function handleIce(from, candidate) {
      const pc = peers.get(from);
      if (!pc || !pc.remoteDescription) {
        const queued = pendingIce.get(from) || [];
        queued.push(candidate);
        pendingIce.set(from, queued);
        return;
      }
      try { await pc.addIceCandidate(candidate); } catch (_) {}
    }

    // Only the person ALREADY in the room offers when someone joins (avoids glare).
    async function callPeer(peerId) {
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "offer", target: peerId, sdp: pc.localDescription }));
    }

    function connectSocket() {
      statusEl.textContent = "Connecting signaling…";
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        statusEl.textContent = "In room. Waiting for peer…";
        ws.send(JSON.stringify({ type: "join", name: displayName, role }));
      };
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        console.log("[Stride video] signal", msg.type, msg);
        if (msg.type === "welcome") {
          // Joiner waits — existing peers will send offers via peer-joined on their side.
          statusEl.textContent = msg.peers.length
            ? "Peer already here — waiting for their offer…"
            : "Waiting for the other person to join…";
        }
        if (msg.type === "peer-joined") {
          statusEl.textContent = `${msg.name || "Peer"} joined — connecting…`;
          await callPeer(msg.id);
        }
        if (msg.type === "offer") await handleOffer(msg.from, msg.sdp);
        if (msg.type === "answer") await handleAnswer(msg.from, msg.sdp);
        if (msg.type === "ice") await handleIce(msg.from, msg.candidate);
        if (msg.type === "peer-left") {
          const pc = peers.get(msg.id);
          if (pc) { pc.close(); peers.delete(msg.id); }
          if (!peers.size) {
            waiting.style.display = "flex";
            statusEl.textContent = "Peer left the call.";
          }
        }
      };
      ws.onerror = () => { statusEl.textContent = "WebSocket error — check API tunnel."; };
      ws.onclose = () => { statusEl.textContent = "Disconnected from signaling."; };
    }

    document.getElementById("mute").onclick = () => {
      const track = localStream?.getAudioTracks()[0];
      if (!track) return;
      micOn = !micOn;
      track.enabled = micOn;
      muteBtn.classList.toggle("active", !micOn);
      muteBtn.textContent = micOn ? "🎤" : "🔇";
    };
    document.getElementById("cam").onclick = () => {
      const track = localStream?.getVideoTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      document.getElementById("cam").classList.toggle("active", !track.enabled);
    };
    document.getElementById("end").onclick = () => {
      peers.forEach((pc) => pc.close());
      localStream?.getTracks().forEach((t) => t.stop());
      ws?.close();
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage("end");
      else history.back();
    };

    (async () => {
      try {
        await startMedia();
      } catch (err) {
        statusEl.textContent = err.message || "Could not start camera.";
        console.error(err);
      }
      connectSocket();
    })();
  </script>
</body>
</html>
"""


@router.get("/video/debug")
def video_debug() -> dict:
    return {"rooms": list_rooms()}


@router.get("/video/room/{appointment_id}", response_class=HTMLResponse)
def video_room_page(appointment_id: str) -> HTMLResponse:
    # Ignore appointment_id for demo — always the shared room.
    html = ROOM_HTML.replace("__ROOM_ID__", json.dumps(DEMO_ROOM_ID))
    return HTMLResponse(html)


@router.websocket("/ws/video/{room_id}")
async def video_socket(websocket: WebSocket, room_id: str) -> None:
    await websocket.accept()
    peer_id = str(uuid4())
    # Normalize any appointment-* id to the shared demo room.
    if room_id.startswith("appointment-") or room_id == "demo":
        room_id = DEMO_ROOM_ID
    room = get_room(room_id)
    name = "Participant"
    role = "patient"

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            msg_type = message.get("type")

            if msg_type == "join":
                name = str(message.get("name") or name)
                role = str(message.get("role") or role)
                room.peers[peer_id] = Peer(id=peer_id, name=name, role=role, socket=websocket)
                print(f"[video] {name} ({role}) joined {room_id} · peers={len(room.peers)}")
                await websocket.send_text(
                    json.dumps({"type": "welcome", "id": peer_id, "peers": room.snapshot(exclude=peer_id)})
                )
                await room.broadcast(
                    {"type": "peer-joined", "id": peer_id, "name": name, "role": role},
                    exclude=peer_id,
                )
                continue

            if peer_id not in room.peers:
                continue

            target = message.get("target")
            if msg_type in {"offer", "answer"}:
                payload = {"type": msg_type, "from": peer_id, "sdp": message.get("sdp")}
                await room.send(str(target), payload)
            elif msg_type == "ice":
                payload = {"type": "ice", "from": peer_id, "candidate": message.get("candidate")}
                await room.send(str(target), payload)

    except WebSocketDisconnect:
        pass
    finally:
        print(f"[video] {name} left {room_id}")
        await disconnect_peer(room_id, peer_id)
