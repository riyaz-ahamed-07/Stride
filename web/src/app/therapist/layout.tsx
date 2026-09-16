"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";

export default function TherapistLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.includes("/therapist/consult/")) {
    return <>{children}</>;
  }
  return <DashboardShell role="physiotherapist">{children}</DashboardShell>;
}
