"use client";

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "accent";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  destructive: "btn-destructive",
  accent: "btn-accent",
};

const sizeClass: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      block,
      loading,
      leftIcon,
      rightIcon,
      className = "",
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const classes = [
      "btn",
      variantClass[variant],
      sizeClass[size],
      block ? "btn-block" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!loading ? rightIcon : null}
      </button>
    );
  },
);
