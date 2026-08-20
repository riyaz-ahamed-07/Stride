import Link from "next/link";

export function SiteNav({ signIn = true }: { signIn?: boolean }) {
  return (
    <header className="site-nav marketing-nav">
      <div className="container nav-inner">
        <Link className="logo" href="/">
          <span className="logo-mark">S</span>
          Stride
        </Link>
        <nav className="nav-menu" aria-label="Main navigation">
          <Link className="nav-link" href="/#features">
            Features
          </Link>
          <Link className="nav-link" href="/#how-it-works">
            How it works
          </Link>
          <Link className="nav-link" href="/#video">
            Video visits
          </Link>
          <Link className="nav-link" href="/#safety">
            Safety
          </Link>
        </nav>
        <div className="nav-actions">
          {signIn ? (
            <>
              <Link className="nav-link" href="/login">
                Sign in
              </Link>
              <Link className="nav-cta" href="/login">
                Book a visit
              </Link>
            </>
          ) : null}
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
        <span className="logo-mark">S</span>
        Stride
      </Link>
      {onSignOut ? (
        <button type="button" className="nav-link" onClick={onSignOut}>
          Sign out
        </button>
      ) : null}
    </header>
  );
}
