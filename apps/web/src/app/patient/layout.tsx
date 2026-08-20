"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";

export default function PatientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.includes("/patient/consult/")) {
    return <>{children}</>;
  }
  return <DashboardShell role="patient">{children}</DashboardShell>;
}
