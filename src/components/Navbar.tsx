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
  Menu,
  X,
} from "lucide-react";
import { SessionUser } from "@/types";

interface NavbarProps {
  roomCode?: string;
  roomTitle?: string;
  roomStatus?: string;
  activeTab?: "dashboard" | "rooms" | "live" | "players" | "results";
  initialUser?: SessionUser | null;
}

export default function Navbar({
  roomCode,
  roomTitle,
  roomStatus = "LIVE",
  activeTab = "live",
  initialUser = null,
}: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      return;
    }
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, [initialUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  return (
    <header className="sticky top-2 sm:top-3 z-50 flex flex-col items-center px-3 pointer-events-none">
      {/* Dynamic Island Floating Capsule */}
      <div className="pointer-events-auto flex items-center justify-between gap-1.5 sm:gap-3 rounded-full border border-amber-500/35 bg-[#080d1b]/92 px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/10 transition-all max-w-full">
        {/* Navigation Tabs (Capsule / Pill Buttons) */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Dashboard</span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              activeTab === "rooms"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Rooms</span>
          </Link>

          {roomCode ? (
            <Link
              href={`/room/${roomCode}/live`}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-black transition-all duration-200 ${
                activeTab === "live"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]"
                  : "text-amber-400 hover:bg-amber-500/15"
              }`}
            >
              <Radio className="h-3.5 w-3.5 animate-pulse shrink-0" />
              <span>Live Arena</span>
            </Link>
          ) : (
            <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 cursor-not-allowed select-none">
              <Radio className="h-3.5 w-3.5 shrink-0" />
              <span>Live Arena</span>
            </span>
          )}

          {roomCode && (
            <>
              <Link
                href={`/room/${roomCode}/players`}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  activeTab === "players"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Players</span>
              </Link>

              <Link
                href={`/room/${roomCode}/results`}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  activeTab === "results"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                <span>Results</span>
              </Link>
            </>
          )}
        </nav>

        {/* Room Code Badge (if active in room) */}
        {roomCode && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 text-[11px] font-mono">
            <span className="text-slate-400 font-bold">ROOM:</span>
            <span className="font-black text-amber-400">{roomCode}</span>
          </div>
        )}

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-slate-700/80 mx-0.5 sm:mx-1" />

        {/* User Details & Logout Button */}
        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-2 sm:pr-2.5 py-0.5 rounded-full bg-slate-900/70 border border-slate-700/60 shadow-inner">
              {/* Avatar Initial Circle */}
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950 font-black text-xs shadow-md shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>

              {/* Name & Role Details */}
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[9px] font-semibold text-amber-400/90 flex items-center gap-0.5 mt-0.5">
                  <Gavel className="h-2 w-2 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {user.role === "AUCTIONEER"
                      ? "Auctioneer"
                      : user.role === "TEAM_OWNER"
                      ? "Owner"
                      : "Viewer"}
                  </span>
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/70 hover:border-rose-500/40 transition-colors shrink-0 shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href="/auth/login"
              className="rounded-full px-3 py-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-700/70"
            >
              Log In
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-slate-950 hover:bg-amber-400 shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        )}

        {/* Mobile Expand Button (only when in room to see Players/Results) */}
        {roomCode && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-slate-300 hover:text-white shrink-0 ml-0.5"
          >
            {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Mobile Drawer (Nested Island Dropdown) */}
      {mobileMenuOpen && roomCode && (
        <div className="pointer-events-auto mt-2 w-full max-w-xs rounded-2xl border border-amber-500/30 bg-[#080d1b]/95 p-2 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <Link
            href={`/room/${roomCode}/players`}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
              activeTab === "players"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Users className="h-4 w-4 text-cyan-400" />
            <span>Player Rosters</span>
          </Link>

          <Link
            href={`/room/${roomCode}/results`}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
              activeTab === "results"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Auction Results</span>
          </Link>
        </div>
      )}
    </header>
  );
}
