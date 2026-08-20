"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { clearSession, readSession } from "@/lib/api";

type Role = "patient" | "physiotherapist" | "administrator";

const patientLinks = [
  { href: "/patient", label: "Dashboard", icon: "🏠" },
  { href: "/patient/exercises", label: "Exercises", icon: "🏃" },
  { href: "/patient/appointments", label: "Appointments", icon: "📅" },
  { href: "/patient/help", label: "Help", icon: "❓" },
];

const therapistLinks = [
  { href: "/therapist", label: "Clinic board", icon: "📋" },
  { href: "/therapist/appointments", label: "Appointments", icon: "📅" },
];

const adminLinks = [{ href: "/admin", label: "Users", icon: "👤" }];

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

export function DashboardShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const links = linksFor(role);

  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== role) {
      window.location.href = "/login";
    }
  }, [role]);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="logo sidebar-logo" href={homeFor(role)}>
          <span className="logo-mark">S</span>
          Stride
        </Link>
        <p className="sidebar-role">
          {role === "patient" ? "Patient portal" : role === "physiotherapist" ? "Therapist portal" : "Administration"}
        </p>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {links.map((link) => {
            const isHome = link.href === homeFor(role);
            const active =
              pathname === link.href ||
              (!isHome && (pathname.startsWith(`${link.href}/`) || pathname === link.href));
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
                <span className="sidebar-icon">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Link className="sidebar-link-muted" href="/">
            ← Public website
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-block"
            onClick={() => {
              clearSession();
              window.location.href = "/";
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="dashboard-main">{children}</div>
    </div>
  );
}
