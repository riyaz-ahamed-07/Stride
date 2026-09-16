"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Props = {
  appointmentId: string;
  variant: "patient" | "therapist";
  backHref: string;
};

type Phase =
  | "loading"
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

export function ConsultationRoom({ appointmentId, variant, backHref }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const leftRef = useRef(false);
  const speakerRef = useRef(true);
  const refreshTimer = useRef<number>(0);
  const replacingRef = useRef(false);

  const [join, setJoin] = useState<ConsultationJoin | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [micError, setMicError] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [connection, setConnection] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );

  const peer = join ? peerFor(join) : null;
  const consult = join?.consultation;
  const peerLabel = useMemo(() => {
    if (remoteName) return remoteName;
    if (peer?.full_name) return peer.full_name;
    return variant === "patient" ? "Physiotherapist" : "Patient";
  }, [peer?.full_name, remoteName, variant]);

  const applySpeaker = useCallback((enabled: boolean) => {
    speakerRef.current = enabled;
    if (audioRef.current) audioRef.current.muted = !enabled;
    const room = roomRef.current;
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) {
        (publication.track?.attachedElements ?? []).forEach((el) => {
          if (el instanceof HTMLMediaElement) el.muted = !enabled;
        });
      }
    }
    if (enabled) void room.startAudio();
  }, []);

  const attachRemote = useCallback(
    (track: RemoteTrack, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video && remoteRef.current) {
        track.attach(remoteRef.current);
        setRemoteName(participant.name || "");
        setPhase("live");
      }
      if (track.kind === Track.Kind.Audio) {
        const el = audioRef.current;
        if (el) {
          track.attach(el);
          el.muted = !speakerRef.current;
          if (speakerRef.current) void roomRef.current?.startAudio();
        }
      }
    },
    [],
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
          if (
            publication.source === Track.Source.Camera &&
            publication.track &&
            localRef.current
          ) {
            publication.track.attach(localRef.current);
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
        await room.localParticipant.setCameraEnabled(true);
        setCameraOn(true);
        setCameraError("");
        const cam = room.localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
        if (cam?.track && localRef.current) cam.track.attach(localRef.current);
      } catch (err) {
        setCameraOn(false);
        setCameraError(permissionCopy(err, "camera"));
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicOn(true);
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
    [appointmentId, attachRemote],
  );

  useEffect(() => {
    leftRef.current = false;
    let cancelled = false;
    api<ConsultationJoin>(`/video/consultations/${appointmentId}/join`, {
      method: "POST",
    })
      .then((payload) => {
        if (!cancelled) return connectRoom(payload);
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
      const room = roomRef.current;
      roomRef.current = null;
      void room?.disconnect();
    };
  }, [appointmentId, connectRoom]);

  async function toggleCamera() {
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
        if (cam?.track && localRef.current) cam.track.attach(localRef.current);
      }
    } catch (err) {
      setCameraOn(false);
      setCameraError(permissionCopy(err, "camera"));
    }
  }

  async function toggleMic() {
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

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    applySpeaker(next);
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
    if (phase === "live") return `${peerLabel} is in the consultation.`;
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

  return (
    <div className={`consult-shell ${variant}`}>
      <header className="consult-topbar">
        <button
          type="button"
          className="consult-back"
          onClick={() => void leave()}
        >
          ← Leave
        </button>
        <div className="consult-topbar-copy">
          <strong>
            {variant === "patient"
              ? "Rehabilitation consultation"
              : "Supervised consultation"}
          </strong>
          <span>
            {consult ? formatVisitWhen(consult.scheduled_at) : ""}
            {consult?.reason ? ` · ${consult.reason}` : ""}
          </span>
        </div>
        <span className={`consult-conn ${connection}`}>
          {connection.replaceAll("_", " ")}
        </span>
      </header>

      <div className="consult-body">
        <section className="consult-stage" aria-label="Consultation video">
          <div className="consult-remote">
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className={phase === "live" ? "consult-remote-feed" : "hidden"}
            />
            {phase !== "live" ? (
              <div className="consult-placeholder">
                <p>{statusLabel}</p>
              </div>
            ) : null}
            <div className="consult-overlay">
              <div>
                <strong>{peerLabel}</strong>
                <span>
                  {phase === "live" ? "In consultation" : statusLabel}
                </span>
              </div>
            </div>
            <div className="consult-pip">
              <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                className={cameraOn ? "" : "hidden"}
              />
              {!cameraOn ? (
                <div className="consult-pip-fallback">Camera off</div>
              ) : null}
              <span>{join?.display_name ?? "You"}</span>
            </div>
          </div>
          <audio ref={audioRef} autoPlay />

          {(cameraError || micError) && (
            <div className="consult-alerts">
              {cameraError ? <p>{cameraError}</p> : null}
              {micError ? <p>{micError}</p> : null}
            </div>
          )}

          <div className="consult-controls">
            <button
              type="button"
              className={micOn ? "" : "active"}
              onClick={() => void toggleMic()}
            >
              {micOn ? "Microphone on" : "Microphone off"}
            </button>
            <button
              type="button"
              className={cameraOn ? "" : "active"}
              onClick={() => void toggleCamera()}
            >
              {cameraOn ? "Camera on" : "Camera off"}
            </button>
            <button
              type="button"
              className={speakerOn ? "" : "active"}
              onClick={toggleSpeaker}
            >
              {speakerOn ? "Speaker on" : "Speaker off"}
            </button>
            {variant === "therapist" ? (
              <button
                type="button"
                className="consult-end"
                onClick={() => void endConsultation()}
              >
                End consultation
              </button>
            ) : (
              <button
                type="button"
                className="consult-end"
                onClick={() => void leave()}
              >
                Leave consultation
              </button>
            )}
          </div>
        </section>

        {variant === "therapist" && consult ? (
          <aside className="consult-sidebar">
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
          </aside>
        ) : null}

        {variant === "patient" && consult ? (
          <aside className="consult-sidebar patient">
            <p className="consult-kicker">Physiotherapist</p>
            <h2>{consult.therapist.full_name}</h2>
            {consult.therapist.clinic_name ? (
              <p>{consult.therapist.clinic_name}</p>
            ) : null}
            {consult.plan ? (
              <p className="consult-meta">{consult.plan.title}</p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
