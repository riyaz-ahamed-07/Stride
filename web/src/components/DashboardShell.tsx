"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import {
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Home,
  LineChart,
  LogOut,
  Users,
} from "lucide-react";
import { clearSession, readSession, routeAfterLogin } from "@/lib/api";
import { StrideLogoMark } from "@/components/StrideLogo";

type Role = "patient" | "physiotherapist" | "administrator";

const patientLinks = [
  { href: "/patient", label: "Today", Icon: Home },
  { href: "/patient/exercises", label: "Plan", Icon: ClipboardList },
  { href: "/patient/progress", label: "Progress", Icon: LineChart },
  { href: "/patient/appointments", label: "Appointments", Icon: CalendarDays },
  { href: "/patient/help", label: "Help", Icon: HelpCircle },
];

const therapistLinks = [
  { href: "/therapist", label: "Patients", Icon: Users },
  { href: "/therapist/plans", label: "Plans", Icon: ClipboardList },
  { href: "/therapist/reviews", label: "Reviews", Icon: LineChart },
  {
    href: "/therapist/appointments",
    label: "Appointments",
    Icon: CalendarDays,
  },
];

const adminLinks = [{ href: "/admin", label: "Users", Icon: Users }];

function linksFor(role: Role) {
  if (role === "patient") return patientLinks;
  if (role === "physiotherapist") return therapistLinks;
  return adminLinks;
}

function homeFor(role: Role) {
  if (role === "patient") return "/patient";
  if (role === "physiotherapist") return "/therapist";
  return "/admin";
}

function roleLabel(role: Role) {
  if (role === "patient") return "Patient";
  if (role === "physiotherapist") return "Physiotherapist";
  return "Administrator";
}

function isActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === href;
  if (href === "/therapist/plans") {
    return (
      pathname.startsWith("/therapist/plans") ||
      pathname.startsWith("/therapist/exercises")
    );
  }
  if (href === "/therapist/reviews") {
    return (
      pathname.startsWith("/therapist/reviews") ||
      pathname.startsWith("/therapist/progress")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const links = linksFor(role);
  const homeHref = homeFor(role);
  const density = role === "patient" ? "density-patient" : "density-clinical";

  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== role) {
      window.location.href = "/login";
      return;
    }
    if (session.status && session.status !== "active") {
      const next = routeAfterLogin(session);
      if (next !== pathname) {
        window.location.href = next;
      }
    }
  }, [role, pathname]);

  return (
    <div className={`dashboard-shell ${density}`}>
      <header className="marketing-nav dashboard-topnav">
        <div className="nav-shell">
          <div className="nav-pill">
            <Link className="logo" href={homeHref}>
              <StrideLogoMark size={36} variant="icon" />
              <span className="logo-word">Stride</span>
            </Link>

            <nav
              className="nav-menu dashboard-nav-menu"
              aria-label="Dashboard navigation"
            >
              {links.map((link) => {
                const active = isActive(pathname, link.href, homeHref);
                const Icon = link.Icon;
                return (
                  <Link
                    key={link.href}
                    className={`nav-link${active ? " is-active" : ""}`}
                    href={link.href}
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className="nav-link-icon"
                    />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="nav-actions">
              <div className="nav-auth">
                <span className="dashboard-nav-role">{roleLabel(role)}</span>
                <button
                  type="button"
                  className="nav-login"
                  onClick={() => {
                    clearSession();
                    window.location.href = "/";
                  }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="dashboard-main">{children}</div>
    </div>
  );
}
