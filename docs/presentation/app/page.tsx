"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DiagramSlide = {
  id: string;
  eyebrow: string;
  title: string;
  kind: "diagram";
  src: string;
  caption: string;
};

type ContentSlide = {
  id: string;
  eyebrow: string;
  title: string;
  kind?: "content";
};

type Slide = ContentSlide | DiagramSlide;

const slides: Slide[] = [
  {
    id: "intro",
    eyebrow: "FOURTH REVIEW · 2026",
    title: "Movement signals,\non device.",
  },
  {
    id: "checklist",
    eyebrow: "02 · WEEK 4 REQUIREMENTS",
    title: "Advanced feature\n+ five documents.",
  },
  {
    id: "algorithm",
    eyebrow: "03 · ALGORITHM",
    title: "Knee-angle\nstate machine.",
  },
  {
    id: "model",
    eyebrow: "04 · AI / ML MODEL",
    title: "MediaPipe\nPose Landmarker.",
  },
  {
    id: "integration",
    eyebrow: "05 · INTEGRATION",
    title: "Pose into the\ncare workflow.",
  },
  {
    id: "privacy",
    eyebrow: "06 · PRIVACY",
    title: "On device.\nTherapist decides.",
  },
  { id: "demo", eyebrow: "07 · LIVE DEMO", title: "Sit to stand\nend to end." },
  {
    id: "tests",
    eyebrow: "08 · TEST CASES",
    title: "Twelve draft\nfunctional tests.",
  },
  {
    id: "diagram-activity",
    eyebrow: "09 · FLOWCHART",
    title: "Activity\ndiagram.",
    kind: "diagram",
    src: "/diagrams/02-activity.png",
    caption:
      "Guided exercise — consent, camera overlay, metrics, therapist review.",
  },
  {
    id: "stack",
    eyebrow: "10 · IMPLEMENTATION",
    title: "Code paths\nand stack.",
  },
  {
    id: "closing",
    eyebrow: "11 · REVIEW 4",
    title: "Implemented.\nIntegrated.",
  },
];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;
const FIT_PAD = 16;
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
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

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

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    [],
  );

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
        setZoomAtPointer(
          zoomRef.current * Math.exp(-dy * PINCH_SENSITIVITY),
          event.clientX,
          event.clientY,
        );
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
          <button
            type="button"
            onClick={() => zoomBy(-ZOOM_STEP)}
            aria-label="Zoom out"
            title="Zoom out (−)"
          >
            −
          </button>
          <span className="diagram-zoom-label">{zoomLabel}%</span>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Fit whole image"
            title="Fit whole image"
          >
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
              Drop the diagram at{" "}
              <code>docs/presentation/public{slide.src}</code> and refresh.
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
      <p className="diagram-hint">
        Pinch to zoom · Scroll / drag to pan · Fit restores full image
      </p>
    </div>
  );
}

function TitleLines({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <h2 className={className}>
      {title.split("\n").map((line, i) => (
        <span key={line} className={i ? "serif" : ""}>
          {line}
        </span>
      ))}
    </h2>
  );
}

function R4Head({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="r4-slide-head">
      <TitleLines title={title} />
      <p className="r4-meta">{meta}</p>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const go = useCallback(
    (next: number) => setActive(Math.max(0, Math.min(slides.length - 1, next))),
    [],
  );

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
      if (event.key.toLowerCase() === "f")
        document.documentElement.requestFullscreen?.();
      if (event.key === "Home") go(0);
      if (event.key === "End") go(slides.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go]);

  const slide = slides[active];

  return (
    <main
      className={`deck ${slide?.kind === "diagram" ? "deck-diagram" : ""}`}
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
        <button
          className="wordmark"
          onClick={() => go(0)}
          aria-label="Go to first slide"
        >
          STRIDE<span>●</span>
        </button>
        <div className="top-meta">
          <span>AI-ASSISTED TELE-PHYSIOTHERAPY</span>
          <span className="live">
            <i /> FOURTH REVIEW
          </span>
        </div>
      </header>

      <div className="stage">
        {slides.map((item, index) => (
          <section
            key={item.id}
            className={`slide slide-${item.id} ${item.kind === "diagram" ? "slide-diagram" : ""} ${item.id === "intro" ? "slide-intro" : ""} ${item.id !== "intro" && item.kind !== "diagram" ? "slide-r4" : ""} ${index === active ? "active" : index < active ? "before" : "after"}`}
            aria-hidden={index !== active}
          >
            <div className="slide-inner">
              {item.kind !== "diagram" ? (
                <p className="eyebrow">{item.eyebrow}</p>
              ) : null}

              {item.kind === "diagram" && <DiagramPanel slide={item} />}

              {item.id === "intro" && (
                <>
                  <div className="hero-copy">
                    <h1>
                      {item.title.split("\n").map((line, i) => (
                        <span key={line} className={i ? "serif" : ""}>
                          {line}
                        </span>
                      ))}
                    </h1>
                    <p>
                      On-device MediaPipe pose analysis for sit-to-stand —
                      integrated into sessions, observations, and therapist
                      review. No raw video leaves the patient device.
                    </p>
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
                    <span>ADVANCED FEATURES · WEEK 4</span>
                    <b>FOURTH REVIEW / 08.2026</b>
                  </div>
                </>
              )}

              {item.id === "checklist" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Bounded AI/ML feature — implemented, integrated, documented on Review 3 workflow."
                  />
                  <div className="r4-checklist">
                    {[
                      [
                        "01",
                        "Algorithm / methodology",
                        "Knee-angle state machine · confidence gating · hold frames",
                      ],
                      [
                        "02",
                        "Flowcharts",
                        "Pose pipeline + activity diagram (consent → camera → review)",
                      ],
                      [
                        "03",
                        "AI/ML model description",
                        "MediaPipe Pose Landmarker lite · 33 landmarks · no custom training",
                      ],
                      [
                        "04",
                        "Module integration",
                        "Move UI → consent → sessions API → pending observation → therapist",
                      ],
                      [
                        "05",
                        "Test cases (draft)",
                        "TC-P01 … TC-P12 — consent, tracking, privacy, review paths",
                      ],
                    ].map((row) => (
                      <article key={row[0]}>
                        <b>{row[0]}</b>
                        <h3>{row[1]}</h3>
                        <p>{row[2]}</p>
                      </article>
                    ))}
                  </div>
                  <div className="scope-bar">
                    <b>REVIEW FOCUS</b>
                    <span>Advanced features</span>
                    <span>Integration</span>
                    <span>Functionality</span>
                    <span>docs/PROJECT_DOCUMENTATION.md</span>
                  </div>
                </>
              )}

              {item.id === "algorithm" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Sit-to-stand rep counting from live camera — derived metrics only, never raw video."
                  />
                  <div className="r4-algo-grid">
                    <div className="r4-rationale">
                      <span>DESIGN CHOICES</span>
                      <ul>
                        <li>
                          Knee angle hip–knee–ankle — interpretable in viva
                        </li>
                        <li>Standing ≥ 155° · sitting ≤ 115°</li>
                        <li>Rep on stable standing → sitting transition</li>
                        <li>Confidence &lt; 0.55 pauses counting</li>
                      </ul>
                    </div>
                    <div className="r4-pipeline-grid">
                      {[
                        ["01", "Grant camera_analysis consent"],
                        ["02", "Load MediaPipe WASM on device"],
                        ["03", "Detect 33 landmarks / frame"],
                        ["04", "Pick leg side by visibility"],
                        ["05", "Compute knee angle"],
                        ["06", "Gate confidence ≥ 0.55"],
                        ["07", "Map angle → sitting / standing"],
                        ["08", "Increment rep on phase change"],
                        ["09", "POST session complete + metrics"],
                        ["10", "Pending observation → therapist"],
                      ].map((step) => (
                        <div key={step[0]} className="r4-pipeline-step">
                          <b>{step[0]}</b>
                          <span>{step[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="scope-bar r4-scope">
                    <b>MANUAL FALLBACK</b>
                    <span>No consent or poor framing → manual rep entry</span>
                    <span>Same sessions API</span>
                  </div>
                </>
              )}

              {item.id === "model" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Pre-trained Google model — no patient video used for training."
                  />
                  <div className="model-spec">
                    {[
                      [
                        "Product",
                        "Google MediaPipe Pose Landmarker (Tasks Vision)",
                      ],
                      ["Package", "@mediapipe/tasks-vision"],
                      ["Variant", "pose_landmarker_lite (float16)"],
                      [
                        "Runtime",
                        "Browser WASM · GPU delegate or CPU fallback",
                      ],
                      ["Input", "Live webcam frames (~640×480)"],
                      ["Output", "33 body landmarks + per-point visibility"],
                      ["Stride training", "None — pre-trained model only"],
                      [
                        "Intended use",
                        "Decision support for home exercise logging",
                      ],
                      [
                        "Not for",
                        "Diagnosis, treatment, or medical-device claims",
                      ],
                    ].map(([label, value]) => (
                      <div className="model-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="scope-bar">
                    <b>PRIMARY EXERCISE</b>
                    <span>Sit to stand</span>
                    <span>Web — full rep pipeline</span>
                    <span>Mobile — skeleton overlay</span>
                  </div>
                </>
              )}

              {item.id === "integration" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Review 3 API unchanged — pose adds client-side metrics before session complete."
                  />
                  <div className="r4-integration-flow">
                    {[
                      [
                        "PATIENT WEB",
                        "Move screen · consent · PoseCamera · skeleton + rep counter",
                        "lime",
                      ],
                      [
                        "ON DEVICE",
                        "MediaPipe WASM loop — landmarks stay on patient device",
                        "dark",
                      ],
                      [
                        "FASTAPI",
                        "POST /consent · POST /sessions · complete with reps + confidence",
                        "dark",
                      ],
                      [
                        "DATABASE",
                        "movement_observations · review_status = pending",
                        "white",
                      ],
                      [
                        "THERAPIST WEB",
                        "Review board · approve · correct · reject",
                        "blue",
                      ],
                    ].map((row) => (
                      <article
                        key={row[0]}
                        className={`r4-int-row tone-${row[2]}`}
                      >
                        <b>{row[0]}</b>
                        <p>{row[1]}</p>
                      </article>
                    ))}
                  </div>
                  <div className="scope-bar r4-scope">
                    <b>DATA SENT</b>
                    <span>Repetitions</span>
                    <span>Confidence</span>
                    <span>Notes — not raw video</span>
                  </div>
                </>
              )}

              {item.id === "privacy" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Educational prototype — decision support only, not a medical device."
                  />
                  <div className="r4-privacy-grid">
                    <article className="r4-privacy-card lime">
                      <span>ON-DEVICE INFERENCE</span>
                      <p>
                        MediaPipe runs in the patient browser or phone.
                        Landmarks never uploaded frame-by-frame.
                      </p>
                    </article>
                    <article className="r4-privacy-card">
                      <span>DERIVED METRICS ONLY</span>
                      <p>
                        Session completion sends repetitions, confidence, and
                        notes — not raw camera video.
                      </p>
                    </article>
                    <article className="r4-privacy-card blue">
                      <span>CONSENT GATE</span>
                      <p>
                        Camera analysis requires purpose-scoped consent
                        (camera_analysis) before the toggle enables.
                      </p>
                    </article>
                    <article className="r4-privacy-card coral">
                      <span>HUMAN IN THE LOOP</span>
                      <p>
                        Observations stay pending until the physiotherapist
                        approves, corrects, or rejects.
                      </p>
                    </article>
                  </div>
                  <div className="guardrail r4-guardrail">
                    <b>SCOPE DISCLAIMER</b>
                    <p>
                      Educational prototype — not a medical device. Pose
                      feedback is non-diagnostic decision support. A licensed
                      physiotherapist remains responsible for clinical
                      decisions.
                    </p>
                  </div>
                </>
              )}

              {item.id === "demo" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Password: StrideClinic1! · Primary demo on web patient move screen."
                  />
                  <div className="demo-steps">
                    {[
                      [
                        "1",
                        "Patient login",
                        "riyaz@stride.clinic → Exercises → Sit to stand",
                      ],
                      [
                        "2",
                        "Safety + consent",
                        "Show stop guidance · grant camera_analysis",
                      ],
                      [
                        "3",
                        "Live tracking",
                        "Enable pose · perform 2–3 sit-to-stands · watch reps + confidence",
                      ],
                      [
                        "4",
                        "Finish session",
                        "Metrics saved · observation status pending",
                      ],
                      [
                        "5",
                        "Therapist login",
                        "therapist@stride.clinic → review pending observation",
                      ],
                      [
                        "6",
                        "Approve",
                        "Only approved metrics become official progress",
                      ],
                    ].map((step) => (
                      <article key={step[0]}>
                        <b>{step[0]}</b>
                        <h3>{step[1]}</h3>
                        <p>{step[2]}</p>
                      </article>
                    ))}
                  </div>
                  <div className="scope-bar">
                    <b>RUN</b>
                    <span>API :8000</span>
                    <span>Web :3000</span>
                    <span>Patient move screen = primary demo</span>
                  </div>
                </>
              )}

              {item.id === "tests" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Draft functional tests for consent, tracking, privacy, and review."
                  />
                  <div className="r4-test-grid">
                    {[
                      [
                        "TC-P01",
                        "Camera before consent",
                        "Blocked until granted",
                      ],
                      ["TC-P02", "Grant consent", "Toggle enabled · persisted"],
                      ["TC-P03", "Manual path", "No camera · confidence ≈ 0.5"],
                      ["TC-P04", "Good framing", "Skeleton visible · Tracking"],
                      ["TC-P05", "Sit-stand-sit", "Rep counter +1"],
                      [
                        "TC-P06",
                        "Low confidence",
                        "Reposition · counting pauses",
                      ],
                      [
                        "TC-P07",
                        "Patient edits reps",
                        "API stores corrected count",
                      ],
                      [
                        "TC-P08",
                        "Complete with camera",
                        "Therapist sees pending",
                      ],
                      ["TC-P09", "Therapist approve", "Progress published"],
                      [
                        "TC-P10",
                        "Network during tracking",
                        "No video · JSON on finish",
                      ],
                      ["TC-P11", "Unsupported exercise", "Manual log only"],
                      ["TC-P12", "Not today exit", "Session not forced"],
                    ].map((row) => (
                      <article key={row[0]}>
                        <b>{row[0]}</b>
                        <h3>{row[1]}</h3>
                        <p>{row[2]}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {item.id === "stack" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="docs/PROJECT_DOCUMENTATION.md · @mediapipe/tasks-vision · npm run test:pose"
                  />
                  <div className="stack-grid">
                    {[
                      [
                        "01",
                        "PoseCamera.tsx",
                        "Webcam · MediaPipe loop · metrics callback",
                      ],
                      [
                        "02",
                        "sitToStand.ts",
                        "Phase state machine · rep counting",
                      ],
                      [
                        "03",
                        "landmarks.ts",
                        "Knee angle · visibility · side pick",
                      ],
                      ["04", "drawSkeleton.ts", "Canvas skeletal overlay"],
                      [
                        "05",
                        "move/[id]/page.tsx",
                        "Consent · toggle · session logging",
                      ],
                      [
                        "06",
                        "PoseSkeletonCamera",
                        "Mobile WebView skeleton overlay",
                      ],
                    ].map((x) => (
                      <article key={x[0]}>
                        <b>{x[0]}</b>
                        <h3>{x[1]}</h3>
                        <p>{x[2]}</p>
                      </article>
                    ))}
                  </div>
                  <div className="scope-bar">
                    <b>STACK</b>
                    <span>@mediapipe/tasks-vision</span>
                    <span>Next.js · FastAPI</span>
                    <span>npm run test:pose</span>
                  </div>
                </>
              )}

              {item.id === "closing" && (
                <>
                  <R4Head
                    title={item.title}
                    meta="Week 4 deliverable — bounded AI feature with integration evidence."
                  />
                  <div className="boundary-grid">
                    <article className="boundary-yes">
                      <span>DELIVERED IN REVIEW 4</span>
                      <ul>
                        <li>
                          On-device MediaPipe pose with live skeletal overlay
                        </li>
                        <li>
                          Sit-to-stand rep counting with confidence gating
                        </li>
                        <li>
                          Integrated into consent, sessions, and therapist
                          review
                        </li>
                        <li>
                          Algorithm, flowchart, model doc, integration, test
                          cases
                        </li>
                      </ul>
                    </article>
                    <article className="boundary-no">
                      <span>OUT OF SCOPE (WEEK 5+)</span>
                      <ul>
                        <li>Full test report and production deployment</li>
                        <li>Pose for every exercise in the library</li>
                        <li>Custom model training on patient data</li>
                      </ul>
                    </article>
                  </div>
                  <div className="closing">
                    <p>REVIEW 4 DELIVERABLE</p>
                    <h3>
                      Bounded AI feature — implemented, integrated, documented,
                      and demo-ready.
                    </h3>
                    <div className="closing-mark">4</div>
                  </div>
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="controls">
        <div
          className="progress"
          aria-label={`Slide ${active + 1} of ${slides.length}`}
        >
          <span style={{ width: `${((active + 1) / slides.length) * 100}%` }} />
        </div>
        <div className="counter">
          <b>{String(active + 1).padStart(2, "0")}</b>
          <span>/ {String(slides.length).padStart(2, "0")}</span>
        </div>
        <nav aria-label="Presentation controls">
          <button
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            onClick={() => go(active + 1)}
            disabled={active === slides.length - 1}
            aria-label="Next slide"
          >
            →
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            aria-label="Enter fullscreen"
          >
            ⛶
          </button>
        </nav>
      </footer>
    </main>
  );
}
