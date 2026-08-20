import { DashboardShell } from "@/components/DashboardShell";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="administrator">{children}</DashboardShell>;
}
