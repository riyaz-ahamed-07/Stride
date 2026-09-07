"use client";

import { ReactNode } from "react";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="async-loading" role="status" aria-live="polite">
      <div className="async-skeleton" aria-hidden="true" />
      <p className="care-status-copy">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="async-empty" aria-live="polite">
      <h2>{title}</h2>
      <p className="care-empty">{body}</p>
      {action ? <div className="async-empty-action">{action}</div> : null}
    </section>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="care-alert" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button className="btn btn-primary" type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <p className="async-success" role="status">
      {message}
    </p>
  );
}
