"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DiagramSlide = {
  id: string;
  eyebrow: string;
  title: string;
  note: string;
  kind: "diagram";
  src: string;
  caption: string;
};

type ContentSlide = {
  id: string;
  eyebrow: string;
  title: string;
  note: string;
  kind?: "content";
};

type Slide = ContentSlide | DiagramSlide;

const slides: Slide[] = [
  { id: "intro", eyebrow: "FIRST REVIEW · 2026", title: "Rehabilitation,\nreconnected.", note: "Open with the gap: video calls connect people, but they do not create a rehabilitation workflow." },
  { id: "problem", eyebrow: "01 · THE PROBLEM", title: "Remote care\nis still fragmented.", note: "Explain that therapists juggle calls, prescriptions, notes and progress across disconnected tools." },
  { id: "solution", eyebrow: "02 · THE SOLUTION", title: "One supervised\nrecovery loop.", note: "Stride unifies planning, guided movement, derived metrics and therapist-reviewed progress." },
  { id: "features", eyebrow: "03 · CORE EXPERIENCE", title: "Built around\nthe care journey.", note: "Walk left to right. The patient gets clarity; the therapist retains authority." },
  { id: "ai", eyebrow: "04 · AI, WITH LIMITS", title: "Measure motion.\nNever diagnose.", note: "Stress the boundary: this is explainable decision support, not automated clinical judgement." },
  { id: "architecture", eyebrow: "05 · SYSTEM ARCHITECTURE", title: "Private by\ndesign.", note: "Pose inference stays on-device where practical. Only derived metrics reach the backend." },
  {
    id: "diagram-usecase",
    eyebrow: "06 · USE CASE",
    title: "Use case\ndiagram.",
    note: "Walk the three actors: patient, physiotherapist, administrator — and the goals each role owns.",
    kind: "diagram",
    src: "/diagrams/01-use-case.png",
    caption: "Actors and primary goals across patient, therapist, and admin.",
  },
  {
    id: "diagram-activity",
    eyebrow: "07 · ACTIVITY",
    title: "Activity\ndiagram.",
    note: "Follow the guided exercise flow: consent, optional camera tracking, metrics, then therapist review.",
    kind: "diagram",
    src: "/diagrams/02-activity.png",
    caption: "Guided exercise session — from selection through review.",
  },
  {
    id: "diagram-class",
    eyebrow: "08 · CLASS MODEL",
    title: "Class\ndiagram.",
    note: "Highlight domain objects: users, plans, sessions, observations, consent, appointments.",
    kind: "diagram",
    src: "/diagrams/03-class.png",
    caption: "Domain class model for the rehabilitation workflow.",
  },
  {
    id: "diagram-er",
    eyebrow: "09 · ER MODEL",
    title: "Entity-relationship\ndiagram.",
    note: "Show how clinical entities and relationships map to persisted records.",
    kind: "diagram",
    src: "/diagrams/04-er.png",
    caption: "Conceptual ER model of the Stride care record.",
  },
  {
    id: "diagram-architecture",
    eyebrow: "10 · ARCHITECTURE",
    title: "Application\narchitecture.",
    note: "Clients, API services, data plane, and the separate WebRTC media path.",
    kind: "diagram",
    src: "/diagrams/05-architecture.png",
    caption: "System architecture — presentation, services, data, and media.",
  },
  {
    id: "diagram-modules",
    eyebrow: "11 · MODULES",
    title: "Module\ndescription.",
    note: "Map M1–M10 modules to clients and persisted entities. Note video consult is ephemeral.",
    kind: "diagram",
    src: "/diagrams/06-module-description.png",
    caption: "Functional modules M1–M10 and their data boundaries.",
  },
  {
    id: "diagram-dbschema",
    eyebrow: "12 · DATABASE SCHEMA",
    title: "Logical DB\nschema.",
    note: "Walk tables and foreign keys in the logical relational schema.",
    kind: "diagram",
    src: "/diagrams/07-db-schema.png",
    caption: "Logical relational schema for the Stride care record.",
  },
  {
    id: "diagram-api",
    eyebrow: "13 · API DOCUMENTATION",
    title: "API\ndocumentation.",
    note: "Walk Swagger groups: auth, patients, plans, sessions, appointments, observations, consent, admin.",
    kind: "diagram",
    src: "/diagrams/08-api-doc.png",
    caption: "Stride API 0.3.0 — endpoints and schemas (Swagger).",
  },
  { id: "stack", eyebrow: "14 · FEASIBILITY", title: "A focused,\nbuildable stack.", note: "The stack uses established components. The six-week risk is controlled by freezing scope." },
  { id: "vision", eyebrow: "15 · ROADMAP", title: "Start narrow.\nLearn fast.", note: "Close with the sequence: prove the workflow, validate motion signals, then expand responsibly." },
];

const Icon = ({ children }: { children: React.ReactNode }) => <span className="icon">{children}</span>;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;
const FIT_PAD = 16;
/** Same family as the first smooth GPU version — not too soft, not jumpy */
const PINCH_SENSITIVITY = 0.0009;

function DiagramPanel({ slide }: { slide: DiagramSlide }) {
  const [missing, setMissing] = useState(false);
  const [zoomLabel, setZoomLabel] = useState(100);
  const [fitWidth, setFitWidth] = useState<number | undefined>(undefined);
  const [dragging, setDragging] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const labelRaf = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const paint = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${zoomRef.current})`;
  }, []);

  const syncLabel = useCallback(() => {
    if (labelRaf.current != null) return;
    labelRaf.current = window.requestAnimationFrame(() => {
      labelRaf.current = null;
      setZoomLabel(Math.round(zoomRef.current * 100));
    });
  }, []);

  const clampZoom = useCallback((value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)), []);

  const setZoomAtPointer = useCallback(
    (nextZoom: number, clientX?: number, clientY?: number) => {
      const frame = frameRef.current;
      const prev = zoomRef.current;
      const clamped = clampZoom(nextZoom);

      if (frame && clientX != null && clientY != null && prev > 0) {
        const rect = frame.getBoundingClientRect();
        const cx = clientX - rect.left - rect.width / 2;
        const cy = clientY - rect.top - rect.height / 2;
        const worldX = (cx - panRef.current.x) / prev;
        const worldY = (cy - panRef.current.y) / prev;
        panRef.current = {
          x: cx - worldX * clamped,
          y: cy - worldY * clamped,
        };
      }

      zoomRef.current = clamped;
      paint();
      syncLabel();
    },
    [clampZoom, paint, syncLabel],
  );

  const recomputeFit = useCallback(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !img.naturalWidth) return;
    const scale = Math.min(
      (frame.clientWidth - FIT_PAD) / img.naturalWidth,
      (frame.clientHeight - FIT_PAD) / img.naturalHeight,
    );
    setFitWidth(Math.max(1, img.naturalWidth * scale));
  }, []);

  const resetView = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    paint();
    setZoomLabel(100);
    recomputeFit();
  }, [paint, recomputeFit]);

  const zoomBy = useCallback(
    (delta: number) => {
      setZoomAtPointer(zoomRef.current + delta);
    },
    [setZoomAtPointer],
  );

  useEffect(() => {
    setMissing(false);
    setFitWidth(undefined);
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoomLabel(100);
    paint();
  }, [paint, slide.src]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => recomputeFit());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [recomputeFit, slide.src, missing]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || missing) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        let dy = event.deltaY;
        if (event.deltaMode === 1) dy *= 16;
        if (event.deltaMode === 2) dy *= 400;
        setZoomAtPointer(zoomRef.current * Math.exp(-dy * PINCH_SENSITIVITY), event.clientX, event.clientY);
        return;
      }

      panRef.current = {
        x: panRef.current.x - (event.deltaX || 0),
        y: panRef.current.y - (event.deltaY || 0),
      };
      paint();
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      if (labelRaf.current != null) {
        window.cancelAnimationFrame(labelRaf.current);
        labelRaf.current = null;
      }
    };
  }, [missing, paint, setZoomAtPointer, slide.src]);

  return (
    <div className="diagram-layout">
      <div className="diagram-toolbar">
        <div className="diagram-toolbar-title">
          <strong>{slide.title.replace("\n", " ")}</strong>
          <span>{slide.caption}</span>
        </div>
        <div className="diagram-toolbar-actions">
          <button type="button" onClick={() => zoomBy(-ZOOM_STEP)} aria-label="Zoom out" title="Zoom out (−)">
            −
          </button>
          <span className="diagram-zoom-label">{zoomLabel}%</span>
          <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in" title="Zoom in (+)">
            +
          </button>
          <button type="button" onClick={resetView} aria-label="Fit whole image" title="Fit whole image">
            Fit
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        tabIndex={0}
        className={`diagram-frame ${missing ? "pending" : ""} ${dragging ? "is-dragging" : ""}`}
        onMouseEnter={() => frameRef.current?.focus({ preventScroll: true })}
        onPointerDown={(event) => {
          if (missing || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            px: panRef.current.x,
            py: panRef.current.y,
          };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          panRef.current = {
            x: drag.current.px + (event.clientX - drag.current.x),
            y: drag.current.py + (event.clientY - drag.current.y),
          };
          paint();
        }}
        onPointerUp={(event) => {
          if (drag.current) {
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
              /* ignore */
            }
          }
          drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        {missing ? (
          <div className="diagram-placeholder">
            <b>IMAGE PENDING</b>
            <p>
              Drop the diagram at <code>presentation/public{slide.src}</code> and refresh.
            </p>
          </div>
        ) : (
          <div ref={stageRef} className="diagram-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={slide.src}
              alt={slide.caption}
              draggable={false}
              decoding="async"
              style={fitWidth ? { width: `${fitWidth}px` } : { opacity: 0 }}
              onLoad={() => {
                recomputeFit();
                zoomRef.current = 1;
                panRef.current = { x: 0, y: 0 };
                paint();
                setZoomLabel(100);
              }}
              onError={() => setMissing(true)}
            />
          </div>
        )}
      </div>
      <p className="diagram-hint">Pinch to zoom · Scroll / drag to pan · Fit restores full image</p>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState(0);
  const [notes, setNotes] = useState(false);
  const touchStart = useRef<number | null>(null);
  const go = useCallback((next: number) => setActive(Math.max(0, Math.min(slides.length - 1, next))), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        go(active + 1);
      }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        go(active - 1);
      }
      if (event.key.toLowerCase() === "n") setNotes((value) => !value);
      if (event.key.toLowerCase() === "f") document.documentElement.requestFullscreen?.();
      if (event.key === "Home") go(0);
      if (event.key === "End") go(slides.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go]);

  return (
    <main
      className={`deck ${slides[active]?.kind === "diagram" ? "deck-diagram" : ""}`}
      onTouchStart={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest(".diagram-frame, .diagram-toolbar")) {
          touchStart.current = null;
          return;
        }
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const distance = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(distance) > 50) go(active + (distance < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <header className="topbar">
        <button className="wordmark" onClick={() => go(0)} aria-label="Go to first slide">
          STRIDE<span>●</span>
        </button>
        <div className="top-meta">
          <span>AI-ASSISTED TELE-PHYSIOTHERAPY</span>
          <span className="live">
            <i /> REVIEW READY
          </span>
        </div>
      </header>

      <div className="stage">
        {slides.map((slide, index) => (
          <section
            key={slide.id}
            className={`slide slide-${slide.id} ${slide.kind === "diagram" ? "slide-diagram" : ""} ${index === active ? "active" : index < active ? "before" : "after"}`}
            aria-hidden={index !== active}
          >
            <div className="slide-inner">
              {slide.kind !== "diagram" ? <p className="eyebrow">{slide.eyebrow}</p> : null}

              {slide.kind === "diagram" && <DiagramPanel slide={slide} />}

              {slide.id === "intro" && (
                <>
                  <div className="hero-copy">
                    <h1>
                      {slide.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h1>
                    <p>Therapist-led remote recovery, strengthened by explainable movement signals.</p>
                  </div>
                  <div className="motion-orb" aria-hidden="true">
                    <div className="joint j1" />
                    <div className="joint j2" />
                    <div className="joint j3" />
                    <div className="joint j4" />
                    <div className="limb l1" />
                    <div className="limb l2" />
                    <div className="limb l3" />
                  </div>
                  <div className="hero-foot">
                    <span>PLANNING + FEASIBILITY</span>
                    <b>FIRST REVIEW / 08.2026</b>
                  </div>
                </>
              )}

              {slide.id === "problem" && (
                <div className="split-layout">
                  <div>
                    <h2>
                      {slide.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h2>
                    <p className="lead">A video call can show movement. It cannot organize the care around it.</p>
                  </div>
                  <div className="problem-stack">
                    {[
                      ["01", "SCATTERED CONTEXT", "Appointments, plans and notes live in separate tools."],
                      ["02", "LOW VISIBILITY", "Home-exercise completion is hard to verify."],
                      ["03", "MANUAL OBSERVATION", "Repetitions and progress are inconsistently recorded."],
                    ].map((x) => (
                      <article key={x[0]}>
                        <b>{x[0]}</b>
                        <div>
                          <h3>{x[1]}</h3>
                          <p>{x[2]}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {slide.id === "solution" && (
                <>
                  <h2>
                    {slide.title.split("\n").map((line, i) => (
                      <span key={line} className={i ? "serif" : ""}>
                        {line}
                      </span>
                    ))}
                  </h2>
                  <div className="loop">
                    {[
                      ["PLAN", "Therapist prescribes"],
                      ["GUIDE", "Patient moves"],
                      ["MEASURE", "Camera derives signals"],
                      ["REVIEW", "Therapist approves"],
                    ].map((x, i) => (
                      <div className="loop-item" key={x[0]}>
                        <Icon>{String(i + 1).padStart(2, "0")}</Icon>
                        <h3>{x[0]}</h3>
                        <p>{x[1]}</p>
                        {i < 3 && <span className="connector">→</span>}
                      </div>
                    ))}
                  </div>
                  <p className="principle">
                    <span>THE PRINCIPLE</span> AI reduces observation and documentation effort; the physiotherapist remains
                    in control.
                  </p>
                </>
              )}

              {slide.id === "features" && (
                <>
                  <div className="feature-head">
                    <h2>
                      {slide.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h2>
                    <p>
                      Two roles.
                      <br />
                      One shared recovery record.
                    </p>
                  </div>
                  <div className="feature-grid">
                    <article className="feature-card patient">
                      <span>PATIENT</span>
                      <Icon>↗</Icon>
                      <h3>Know what to do next.</h3>
                      <ul>
                        <li>Appointments & reminders</li>
                        <li>Guided exercise plans</li>
                        <li>Camera-based movement cues</li>
                        <li>Approved progress view</li>
                      </ul>
                    </article>
                    <article className="feature-card therapist">
                      <span>PHYSIOTHERAPIST</span>
                      <Icon>+</Icon>
                      <h3>See the recovery clearly.</h3>
                      <ul>
                        <li>Patient & plan management</li>
                        <li>Pose landmarks and metrics</li>
                        <li>Session notes & corrections</li>
                        <li>Longitudinal progress</li>
                      </ul>
                    </article>
                  </div>
                </>
              )}

              {slide.id === "ai" && (
                <div className="ai-layout">
                  <div>
                    <h2>
                      {slide.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h2>
                    <p className="lead">A transparent pipeline with a human decision at the end.</p>
                  </div>
                  <div className="pipeline">
                    {[
                      ["01", "CONSENT + CAMERA CHECK"],
                      ["02", "ON-DEVICE POSE LANDMARKS"],
                      ["03", "CONFIDENCE GATING"],
                      ["04", "ANGLES + REPETITIONS"],
                      ["05", "THERAPIST ACCEPTS / CORRECTS"],
                    ].map((x, i) => (
                      <div key={x[0]}>
                        <b>{x[0]}</b>
                        <span>{x[1]}</span>
                        {i < 4 && <i />}
                      </div>
                    ))}
                  </div>
                  <div className="guardrail">
                    <b>SAFE FAILURE</b>
                    <p>Pain, poor framing or low confidence pauses feedback. Raw video is not retained by default.</p>
                  </div>
                </div>
              )}

              {slide.id === "architecture" && (
                <>
                  <div className="arch-head">
                    <h2>
                      {slide.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h2>
                    <div className="arch-legend">
                      <span>
                        <i className="legend-data" />
                        DATA PLANE
                      </span>
                      <span>
                        <i className="legend-media" />
                        MEDIA PLANE
                      </span>
                    </div>
                  </div>
                  <div className="arch-map">
                    <div className="arch-zone clients-zone">
                      <div className="zone-label">
                        <b>01</b>
                        <span>PRESENTATION + EDGE</span>
                      </div>
                      <div className="arch-card patient-card">
                        <strong>PATIENT WEB APP</strong>
                        <small>Appointments · exercise plan · consent</small>
                        <div className="edge-chip">
                          <b>ON DEVICE</b>
                          <span>Camera → MediaPipe → angles + reps</span>
                        </div>
                      </div>
                      <div className="arch-card therapist-card">
                        <strong>THERAPIST WEB APP</strong>
                        <small>Plans · live signals · review · notes</small>
                      </div>
                    </div>
                    <div className="arch-flow inbound">
                      <span>HTTPS / JSON</span>
                      <i>→</i>
                      <span>DERIVED METRICS</span>
                      <i>→</i>
                    </div>
                    <div className="arch-zone app-zone">
                      <div className="zone-label">
                        <b>02</b>
                        <span>APPLICATION SERVICES</span>
                      </div>
                      <div className="api-gateway">
                        <b>FASTAPI REST API</b>
                        <span>validation · authorization · orchestration</span>
                      </div>
                      <div className="service-grid">
                        <div>
                          <b>AUTH + RBAC</b>
                          <small>roles · ownership</small>
                        </div>
                        <div>
                          <b>REHAB WORKFLOW</b>
                          <small>plans · sessions</small>
                        </div>
                        <div>
                          <b>METRICS</b>
                          <small>ROM · reps · trends</small>
                        </div>
                        <div>
                          <b>CONSENT + AUDIT</b>
                          <small>events · corrections</small>
                        </div>
                      </div>
                    </div>
                    <div className="arch-flow outbound">
                      <span>SQL / EVENTS</span>
                      <i>→</i>
                      <span>ROOM TOKEN</span>
                      <i>→</i>
                    </div>
                    <div className="arch-zone platform-zone">
                      <div className="zone-label">
                        <b>03</b>
                        <span>DATA + INTEGRATIONS</span>
                      </div>
                      <div className="arch-card database-card">
                        <strong>POSTGRESQL</strong>
                        <small>users · care plans · metrics · audit</small>
                      </div>
                      <div className="platform-row">
                        <div className="arch-card livekit-card">
                          <strong>LIVEKIT</strong>
                          <small>WebRTC rooms</small>
                        </div>
                        <div className="arch-card notify-card">
                          <strong>NOTIFY</strong>
                          <small>email adapter</small>
                        </div>
                      </div>
                    </div>
                    <div className="media-rail">
                      <b>WEBRTC MEDIA — SEPARATE PATH</b>
                      <span>PATIENT ⇄ LIVEKIT ⇄ THERAPIST</span>
                    </div>
                    <div className="privacy-rail">
                      <span>
                        <b>RAW VIDEO</b> not stored by default
                      </span>
                      <span>
                        <b>POSE</b> processed locally
                      </span>
                      <span>
                        <b>CLINICAL RECORD</b> therapist-approved
                      </span>
                    </div>
                  </div>
                </>
              )}

              {slide.id === "stack" && (
                <>
                  <div className="stack-head">
                    <h2>
                      {slide.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h2>
                    <p>
                      <b>FEASIBLE</b>
                      <br />
                      with a deliberately reduced MVP.
                    </p>
                  </div>
                  <div className="stack-grid">
                    {[
                      ["01", "NEXT.JS + TYPESCRIPT", "Interactive role-based web app"],
                      ["02", "FASTAPI + PYTHON", "Typed API, analysis-friendly ecosystem"],
                      ["03", "POSTGRESQL", "Consistent clinical workflow records"],
                      ["04", "MEDIAPIPE", "Browser-native markerless pose"],
                      ["05", "LIVEKIT", "Secure real-time consultation"],
                      ["06", "DOCKER COMPOSE", "Reproducible local development"],
                    ].map((x) => (
                      <article key={x[0]}>
                        <b>{x[0]}</b>
                        <h3>{x[1]}</h3>
                        <p>{x[2]}</p>
                      </article>
                    ))}
                  </div>
                  <div className="scope-bar">
                    <b>MVP FREEZE</b>
                    <span>1–2 supported exercises</span>
                    <span>No diagnosis</span>
                    <span>No default recording</span>
                    <span>Therapist approval required</span>
                  </div>
                </>
              )}

              {slide.id === "vision" && (
                <>
                  <h2>
                    {slide.title.split("\n").map((line, i) => (
                      <span key={line} className={i ? "serif" : ""}>
                        {line}
                      </span>
                    ))}
                  </h2>
                  <div className="roadmap">
                    {[
                      ["NOW", "PLAN", "Requirements, scope, architecture"],
                      ["WEEKS 2–3", "PROVE", "Auth, workflow, one pose exercise"],
                      ["WEEKS 4–6", "VALIDATE", "Video, progress, safety tests"],
                      ["BEYOND", "EXPAND", "More exercises, devices, integrations"],
                    ].map((x, i) => (
                      <article key={x[0]}>
                        <span>{x[0]}</span>
                        <div className="road-dot">{i + 1}</div>
                        <h3>{x[1]}</h3>
                        <p>{x[2]}</p>
                      </article>
                    ))}
                  </div>
                  <div className="closing">
                    <p>THE ASK FOR REVIEW 1</p>
                    <h3>Approve the focused MVP, validation plan and therapist-in-the-loop architecture.</h3>
                    <div className="closing-mark">S</div>
                  </div>
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="controls">
        <div className="progress" aria-label={`Slide ${active + 1} of ${slides.length}`}>
          <span style={{ width: `${((active + 1) / slides.length) * 100}%` }} />
        </div>
        <div className="counter">
          <b>{String(active + 1).padStart(2, "0")}</b>
          <span>/ {String(slides.length).padStart(2, "0")}</span>
        </div>
        <nav aria-label="Presentation controls">
          <button onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous slide">
            ←
          </button>
          <button onClick={() => go(active + 1)} disabled={active === slides.length - 1} aria-label="Next slide">
            →
          </button>
          <button onClick={() => setNotes(!notes)} className={notes ? "selected" : ""} aria-label="Toggle presenter notes">
            N
          </button>
          <button onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Enter fullscreen">
            ⛶
          </button>
        </nav>
      </footer>
      {notes && (
        <aside className="notes">
          <span>PRESENTER NOTE · {String(active + 1).padStart(2, "0")}</span>
          <p>{slides[active].note}</p>
          <button onClick={() => setNotes(false)}>CLOSE</button>
        </aside>
      )}
    </main>
  );
}
