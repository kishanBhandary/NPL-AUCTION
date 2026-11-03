"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Layers,
  Radio,
  Users,
  FileSpreadsheet,
  LogOut,
  Gavel,
  ShieldCheck,
} from "lucide-react";
import { SessionUser } from "@/types";

interface NavbarProps {
  roomCode?: string;
  roomTitle?: string;
  roomStatus?: string;
  activeTab?: "dashboard" | "rooms" | "live" | "players" | "results";
}

export default function Navbar({
  roomCode,
  roomTitle,
  roomStatus = "LIVE",
  activeTab = "live",
}: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  const isLive = roomStatus === "LIVE";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070b16]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1700px] items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Left: Volleyball Icon + NPL AUCTION + LIVE badge + League subtitle */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Volleyball Golden Ball Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <svg
                className="h-6 w-6 text-slate-950"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg text-white">
                  NPL <span className="text-amber-400">AUCTION</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm shadow-rose-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
              </div>
              <span className="text-[9px] text-slate-400 tracking-wider uppercase font-bold">
                NARAYANA GURU PREMIERE LEAGUE
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation Tabs - exactly matching reference screenshot */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "rooms"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Rooms</span>
          </Link>

          {roomCode ? (
            <Link
              href={`/room/${roomCode}/live`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "live"
                  ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md shadow-amber-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
              <span>Live Arena</span>
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
            >
              <Radio className="h-4 w-4" />
              <span>Live Arena</span>
            </button>
          )}

          {roomCode && (
            <>
              <Link
                href={`/room/${roomCode}/players`}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "players"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Players</span>
              </Link>

              <Link
                href={`/room/${roomCode}/results`}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "results"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Results</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Section: Room Code Pill + User Profile */}
        <div className="flex items-center gap-3">
          {/* Room Code Badge */}
          {roomCode && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 shadow-inner">
              <span className="font-mono text-xs font-black text-slate-300">
                ROOM: <strong className="text-amber-400">{roomCode}</strong>
              </span>
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {roomStatus}
              </span>
            </div>
          )}

          {/* User Profile / Login */}
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-800 py-1 px-2.5">
                {/* Orange Circular Avatar with initial */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-black text-slate-950 shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                    <Gavel className="h-2.5 w-2.5 text-amber-400" />
                    {user.role === "AUCTIONEER"
                      ? "Auctioneer"
                      : user.role === "TEAM_OWNER"
                      ? "Franchise Owner"
                      : "Viewer"}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Log Out"
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
