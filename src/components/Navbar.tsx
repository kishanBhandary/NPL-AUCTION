"use client";

import Link from "next/link";
import Image from "next/image";
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
}

export default function Navbar({
  roomCode,
  roomTitle,
  roomStatus = "LIVE",
  activeTab = "live",
}: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070b16]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1700px] items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Left: NPL Logo + NPL AUCTION Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group">
            {/* Tournament Logo */}
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.png"
                alt="NPL Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="flex flex-col">
              <span className="font-black tracking-tight text-base sm:text-lg text-white whitespace-nowrap">
                NPL <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">AUCTION</span>
              </span>
              <span className="hidden sm:block text-[9px] text-slate-400 tracking-wider uppercase font-bold">
                NARAYANA GURU PREMIERE LEAGUE
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation Tabs (Desktop) */}
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

        {/* Right Section: Room Code Pill + User Profile + Mobile Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Room Code Badge */}
          {roomCode && (
            <div className="flex items-center gap-1 sm:gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 shadow-inner">
              <span className="font-mono text-[10px] sm:text-xs font-black text-slate-300">
                <span className="hidden sm:inline">ROOM: </span>
                <strong className="text-amber-400">{roomCode}</strong>
              </span>
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {roomStatus}
              </span>
            </div>
          )}

          {/* User Profile / Login */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900/80 border border-slate-800 py-1 px-1.5 sm:px-2.5">
                {/* Orange Circular Avatar with initial */}
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-black text-slate-950 shadow-md shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight max-w-[100px] truncate">
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
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/auth/login"
                className="rounded-xl px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl bg-amber-500 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/90 bg-[#080d1b] px-4 py-3 space-y-2 animate-in slide-in-from-top duration-200">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
              activeTab === "dashboard"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-slate-300 hover:bg-slate-900"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-amber-400" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
              activeTab === "rooms"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-slate-300 hover:bg-slate-900"
            }`}
          >
            <Layers className="h-4 w-4 text-amber-400" />
            <span>Rooms</span>
          </Link>

          {roomCode && (
            <>
              <Link
                href={`/room/${roomCode}/live`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black ${
                  activeTab === "live"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>Live Auction Arena</span>
              </Link>

              <Link
                href={`/room/${roomCode}/players`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === "players"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <Users className="h-4 w-4 text-cyan-400" />
                <span>Player Rosters</span>
              </Link>

              <Link
                href={`/room/${roomCode}/results`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === "results"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Auction Results</span>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
