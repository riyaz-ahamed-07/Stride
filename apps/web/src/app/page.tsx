import Link from "next/link";
import { SiteNav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";

const concerns = [
  { label: "Knee recovery", tone: "mint" },
  { label: "Balance & falls", tone: "blue" },
  { label: "Post-surgery", tone: "lavender" },
  { label: "Stroke rehab", tone: "peach" },
  { label: "Back pain", tone: "yellow" },
  { label: "Mobility", tone: "rose" },
];

const steps = [
  { title: "Meet your therapist", body: "Book a video or clinic visit. Your physiotherapist learns your goals and limits." },
  { title: "Get a home plan", body: "Exercises appear on web and phone with large text, safety notes, and clear reps." },
  { title: "Train at home", body: "Complete movements at your pace. Sessions save to one shared clinic record." },
  { title: "Review together", body: "Therapist approves progress, adjusts plans, and schedules follow-up visits." },
];

export default function HomePage() {
  return (
    <div className="site">
      <SiteNav />
      <main>
        <section className="marketing-hero">
          <div className="container hero-split">
            <div className="hero-copy">
              <span className="hero-badge">Trusted tele-physiotherapy</span>
              <h1>
                Your trusted path to <span className="text-primary">recovery at home</span>
              </h1>
              <p className="hero-lead">
                Stride connects patients, family helpers, and physiotherapists through clear exercise plans,
                appointment booking, and secure video consultations — designed for older adults and calm, readable screens.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" href="/login">
                  Get started
                </Link>
                <Link className="btn btn-outline btn-lg" href="/login">
                  Therapist sign in
                </Link>
              </div>
              <div className="hero-search">
                <span className="hero-search-icon">🔎</span>
                <input type="search" placeholder="Search exercises, appointments, help topics…" aria-label="Search" />
                <Link className="btn btn-teal btn-sm" href="/login">
                  Search
                </Link>
              </div>
            </div>
            <div className="hero-panel">
              <div className="hero-panel-card">
                <div className="hero-panel-top">
                  <div className="avatar avatar-lg">KD</div>
                  <div>
                    <p className="greet-text">Patient dashboard</p>
                    <p className="greet-name">Week 1 — knee strength</p>
                  </div>
                  <span className="badge badge-success">Active plan</span>
                </div>
                <div className="hero-panel-stats">
                  <div>
                    <strong>2</strong>
                    <span>Exercises today</span>
                  </div>
                  <div>
                    <strong>1</strong>
                    <span>Video visit</span>
                  </div>
                  <div>
                    <strong>75%</strong>
                    <span>Weekly progress</span>
                  </div>
                </div>
                <Link className="btn btn-primary btn-block" href="/login">
                  Open patient portal
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="concern-strip">
          <div className="container">
            <div className="section-head">
              <h2>Care paths we support</h2>
              <Link href="/login">View all →</Link>
            </div>
            <div className="concern-grid">
              {concerns.map((item) => (
                <article key={item.label} className={`concern-card tone-${item.tone}`}>
                  <span className="concern-icon">●</span>
                  {item.label}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="section-block">
          <div className="container">
            <div className="section-head centered">
              <h2>Everything in one clinic platform</h2>
              <p className="subtitle">Web for families and therapists. Mobile app for patients on the go.</p>
            </div>
            <div className="feature-grid-lg">
              <article className="card feature-tile">
                <div className="feature-icon quick-icon blue">🔎</div>
                <h3>Doctor discovery</h3>
                <p>Browse your assigned physiotherapist, clinic details, and visit history in one place.</p>
              </article>
              <article className="card feature-tile">
                <div className="feature-icon quick-icon teal">📅</div>
                <h3>Appointment booking</h3>
                <p>See upcoming visits, reasons for care, and join from desktop or tablet.</p>
              </article>
              <article className="card feature-tile">
                <div className="feature-icon quick-icon amber">📹</div>
                <h3>Video consultation</h3>
                <p>High-quality video calls with mute, camera toggle, picture-in-picture, and clear controls.</p>
              </article>
              <article className="card feature-tile">
                <div className="feature-icon quick-icon rose">🏃</div>
                <h3>Home exercise plans</h3>
                <p>Step-by-step movements with safety alerts and therapist review before records update.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="video" className="section-block section-video">
          <div className="container video-promo">
            <div>
              <span className="hero-badge">Video visits</span>
              <h2>Consult from home with confidence</h2>
              <p className="subtitle">
                Join a scheduled visit in one click. See your therapist full-screen, keep your own camera in a
                floating window, and use simple controls — no tiny icons.
              </p>
              <ul className="check-list">
                <li>Picture-in-picture patient view</li>
                <li>Mute, camera, and end-call controls</li>
                <li>Live timer and therapist details on screen</li>
              </ul>
              <Link className="btn btn-primary btn-lg" href="/login">
                Join a demo visit
              </Link>
            </div>
            <div className="video-promo-mock" aria-hidden="true">
              <div className="video-promo-main" />
              <div className="video-promo-pip" />
              <div className="video-promo-bar">
                <span>Dr. Patel · Physiotherapy</span>
                <span className="video-live-dot" /> 17:02
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-block">
          <div className="container">
            <div className="section-head centered">
              <h2>How Stride works</h2>
            </div>
            <div className="steps-row">
              {steps.map((step, index) => (
                <article key={step.title} className="step-card">
                  <div className="step-num">{index + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="safety" className="section-block section-muted">
          <div className="container trust-bar-lg">
            <div className="trust-item">
              <div className="trust-num">3</div>
              <div className="trust-label">Roles · Patient, therapist, admin</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">1</div>
              <div className="trust-label">Shared record · Web + mobile</div>
            </div>
            <div className="trust-item">
              <div className="trust-num">Safe</div>
              <div className="trust-label">Not for emergencies or diagnosis</div>
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <div className="container cta-banner-inner">
            <h2>Ready for Review 3 demo?</h2>
            <p>Use the seeded clinic accounts to walk through login, exercises, video UI, and therapist approval.</p>
            <Link className="btn btn-dark btn-lg" href="/login">
              Sign in to clinic demo
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
