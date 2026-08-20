"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

type Props = {
  appointmentId: string;
  role: "patient" | "physiotherapist";
  displayName: string;
  peerLabel: string;
  backHref: string;
};

const DEMO_ROOM_ID = "stride-demo-room";

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

function wsBase() {
  return API_URL.replace(/^http/, "ws");
}

export function VideoRoom({ appointmentId, role, displayName, peerLabel, backHref }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videoOff, setVideoOff] = useState(false);
  const [status, setStatus] = useState("Starting camera…");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function showRemote(stream: MediaStream) {
      const video = remoteRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      try {
        await video.play();
      } catch {
        /* autoplay */
      }
      setConnected(true);
      setStatus("Connected · mic is muted");
    }

    async function flushIce(from: string) {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      const queued = pendingIceRef.current.get(from) ?? [];
      pendingIceRef.current.set(from, []);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      }
    }

    function createPeerConnection(peerId: string) {
      const pc = new RTCPeerConnection(ICE);
      streamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: "ice", target: peerId, candidate: event.candidate }),
          );
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log("[Stride video] ice", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          setStatus("Connection failed. Leave and rejoin on both sides.");
        }
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        void showRemote(stream);
      };
      peersRef.current.set(peerId, pc);
      return pc;
    }

    async function handleOffer(from: string, sdp: RTCSessionDescriptionInit) {
      let pc = peersRef.current.get(from);
      if (!pc) pc = createPeerConnection(from);
      await pc.setRemoteDescription(sdp);
      await flushIce(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsRef.current?.send(
        JSON.stringify({ type: "answer", target: from, sdp: pc.localDescription }),
      );
    }

    async function handleAnswer(from: string, sdp: RTCSessionDescriptionInit) {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(sdp);
      await flushIce(from);
    }

    async function handleIce(from: string, candidate: RTCIceCandidateInit) {
      const pc = peersRef.current.get(from);
      if (!pc || !pc.remoteDescription) {
        const queued = pendingIceRef.current.get(from) ?? [];
        queued.push(candidate);
        pendingIceRef.current.set(from, queued);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore */
      }
    }

    async function callPeer(peerId: string) {
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current?.send(
        JSON.stringify({ type: "offer", target: peerId, sdp: pc.localDescription }),
      );
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Camera not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        setStatus("Camera ready (mic muted). Joining room…");
      } catch {
        setStatus("Could not access camera. Allow permissions in Chrome/Edge.");
        return;
      }

      const wsUrl = `${wsBase()}/ws/video/${DEMO_ROOM_ID}`;
      console.log("[Stride video] connecting", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", name: displayName, role }));
      };
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          id?: string;
          name?: string;
          peers?: { id: string }[];
          from?: string;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };
        console.log("[Stride video] signal", msg.type, msg);
        if (msg.type === "welcome") {
          setStatus(
            msg.peers?.length
              ? "Peer already here — waiting for their offer…"
              : `Waiting for ${peerLabel}…`,
          );
        }
        if (msg.type === "peer-joined" && msg.id) {
          setStatus(`${msg.name || peerLabel} joined — connecting…`);
          await callPeer(msg.id);
        }
        if (msg.type === "offer" && msg.from && msg.sdp) await handleOffer(msg.from, msg.sdp);
        if (msg.type === "answer" && msg.from && msg.sdp) await handleAnswer(msg.from, msg.sdp);
        if (msg.type === "ice" && msg.from && msg.candidate) await handleIce(msg.from, msg.candidate);
        if (msg.type === "peer-left" && msg.id) {
          peersRef.current.get(msg.id)?.close();
          peersRef.current.delete(msg.id);
          setConnected(false);
          setStatus(`${peerLabel} left the call.`);
        }
      };
      ws.onerror = () => setStatus("WebSocket error — is the API running?");
      ws.onclose = () => setStatus("Disconnected.");
    }

    start();

    return () => {
      cancelled = true;
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current?.close();
    };
  }, [displayName, peerLabel, role]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !videoOff;
    });
  }, [videoOff]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="video-room">
      <div className="video-remote">
        {!connected ? (
          <div className="video-remote-placeholder" aria-hidden="true">
            <div className="video-remote-avatar">{role === "patient" ? "👨‍⚕️" : "🧑"}</div>
            <p>{status}</p>
          </div>
        ) : null}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          muted
          className={connected ? "video-remote-feed" : "hidden"}
        />
        <div className="video-remote-overlay">
          <div>
            <strong>{connected ? peerLabel : "Stride visit"}</strong>
            <span className="video-live-dot" /> {connected ? "Live" : "Waiting"}
          </div>
          <span className="video-timer">
            {mins}:{secs}
          </span>
        </div>
        <div className="video-pip">
          <video ref={localRef} autoPlay playsInline muted className={videoOff ? "hidden" : ""} />
          {videoOff ? <div className="video-pip-fallback">Camera off</div> : null}
        </div>
      </div>

      <div className="video-controls">
        <button type="button" className={muted ? "active" : ""} onClick={() => setMuted((v) => !v)} aria-label="Mute">
          {muted ? "🔇" : "🎤"}
        </button>
        <button
          type="button"
          className={videoOff ? "active" : ""}
          onClick={() => setVideoOff((v) => !v)}
          aria-label="Toggle camera"
        >
          {videoOff ? "📷" : "🎥"}
        </button>
        <Link className="video-end" href={backHref} aria-label="End call">
          ✕
        </Link>
      </div>

      <p className="video-demo-note">
        Mic starts muted to avoid echo. Shared room · {status}
      </p>
      <p className="video-role-note">You joined as {role === "patient" ? "patient" : "physiotherapist"}</p>
    </div>
  );
}
