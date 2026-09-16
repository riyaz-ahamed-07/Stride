import Link from "next/link";
import { ReactNode } from "react";

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
        <span className="logo-mark">S</span>
        Stride
      </Link>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
