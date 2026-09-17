import Image from "next/image";

export type LogoVariant = "primary" | "white" | "black" | "icon" | "icon-white";

const SRC: Record<LogoVariant, string> = {
  primary: "/brand/logo-primary.png",
  white: "/brand/logo-white.png",
  black: "/brand/logo-black.png",
  icon: "/brand/icon.png",
  "icon-white": "/brand/icon-white.png",
};

type Props = {
  size?: number;
  variant?: LogoVariant;
  className?: string;
};

export function StrideLogoMark({
  size = 34,
  variant = "primary",
  className,
}: Props) {
  return (
    <span
      className={className ? `logo-mark ${className}` : "logo-mark"}
      data-variant={variant}
      aria-hidden="true"
    >
      <Image
        src={SRC[variant]}
        alt=""
        width={size}
        height={size}
        priority
        className="logo-mark-img"
      />
    </span>
  );
}
