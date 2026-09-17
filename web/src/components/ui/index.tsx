import { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent,
  ...rest
}: HTMLAttributes<HTMLElement> & { accent?: boolean }) {
  return (
    <section
      className={`card${accent ? " card-gradient" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "pending"
    | "error"
    | "info"
    | "primary";
  className?: string;
}) {
  const toneClass =
    tone === "default"
      ? "badge-default"
      : tone === "primary"
        ? "badge-primary"
        : tone === "error"
          ? "badge-error"
          : tone === "info"
            ? "badge-info"
            : `badge-${tone}`;
  return (
    <span className={`badge ${toneClass} ${className}`.trim()}>{children}</span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-header-title">{title}</h1>
        {subtitle ? <p className="page-header-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <span>{title}</span>
      {action}
    </div>
  );
}

export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
}) {
  return (
    <div className={`ui-alert ui-alert-${tone}`} role="alert">
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`ui-skeleton ${className}`.trim()} aria-hidden="true" />
  );
}
