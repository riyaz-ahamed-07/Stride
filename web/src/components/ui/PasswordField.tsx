"use client";

import { InputHTMLAttributes, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  label: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordField({ label, error, hint, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`field${error ? " field-error" : ""}`}>
      <label htmlFor={inputId}>{label}</label>
      <div className="field-password">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete={rest.autoComplete ?? "current-password"}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <button
          type="button"
          className="field-password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error ? (
        <p className="field-error-msg" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}
