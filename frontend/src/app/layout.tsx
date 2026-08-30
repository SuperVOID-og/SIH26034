import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/layout/AppShell";
import { Sora, Inter, IBM_Plex_Sans } from "next/font/google";

const sora = Sora({ 
  subsets: ["latin"], 
  variable: "--font-sora",
  display: "swap"
});

const inter = Inter({
  weight: ['400', '500', '600'],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-ibm",
  display: "swap"
});

export const metadata: Metadata = {
  title: "PackSure AI",
  description: "Compliance Intelligence Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${ibmPlexSans.variable}`}>
      <body className="antialiased font-sans">
        {/* Animated Background Atmosphere */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 no-print bg-[#0D1117]">
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full bg-[#2DD4BF] opacity-[0.05] blur-[100px] mix-blend-screen ps-ambient-teal" />
          <div className="absolute top-[10%] right-[-20%] w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] rounded-full bg-[#3B82F6] opacity-[0.06] blur-[120px] mix-blend-screen ps-ambient-blue" />
          <div className="absolute bottom-[-20%] right-[10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-[#7C5CFC] opacity-[0.04] blur-[100px] mix-blend-screen ps-ambient-violet" />
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
