import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "Stride — First Review",
    description: "Stride's concise, interactive first-review presentation: an AI-assisted tele-physiotherapy platform.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "Stride — Rehabilitation, reconnected.", description: "AI-assisted tele-physiotherapy, with the therapist in control.", images: [{ url: `${origin}/og.png`, width: 1734, height: 907, alt: "Stride — Rehabilitation, reconnected." }] },
    twitter: { card: "summary_large_image", title: "Stride — Rehabilitation, reconnected.", description: "AI-assisted tele-physiotherapy, with the therapist in control.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
