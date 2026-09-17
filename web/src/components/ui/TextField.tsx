"use client";

import { InputHTMLAttributes, ReactNode, useId } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextField({
  label,
  hint,
  error,
  leftIcon,
  className = "",
  id,
  ...rest
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`field${error ? " field-error" : ""} ${className}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <div className={leftIcon ? "field-with-icon" : undefined}>
        {leftIcon ? <span className="field-icon">{leftIcon}</span> : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          {...rest}
        />
      </div>
      {error ? (
        <p className="field-error-msg" id={errorId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
