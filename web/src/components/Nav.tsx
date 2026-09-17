"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StrideLogoMark } from "@/components/StrideLogo";

const LINKS = [
  { href: "/", label: "Home", match: "home" },
  { href: "/#features", label: "Features", match: "features" },
  { href: "/#how-it-works", label: "How it works", match: "how-it-works" },
  { href: "/#video", label: "Video", match: "video" },
  { href: "/#safety", label: "Safety", match: "safety" },
] as const;

export function SiteNav({ signIn = true }: { signIn?: boolean }) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="marketing-nav">
      <div className="nav-shell">
        <div className="nav-pill">
          <Link className="logo" href="/">
            <StrideLogoMark size={36} variant="icon" />
            <span className="logo-word">Stride</span>
          </Link>

          <nav className="nav-menu" aria-label="Main navigation">
            {LINKS.map((link) => {
              const active = link.match === "home" ? onHome : false;
              return (
                <Link
                  key={link.href}
                  className={`nav-link${active ? " is-active" : ""}`}
                  href={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="nav-actions">
            {signIn ? (
              <div className="nav-auth">
                <Link className="nav-login" href="/login">
                  Log in
                </Link>
                <Link className="nav-signup" href="/signup">
                  Sign up
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppNav({
  homeHref,
  onSignOut,
}: {
  homeHref: string;
  onSignOut?: () => void;
}) {
  return (
    <header className="site-nav">
      <Link className="logo" href={homeHref}>
        <StrideLogoMark size={36} variant="icon" />
        <span className="logo-word">Stride</span>
      </Link>
      {onSignOut ? (
        <button type="button" className="nav-link" onClick={onSignOut}>
          Sign out
        </button>
      ) : null}
    </header>
  );
}
