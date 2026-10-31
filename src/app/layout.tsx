import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Fraunces, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/NavProgress";
import { RegisterSW } from "@/components/RegisterSW";

// Google renamed "Big Shoulders Display" to "Big Shoulders"; same face (requirements doc, section 17).
const display = Big_Shoulders({ subsets: ["latin"], weight: ["900"], variable: "--font-big-shoulders", display: "swap" });
const accent = Fraunces({ subsets: ["latin"], style: ["italic"], weight: ["600"], variable: "--font-fraunces", display: "swap" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Devatop Volunteers: Volunteers are known by action", template: "%s · Devatop Volunteers" },
  icons: { apple: "/icons/apple-touch-icon.png" }, // the browser tab icon is src/app/icon.png and favicon.ico
  appleWebApp: { capable: true, title: "Volunteers", statusBarStyle: "default" },
  description: "Join the young people fighting human trafficking, gender-based violence and other abuses across Nigeria. Bring your time, your skill, your voice.",
};
export const viewport: Viewport = { themeColor: "#F05023", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${accent.variable} ${body.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
        <NavProgress />
        <RegisterSW />
      </body>
    </html>
  );
}
