"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ConnectionState,
  DisconnectReason,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { api } from "@/lib/api";
import { formatVisitWhen } from "@/lib/care";
import {
  dosageLabel,
  peerFor,
  type ConsultationJoin,
} from "@/lib/consultation";
import { ConsultPoseOverlay } from "@/components/ConsultPoseOverlay";

type Props = {
  appointmentId: string;
  variant: "patient" | "therapist";
  backHref: string;
};

type Phase =
  | "loading"
  | "lobby"
  | "connecting"
  | "waiting"
  | "live"
  | "reconnecting"
  | "failed"
  | "ended";

function permissionCopy(err: unknown, kind: "camera" | "microphone"): string {
  const name =
    err instanceof DOMException
      ? err.name
      : err instanceof Error
        ? err.name
        : "";
  const device = kind === "camera" ? "Camera" : "Microphone";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return `${device} permission was denied. Enable it in the browser to ${kind === "camera" ? "be seen" : "be heard"}.`;
  }
  if (name === "NotFoundError") {
    return `No ${kind} was found on this device.`;
  }
  return `${device} could not be started. Check permissions and try again.`;
}

function disconnectEndedCall(reason?: DisconnectReason): boolean {
  return (
    reason === DisconnectReason.ROOM_DELETED ||
    reason === DisconnectReason.PARTICIPANT_REMOVED
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function IconMic({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      {off ? (
        <>
          <path
            d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.5V6a3 3 0 0 0-5.8-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M5 10v1a7 7 0 0 0 11 5.75M19 11v0M12 18v3M4 4l16 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="9"
            y="3"
            width="6"
            height="11"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M5 11a7 7 0 0 0 14 0M12 18v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function IconSpeaker({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M4 10v4h3l5 4V6l-5 4H4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {off ? (
        <path
          d="M16 9l5 5M21 9l-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden>
      <path
        d="M8.5 4.5h2.2l1.1 3.2-1.6 1.2a12 12 0 0 0 4.9 4.9l1.2-1.6 3.2 1.1v2.2a2 2 0 0 1-2.2 2A15 15 0 0 1 4.5 6.7a2 2 0 0 1 2-2.2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCamera({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <rect
        x="3"
        y="7"
        width="13"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 11l5-2.5v8L16 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {off ? (
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4.5L15 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConsultationRoom({ appointmentId, variant, backHref }: Props) {
  const patientRef = useRef<HTMLVideoElement>(null);
  const therapistRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const leftRef = useRef(false);
  const speakerRef = useRef(true);
  const volumeRef = useRef(0.85);
  const preferCamRef = useRef(true);
  const preferMicRef = useRef(true);
  const refreshTimer = useRef<number>(0);
  const replacingRef = useRef(false);
  const liveStartedAt = useRef<number | null>(null);

  const [join, setJoin] = useState<ConsultationJoin | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [micError, setMicError] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [poseOn] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );

  const peer = join ? peerFor(join) : null;
  const consult = join?.consultation;
  const headerName = useMemo(() => {
    if (variant === "patient") {
      return (
        consult?.therapist.full_name ||
        remoteName ||
        peer?.full_name ||
        "Physiotherapist"
      );
    }
    return (
      consult?.patient.full_name || remoteName || peer?.full_name || "Patient"
    );
  }, [
    consult?.patient.full_name,
    consult?.therapist.full_name,
    peer?.full_name,
    remoteName,
    variant,
  ]);
  const headerRole = useMemo(() => {
    if (variant === "patient") {
      return (
        consult?.therapist.specialty ||
        consult?.therapist.clinic_name ||
        "Physiotherapist"
      );
    }
    return consult?.reason || "Patient";
  }, [
    consult?.reason,
    consult?.therapist.clinic_name,
    consult?.therapist.specialty,
    variant,
  ]);

  const patientVideoReady = variant === "patient" ? cameraOn : phase === "live";
  const therapistVideoReady =
    variant === "therapist" ? cameraOn : phase === "live";

  const applyAudioOut = useCallback((enabled: boolean, level: number) => {
    speakerRef.current = enabled;
    volumeRef.current = level;
    const gain = enabled ? level : 0;
    if (audioRef.current) {
      audioRef.current.muted = !enabled || level === 0;
      audioRef.current.volume = gain;
    }
    const room = roomRef.current;
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) {
        (publication.track?.attachedElements ?? []).forEach((el) => {
          if (el instanceof HTMLMediaElement) {
            el.muted = !enabled || level === 0;
            el.volume = gain;
          }
        });
      }
    }
    if (enabled && level > 0) void room.startAudio();
  }, []);

  const attachLocalCamera = useCallback(
    (track: { attach: (el: HTMLMediaElement) => HTMLMediaElement }) => {
      const el =
        variant === "patient" ? patientRef.current : therapistRef.current;
      if (el) track.attach(el);
    },
    [variant],
  );

  const attachRemote = useCallback(
    (track: RemoteTrack, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        const el =
          variant === "patient" ? therapistRef.current : patientRef.current;
        if (el) track.attach(el);
        setRemoteName(participant.name || "");
        setPhase("live");
        if (!liveStartedAt.current) liveStartedAt.current = Date.now();
      }
      if (track.kind === Track.Kind.Audio) {
        const el = audioRef.current;
        if (el) {
          track.attach(el);
          el.muted = !speakerRef.current || volumeRef.current === 0;
          el.volume = speakerRef.current ? volumeRef.current : 0;
          if (speakerRef.current && volumeRef.current > 0) {
            void roomRef.current?.startAudio();
          }
        }
      }
    },
    [variant],
  );

  const connectRoom = useCallback(
    async (payload: ConsultationJoin) => {
      setJoin(payload);
      setPhase("connecting");
      setError("");
      const previous = roomRef.current;
      if (previous) {
        replacingRef.current = true;
        await previous.disconnect();
        replacingRef.current = false;
      }
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const syncRemote = () => {
        const others = [...room.remoteParticipants.values()];
        const named = others.find((item) => item.name)?.name;
        if (named) setRemoteName(named);
        if (others.length === 0 && !leftRef.current) {
          setPhase((current) =>
            current === "failed" || current === "ended" ? current : "waiting",
          );
        }
      };

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          participant: RemoteParticipant,
        ) => {
          attachRemote(track, participant);
        },
      );
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
        if (track.kind === Track.Kind.Video) {
          if (!leftRef.current) setPhase("waiting");
        }
      });
      room.on(RoomEvent.ParticipantConnected, syncRemote);
      room.on(RoomEvent.ParticipantDisconnected, () => {
        syncRemote();
        if (!leftRef.current) setPhase("waiting");
      });
      room.on(RoomEvent.Reconnecting, () => {
        if (!leftRef.current) setPhase("reconnecting");
      });
      room.on(RoomEvent.Reconnected, () => {
        if (!leftRef.current)
          setPhase(room.remoteParticipants.size ? "live" : "waiting");
      });
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setConnection(state);
      });
      room.on(RoomEvent.MediaDevicesError, (err: Error) => {
        const message = err.message.toLowerCase();
        if (message.includes("audio") || message.includes("microphone")) {
          setMicError(permissionCopy(err, "microphone"));
          setMicOn(false);
        } else {
          setCameraError(permissionCopy(err, "camera"));
          setCameraOn(false);
        }
      });
      room.on(
        RoomEvent.LocalTrackPublished,
        (publication: LocalTrackPublication) => {
          if (publication.source === Track.Source.Camera && publication.track) {
            attachLocalCamera(publication.track);
          }
        },
      );
      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (leftRef.current || replacingRef.current) return;
        if (disconnectEndedCall(reason)) {
          setPhase("ended");
          setError("The physiotherapist ended this consultation.");
          return;
        }
        if (reason === DisconnectReason.CLIENT_INITIATED) return;
        setPhase("reconnecting");
        void (async () => {
          try {
            const next = await api<ConsultationJoin>(
              `/video/consultations/${appointmentId}/join`,
              {
                method: "POST",
              },
            );
            if (leftRef.current) return;
            await connectRoom(next);
          } catch (err) {
            if (leftRef.current) return;
            setPhase("failed");
            setError(
              err instanceof Error
                ? err.message
                : "The consultation connection was lost.",
            );
          }
        })();
      });

      try {
        await room.connect(payload.livekit_url, payload.token);
      } catch (err) {
        setPhase("failed");
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the consultation room.",
        );
        return;
      }
      if (leftRef.current) {
        await room.disconnect();
        return;
      }

      try {
        await room.localParticipant.setCameraEnabled(preferCamRef.current);
        setCameraOn(preferCamRef.current);
        setCameraError("");
        if (preferCamRef.current) {
          const cam = room.localParticipant.getTrackPublication(
            Track.Source.Camera,
          );
          if (cam?.track) attachLocalCamera(cam.track);
        }
      } catch (err) {
        setCameraOn(false);
        setCameraError(permissionCopy(err, "camera"));
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(preferMicRef.current);
        setMicOn(preferMicRef.current);
        setMicError("");
      } catch (err) {
        setMicOn(false);
        setMicError(permissionCopy(err, "microphone"));
      }

      syncRemote();
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track)
            attachRemote(publication.track as RemoteTrack, participant);
        });
      });
      setPhase(room.remoteParticipants.size ? "live" : "waiting");
      if (room.remoteParticipants.size && !liveStartedAt.current) {
        liveStartedAt.current = Date.now();
      }

      window.clearTimeout(refreshTimer.current);
      const refreshIn =
        new Date(payload.token_expires_at).getTime() - Date.now() - 45_000;
      refreshTimer.current = window.setTimeout(
        () => {
          if (leftRef.current) return;
          void api<ConsultationJoin>(
            `/video/consultations/${appointmentId}/join`,
            { method: "POST" },
          )
            .then((next) => connectRoom(next))
            .catch(() => {
              if (!leftRef.current) {
                setPhase("failed");
                setError(
                  "Consultation access expired. Rejoin from your appointments.",
                );
              }
            });
        },
        Math.max(5_000, refreshIn),
      );
    },
    [appointmentId, attachLocalCamera, attachRemote],
  );

  useEffect(() => {
    leftRef.current = false;
    let cancelled = false;
    setPhase("loading");
    api<ConsultationJoin>(`/video/consultations/${appointmentId}/join`, {
      method: "POST",
    })
      .then((payload) => {
        if (cancelled) return;
        setJoin(payload);
        setPhase("lobby");
        setError("");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPhase("failed");
        setError(err.message || "Could not open this consultation.");
      });
    return () => {
      cancelled = true;
      leftRef.current = true;
      window.clearTimeout(refreshTimer.current);
      lobbyStreamRef.current?.getTracks().forEach((t) => t.stop());
      lobbyStreamRef.current = null;
      const room = roomRef.current;
      roomRef.current = null;
      void room?.disconnect();
    };
  }, [appointmentId]);

  useEffect(() => {
    if (phase !== "lobby") return;
    let cancelled = false;
    async function startPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: preferCamRef.current,
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        lobbyStreamRef.current?.getTracks().forEach((t) => t.stop());
        lobbyStreamRef.current = stream;
        const el = lobbyVideoRef.current;
        if (el) {
          el.srcObject = stream;
          void el.play().catch(() => undefined);
        }
        setCameraError("");
      } catch (err) {
        if (!cancelled) {
          setCameraOn(false);
          preferCamRef.current = false;
          setCameraError(permissionCopy(err, "camera"));
        }
      }
    }
    if (preferCamRef.current && cameraOn) {
      void startPreview();
    } else {
      lobbyStreamRef.current?.getTracks().forEach((t) => t.stop());
      lobbyStreamRef.current = null;
      if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = null;
    }
    return () => {
      cancelled = true;
    };
  }, [phase, cameraOn]);

  useEffect(() => {
    if (phase !== "live") return;
    if (!liveStartedAt.current) liveStartedAt.current = Date.now();
    const tick = window.setInterval(() => {
      if (!liveStartedAt.current) return;
      setElapsed(Math.floor((Date.now() - liveStartedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [phase]);

  function stopLobbyPreview() {
    lobbyStreamRef.current?.getTracks().forEach((t) => t.stop());
    lobbyStreamRef.current = null;
    if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = null;
  }

  async function toggleCamera() {
    if (phase === "lobby") {
      const next = !cameraOn;
      preferCamRef.current = next;
      setCameraOn(next);
      setCameraError("");
      if (!next) stopLobbyPreview();
      return;
    }
    const room = roomRef.current;
    if (!room) return;
    const next = !cameraOn;
    try {
      await room.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
      setCameraError("");
      if (next) {
        const cam = room.localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
        if (cam?.track) attachLocalCamera(cam.track);
      }
    } catch (err) {
      setCameraOn(false);
      setCameraError(permissionCopy(err, "camera"));
    }
  }

  async function toggleMic() {
    if (phase === "lobby") {
      const next = !micOn;
      preferMicRef.current = next;
      setMicOn(next);
      setMicError("");
      return;
    }
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
      setMicError("");
    } catch (err) {
      setMicOn(false);
      setMicError(permissionCopy(err, "microphone"));
    }
  }

  function joinFromLobby() {
    if (!join) return;
    stopLobbyPreview();
    void connectRoom(join);
  }

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    applyAudioOut(next, 0.85);
  }

  async function leave() {
    leftRef.current = true;
    window.clearTimeout(refreshTimer.current);
    await roomRef.current?.disconnect();
    window.location.href = backHref;
  }

  async function endConsultation() {
    leftRef.current = true;
    window.clearTimeout(refreshTimer.current);
    try {
      await api(`/video/consultations/${appointmentId}/end`, {
        method: "POST",
      });
    } catch {
      /* still leave the room */
    }
    await roomRef.current?.disconnect();
    window.location.href = backHref;
  }

  const statusLabel = (() => {
    if (phase === "loading" || phase === "connecting")
      return "Connecting to the consultation…";
    if (phase === "reconnecting") return "Reconnecting…";
    if (phase === "waiting") {
      return variant === "patient"
        ? "Waiting for your physiotherapist to join."
        : "Waiting for the patient to join.";
    }
    if (phase === "live") return "In consultation";
    if (phase === "ended") return error || "This consultation has ended.";
    return error || "Could not connect to the consultation.";
  })();

  if (phase === "loading") {
    return (
      <div className="consult-shell">
        <div className="consult-state">
          <p>Opening your rehabilitation consultation…</p>
        </div>
      </div>
    );
  }

  if ((phase === "failed" || phase === "ended") && !join) {
    return (
      <div className="consult-shell">
        <div className="consult-state">
          <h1>{phase === "ended" ? "Consultation ended" : "Could not join"}</h1>
          <p>{error || "This consultation is not available."}</p>
          <Link className="btn btn-primary" href={backHref}>
            Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "lobby" && join) {
    return (
      <div className="consult-shell lobby">
        <div className="consult-lobby">
          <div className="consult-lobby-preview">
            <video
              ref={lobbyVideoRef}
              autoPlay
              playsInline
              muted
              className={`consult-lobby-video${cameraOn ? " is-on" : ""}`}
            />
            {!cameraOn ? (
              <div className="consult-lobby-cam-off">
                <div className="consult-avatar" aria-hidden>
                  {initialsFrom(join.display_name || headerName)}
                </div>
                <p>Camera is off</p>
                <span>You&apos;ll join without video until you turn it on</span>
              </div>
            ) : null}
            <div className="consult-lobby-toggles">
              <button
                type="button"
                className={`consult-ctrl size-md${micOn ? "" : " is-off"}`}
                onClick={() => void toggleMic()}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              >
                <IconMic off={!micOn} />
              </button>
              <button
                type="button"
                className={`consult-ctrl size-md${cameraOn ? "" : " is-off"}`}
                onClick={() => void toggleCamera()}
                aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
              >
                <IconCamera off={!cameraOn} />
              </button>
            </div>
            {(cameraError || micError) && (
              <div className="consult-lobby-alerts">
                {cameraError ? <p>{cameraError}</p> : null}
                {micError ? <p>{micError}</p> : null}
              </div>
            )}
          </div>
          <div className="consult-lobby-panel">
            <p className="consult-kicker">
              {variant === "patient" ? "Video visit" : "Consultation"}
            </p>
            <h1>Ready to join?</h1>
            <p className="consult-lobby-peer">
              {headerName}
              {headerRole ? ` · ${headerRole}` : ""}
            </p>
            <button
              type="button"
              className="btn btn-primary consult-lobby-join"
              onClick={joinFromLobby}
            >
              Join now
            </button>
            <Link className="consult-lobby-back" href={backHref}>
              Back to appointments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`consult-shell ${variant}`}>
      <div className="consult-stage" aria-label="Consultation video">
        <video
          ref={patientRef}
          autoPlay
          playsInline
          muted={variant === "patient"}
          className={`consult-main-feed${patientVideoReady ? " is-on" : ""}`}
        />
        <ConsultPoseOverlay
          videoRef={patientRef}
          enabled={poseOn && patientVideoReady}
          mirrored={false}
        />
        {!patientVideoReady ? (
          <div
            className={`consult-placeholder${
              variant === "patient" && !cameraOn ? " is-cam-off" : ""
            }`}
          >
            {variant === "patient" && !cameraOn ? (
              <>
                <div className="consult-avatar lg" aria-hidden>
                  {initialsFrom(join?.display_name || "You")}
                </div>
                <p>Your camera is off</p>
                <span>Tap the camera control to turn it back on</span>
              </>
            ) : (
              <p>{statusLabel}</p>
            )}
          </div>
        ) : null}

        <header className="consult-header">
          <strong>{headerName}</strong>
          <span>{headerRole}</span>
        </header>

        <div className="consult-pip" aria-label="Therapist video">
          <video
            ref={therapistRef}
            autoPlay
            playsInline
            muted={variant === "therapist"}
            className={therapistVideoReady ? "" : "hidden"}
          />
          {!therapistVideoReady ? (
            <div
              className={`consult-pip-fallback${
                variant === "therapist" && !cameraOn ? " is-cam-off" : ""
              }`}
            >
              {variant === "therapist" && !cameraOn ? (
                <>
                  <div className="consult-avatar sm" aria-hidden>
                    {initialsFrom(join?.display_name || "You")}
                  </div>
                  <span>Camera off</span>
                </>
              ) : (
                "Waiting…"
              )}
            </div>
          ) : null}
        </div>

        <audio ref={audioRef} autoPlay />

        {(cameraError || micError) && (
          <div className="consult-alerts">
            {cameraError ? <p>{cameraError}</p> : null}
            {micError ? <p>{micError}</p> : null}
          </div>
        )}

        <div className="consult-dock">
          <div className="consult-timer" aria-live="polite">
            <IconClock />
            <span>{formatElapsed(elapsed)}</span>
          </div>

          <div className="consult-controls">
            <button
              type="button"
              className={`consult-ctrl size-sm${speakerOn ? "" : " is-off"}`}
              onClick={toggleSpeaker}
              aria-label={speakerOn ? "Mute speaker" : "Unmute speaker"}
            >
              <IconSpeaker off={!speakerOn} />
            </button>
            <button
              type="button"
              className={`consult-ctrl size-md${micOn ? "" : " is-off"}`}
              onClick={() => void toggleMic()}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              <IconMic off={!micOn} />
            </button>
            <button
              type="button"
              className="consult-ctrl size-lg consult-end"
              onClick={() =>
                void (variant === "therapist" ? endConsultation() : leave())
              }
              aria-label={
                variant === "therapist"
                  ? "End consultation"
                  : "Leave consultation"
              }
            >
              <IconPhone />
            </button>
            <button
              type="button"
              className={`consult-ctrl size-md${cameraOn ? "" : " is-off"}`}
              onClick={() => void toggleCamera()}
              aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            >
              <IconCamera off={!cameraOn} />
            </button>
            <button
              type="button"
              className={`consult-ctrl size-sm${panelOpen ? " is-active" : ""}`}
              onClick={() => setPanelOpen((open) => !open)}
              aria-label="Open consultation details"
              aria-expanded={panelOpen}
            >
              <IconChat />
            </button>
          </div>
        </div>

        {panelOpen && consult ? (
          <aside className="consult-sheet" aria-label="Consultation details">
            <button
              type="button"
              className="consult-sheet-close"
              onClick={() => setPanelOpen(false)}
            >
              Close
            </button>
            {variant === "therapist" ? (
              <>
                <p className="consult-kicker">Patient</p>
                <h2>{consult.patient.full_name}</h2>
                {consult.reason ? <p>{consult.reason}</p> : null}
                <p className="consult-meta">
                  {formatVisitWhen(consult.scheduled_at)}
                </p>
                {consult.plan ? (
                  <>
                    <p className="consult-kicker">Rehabilitation plan</p>
                    <h3>{consult.plan.title}</h3>
                    {consult.plan.goal ? <p>{consult.plan.goal}</p> : null}
                    <ul className="consult-ex-list">
                      {consult.plan.items.map((item, index) => (
                        <li key={`${item.name}-${item.week_number}-${index}`}>
                          <strong>{item.name}</strong>
                          <span>{dosageLabel(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="consult-meta">
                    No rehabilitation plan is linked to this appointment.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="consult-kicker">Physiotherapist</p>
                <h2>{consult.therapist.full_name}</h2>
                {consult.therapist.clinic_name ? (
                  <p>{consult.therapist.clinic_name}</p>
                ) : null}
                {consult.plan ? (
                  <p className="consult-meta">{consult.plan.title}</p>
                ) : null}
                <p className="consult-meta">
                  Connection: {connection.replaceAll("_", " ")}
                </p>
              </>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
