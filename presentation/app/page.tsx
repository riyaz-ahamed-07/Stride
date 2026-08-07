"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const slides = [
  { id: "intro", eyebrow: "FIRST REVIEW · 2026", title: "Rehabilitation,\nreconnected.", note: "Open with the gap: video calls connect people, but they do not create a rehabilitation workflow." },
  { id: "problem", eyebrow: "01 · THE PROBLEM", title: "Remote care\nis still fragmented.", note: "Explain that therapists juggle calls, prescriptions, notes and progress across disconnected tools." },
  { id: "solution", eyebrow: "02 · THE SOLUTION", title: "One supervised\nrecovery loop.", note: "Stride unifies planning, guided movement, derived metrics and therapist-reviewed progress." },
  { id: "features", eyebrow: "03 · CORE EXPERIENCE", title: "Built around\nthe care journey.", note: "Walk left to right. The patient gets clarity; the therapist retains authority." },
  { id: "ai", eyebrow: "04 · AI, WITH LIMITS", title: "Measure motion.\nNever diagnose.", note: "Stress the boundary: this is explainable decision support, not automated clinical judgement." },
  { id: "architecture", eyebrow: "05 · SYSTEM ARCHITECTURE", title: "Private by\ndesign.", note: "Pose inference stays on-device where practical. Only derived metrics reach the backend." },
  { id: "stack", eyebrow: "06 · FEASIBILITY", title: "A focused,\nbuildable stack.", note: "The stack uses established components. The six-week risk is controlled by freezing scope." },
  { id: "vision", eyebrow: "07 · ROADMAP", title: "Start narrow.\nLearn fast.", note: "Close with the sequence: prove the workflow, validate motion signals, then expand responsibly." },
];

const Icon = ({ children }: { children: React.ReactNode }) => <span className="icon">{children}</span>;

export default function Home() {
  const [active, setActive] = useState(0);
  const [notes, setNotes] = useState(false);
  const touchStart = useRef<number | null>(null);
  const go = useCallback((next: number) => setActive(Math.max(0, Math.min(slides.length - 1, next))), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); go(active + 1); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); go(active - 1); }
      if (event.key.toLowerCase() === "n") setNotes((value) => !value);
      if (event.key.toLowerCase() === "f") document.documentElement.requestFullscreen?.();
      if (event.key === "Home") go(0);
      if (event.key === "End") go(slides.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go]);

  return (
    <main className="deck" onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }} onTouchEnd={(e) => {
      if (touchStart.current === null) return;
      const distance = e.changedTouches[0].clientX - touchStart.current;
      if (Math.abs(distance) > 50) go(active + (distance < 0 ? 1 : -1));
      touchStart.current = null;
    }}>
      <header className="topbar">
        <button className="wordmark" onClick={() => go(0)} aria-label="Go to first slide">STRIDE<span>●</span></button>
        <div className="top-meta"><span>AI-ASSISTED TELE-PHYSIOTHERAPY</span><span className="live"><i /> REVIEW READY</span></div>
      </header>

      <div className="stage">
        {slides.map((slide, index) => (
          <section key={slide.id} className={`slide slide-${slide.id} ${index === active ? "active" : index < active ? "before" : "after"}`} aria-hidden={index !== active}>
            <div className="slide-inner">
              <p className="eyebrow">{slide.eyebrow}</p>

              {slide.id === "intro" && <>
                <div className="hero-copy"><h1>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h1>
                  <p>Therapist-led remote recovery, strengthened by explainable movement signals.</p>
                </div>
                <div className="motion-orb" aria-hidden="true"><div className="joint j1"/><div className="joint j2"/><div className="joint j3"/><div className="joint j4"/><div className="limb l1"/><div className="limb l2"/><div className="limb l3"/></div>
                <div className="hero-foot"><span>PLANNING + FEASIBILITY</span><b>FIRST REVIEW / 08.2026</b></div>
              </>}

              {slide.id === "problem" && <div className="split-layout">
                <div><h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2><p className="lead">A video call can show movement. It cannot organize the care around it.</p></div>
                <div className="problem-stack">
                  {[['01','SCATTERED CONTEXT','Appointments, plans and notes live in separate tools.'],['02','LOW VISIBILITY','Home-exercise completion is hard to verify.'],['03','MANUAL OBSERVATION','Repetitions and progress are inconsistently recorded.']].map((x)=><article key={x[0]}><b>{x[0]}</b><div><h3>{x[1]}</h3><p>{x[2]}</p></div></article>)}
                </div>
              </div>}

              {slide.id === "solution" && <>
                <h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2>
                <div className="loop">
                  {[['PLAN','Therapist prescribes'],['GUIDE','Patient moves'],['MEASURE','Camera derives signals'],['REVIEW','Therapist approves']].map((x,i)=><div className="loop-item" key={x[0]}><Icon>{String(i+1).padStart(2,'0')}</Icon><h3>{x[0]}</h3><p>{x[1]}</p>{i<3&&<span className="connector">→</span>}</div>)}
                </div>
                <p className="principle"><span>THE PRINCIPLE</span> AI reduces observation and documentation effort; the physiotherapist remains in control.</p>
              </>}

              {slide.id === "features" && <>
                <div className="feature-head"><h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2><p>Two roles.<br/>One shared recovery record.</p></div>
                <div className="feature-grid">
                  <article className="feature-card patient"><span>PATIENT</span><Icon>↗</Icon><h3>Know what to do next.</h3><ul><li>Appointments & reminders</li><li>Guided exercise plans</li><li>Camera-based movement cues</li><li>Approved progress view</li></ul></article>
                  <article className="feature-card therapist"><span>PHYSIOTHERAPIST</span><Icon>+</Icon><h3>See the recovery clearly.</h3><ul><li>Patient & plan management</li><li>Pose landmarks and metrics</li><li>Session notes & corrections</li><li>Longitudinal progress</li></ul></article>
                </div>
              </>}

              {slide.id === "ai" && <div className="ai-layout">
                <div><h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2><p className="lead">A transparent pipeline with a human decision at the end.</p></div>
                <div className="pipeline">{[['01','CONSENT + CAMERA CHECK'],['02','ON-DEVICE POSE LANDMARKS'],['03','CONFIDENCE GATING'],['04','ANGLES + REPETITIONS'],['05','THERAPIST ACCEPTS / CORRECTS']].map((x,i)=><div key={x[0]}><b>{x[0]}</b><span>{x[1]}</span>{i<4&&<i/>}</div>)}</div>
                <div className="guardrail"><b>SAFE FAILURE</b><p>Pain, poor framing or low confidence pauses feedback. Raw video is not retained by default.</p></div>
              </div>}

              {slide.id === "architecture" && <>
                <div className="arch-head"><h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2><div className="arch-legend"><span><i className="legend-data"/>DATA PLANE</span><span><i className="legend-media"/>MEDIA PLANE</span></div></div>
                <div className="arch-map">
                  <div className="arch-zone clients-zone">
                    <div className="zone-label"><b>01</b><span>PRESENTATION + EDGE</span></div>
                    <div className="arch-card patient-card"><strong>PATIENT WEB APP</strong><small>Appointments · exercise plan · consent</small><div className="edge-chip"><b>ON DEVICE</b><span>Camera → MediaPipe → angles + reps</span></div></div>
                    <div className="arch-card therapist-card"><strong>THERAPIST WEB APP</strong><small>Plans · live signals · review · notes</small></div>
                  </div>
                  <div className="arch-flow inbound"><span>HTTPS / JSON</span><i>→</i><span>DERIVED METRICS</span><i>→</i></div>
                  <div className="arch-zone app-zone">
                    <div className="zone-label"><b>02</b><span>APPLICATION SERVICES</span></div>
                    <div className="api-gateway"><b>FASTAPI REST API</b><span>validation · authorization · orchestration</span></div>
                    <div className="service-grid">
                      <div><b>AUTH + RBAC</b><small>roles · ownership</small></div>
                      <div><b>REHAB WORKFLOW</b><small>plans · sessions</small></div>
                      <div><b>METRICS</b><small>ROM · reps · trends</small></div>
                      <div><b>CONSENT + AUDIT</b><small>events · corrections</small></div>
                    </div>
                  </div>
                  <div className="arch-flow outbound"><span>SQL / EVENTS</span><i>→</i><span>ROOM TOKEN</span><i>→</i></div>
                  <div className="arch-zone platform-zone">
                    <div className="zone-label"><b>03</b><span>DATA + INTEGRATIONS</span></div>
                    <div className="arch-card database-card"><strong>POSTGRESQL</strong><small>users · care plans · metrics · audit</small></div>
                    <div className="platform-row"><div className="arch-card livekit-card"><strong>LIVEKIT</strong><small>WebRTC rooms</small></div><div className="arch-card notify-card"><strong>NOTIFY</strong><small>email adapter</small></div></div>
                  </div>
                  <div className="media-rail"><b>WEBRTC MEDIA — SEPARATE PATH</b><span>PATIENT ⇄ LIVEKIT ⇄ THERAPIST</span></div>
                  <div className="privacy-rail"><span><b>RAW VIDEO</b> not stored by default</span><span><b>POSE</b> processed locally</span><span><b>CLINICAL RECORD</b> therapist-approved</span></div>
                </div>
              </>}

              {slide.id === "stack" && <>
                <div className="stack-head"><h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2><p><b>FEASIBLE</b><br/>with a deliberately reduced MVP.</p></div>
                <div className="stack-grid">{[['01','NEXT.JS + TYPESCRIPT','Interactive role-based web app'],['02','FASTAPI + PYTHON','Typed API, analysis-friendly ecosystem'],['03','POSTGRESQL','Consistent clinical workflow records'],['04','MEDIAPIPE','Browser-native markerless pose'],['05','LIVEKIT','Secure real-time consultation'],['06','DOCKER COMPOSE','Reproducible local development']].map(x=><article key={x[0]}><b>{x[0]}</b><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div>
                <div className="scope-bar"><b>MVP FREEZE</b><span>1–2 supported exercises</span><span>No diagnosis</span><span>No default recording</span><span>Therapist approval required</span></div>
              </>}

              {slide.id === "vision" && <>
                <h2>{slide.title.split("\n").map((line, i) => <span key={line} className={i ? "serif" : ""}>{line}</span>)}</h2>
                <div className="roadmap">{[['NOW','PLAN','Requirements, scope, architecture'],['WEEKS 2–3','PROVE','Auth, workflow, one pose exercise'],['WEEKS 4–6','VALIDATE','Video, progress, safety tests'],['BEYOND','EXPAND','More exercises, devices, integrations']].map((x,i)=><article key={x[0]}><span>{x[0]}</span><div className="road-dot">{i+1}</div><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div>
                <div className="closing"><p>THE ASK FOR REVIEW 1</p><h3>Approve the focused MVP, validation plan and therapist-in-the-loop architecture.</h3><div className="closing-mark">S</div></div>
              </>}
            </div>
          </section>
        ))}
      </div>

      <footer className="controls">
        <div className="progress" aria-label={`Slide ${active + 1} of ${slides.length}`}><span style={{width:`${((active+1)/slides.length)*100}%`}}/></div>
        <div className="counter"><b>{String(active+1).padStart(2,'0')}</b><span>/ {String(slides.length).padStart(2,'0')}</span></div>
        <nav aria-label="Presentation controls"><button onClick={()=>go(active-1)} disabled={active===0} aria-label="Previous slide">←</button><button onClick={()=>go(active+1)} disabled={active===slides.length-1} aria-label="Next slide">→</button><button onClick={()=>setNotes(!notes)} className={notes?'selected':''} aria-label="Toggle presenter notes">N</button><button onClick={()=>document.documentElement.requestFullscreen?.()} aria-label="Enter fullscreen">⛶</button></nav>
      </footer>
      {notes && <aside className="notes"><span>PRESENTER NOTE · {String(active+1).padStart(2,'0')}</span><p>{slides[active].note}</p><button onClick={()=>setNotes(false)}>CLOSE</button></aside>}
    </main>
  );
}
