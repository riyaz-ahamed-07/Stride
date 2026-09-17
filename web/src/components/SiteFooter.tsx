import Link from "next/link";
import { StrideLogoMark } from "@/components/StrideLogo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="logo" href="/">
            <StrideLogoMark size={36} variant="icon" />
            Stride
          </Link>
          <p className="footer-tagline">
            Therapist-led tele-physiotherapy with home exercises, appointments,
            and secure video visits.
          </p>
        </div>
        <div>
          <h4 className="footer-heading">Platform</h4>
          <Link href="/#features">Features</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/login">Patient sign in</Link>
        </div>
        <div>
          <h4 className="footer-heading">Clinic</h4>
          <Link href="/login">Therapist portal</Link>
          <Link href="/login">Admin</Link>
          <Link href="/#safety">Safety</Link>
        </div>
        <div>
          <h4 className="footer-heading">Support</h4>
          <Link href="/patient/help">Help centre</Link>
          <a href="mailto:support@stride.clinic">support@stride.clinic</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Stride Clinic Demo · Review 3</span>
        <span>Not for emergency use</span>
      </div>
    </footer>
  );
}
