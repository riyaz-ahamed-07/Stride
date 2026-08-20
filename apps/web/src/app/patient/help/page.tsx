export default function HelpPage() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="greet-text">Support</p>
          <h1>Help centre</h1>
        </div>
      </header>
      <p className="subtitle">Simple answers for patients and family helpers.</p>

      <div className="help-grid">
        <article className="card">
          <h2>If something hurts</h2>
          <p className="subtitle">Stop the exercise. Sit down. Contact your clinic if pain is sudden or severe.</p>
        </article>
        <article className="card card-gradient">
          <h2>Video visits</h2>
          <p className="subtitle">
            Use Chrome or Edge on a computer or tablet. Allow camera and microphone when prompted. If video fails, call
            the clinic number on your appointment card.
          </p>
        </article>
        <article className="card">
          <h2>If text looks small</h2>
          <p className="subtitle">On a computer, press Ctrl and + to enlarge. On phone, use the Stride mobile app.</p>
        </article>
        <article className="card">
          <h2>Family helpers</h2>
          <p className="subtitle">You may tap buttons for the patient. Do not change the prescribed plan without the therapist.</p>
        </article>
        <article className="card">
          <h2>Emergency</h2>
          <p className="subtitle">Stride is not for emergencies. Call your local emergency number if someone is in danger.</p>
          <a className="btn btn-outline" href="tel:112">
            Call emergency services
          </a>
        </article>
      </div>
    </div>
  );
}
