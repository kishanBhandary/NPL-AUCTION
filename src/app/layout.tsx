import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narayana Guru Premiere League (NPL) | Live Volleyball Auction",
  description: "Official real-time player auction platform for Narayana Guru Premiere League.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
