import Link from "next/link";
import { ReactNode } from "react";
import { StrideLogoMark } from "@/components/StrideLogo";

export function AuthBrandPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-visual">
      <Link className="logo auth-logo" href="/">
        <StrideLogoMark size={40} variant="icon-white" />
        Stride
      </Link>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
