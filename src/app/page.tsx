"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Radio,
  LogOut,
  Shield,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { SessionUser } from "@/types";

export default function HomePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Login inputs (username or email)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign up inputs
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Quick join room code input
  const [roomCode, setRoomCode] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setCurrentUser(d.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      setError("Username/Email and Password are required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginIdentifier, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName) {
      setError("Username is required");
      return;
    }

    if (!signupPassword || signupPassword.length < 4) {
      setError("Password is mandatory (min 4 characters)");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          role: "AUCTIONEER",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    router.push(`/room/${roomCode.trim().toUpperCase()}/join`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    setCurrentUser(null);
  };

  return (
    <div className="relative h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden text-slate-100 selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* 1. STATIC HIGH-DEFINITION STADIUM BACKGROUND */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none brightness-85"
        style={{
          backgroundImage: "url('/images/npl-login-stadium.png')",
        }}
      />

      {/* 2. ATMOSPHERIC STADIUM LIGHTING & VIGNETTE OVERLAYS */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#060913]/95 via-[#070b18]/80 to-[#060913]/98" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_15%,_rgba(5,8,17,0.92)_95%)]" />

      {/* Decorative Stadium Light Flares */}
      <div className="fixed -top-32 left-1/4 h-80 w-80 rounded-full bg-orange-500/15 blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-32 right-1/4 h-80 w-80 rounded-full bg-amber-500/15 blur-[120px] pointer-events-none z-0" />

      {/* 3. MAIN STATIC CONTAINER (FITS 100% IN VIEWPORT WITH ZERO SCROLL) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-4xl mx-auto py-2">
        {/* TOP HERO BRANDING */}
        <div className="text-center mb-2 sm:mb-2.5 max-w-xl mx-auto flex flex-col items-center">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 mb-1.5 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="NPL Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow">
            LIVE{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">
              NARAYANA GURU AUCTION
            </span>{" "}
            PORTAL
          </h1>

          <p className="mt-1 text-xs text-slate-300/80 font-medium max-w-md mx-auto">
            Official Live Volleyball Player Auction & Franchise Portal
          </p>
        </div>

        {/* CENTRAL GLOWING LOGIN CARD */}
        <div className="w-full max-w-[430px] rounded-3xl border border-amber-500/50 bg-[#080d1d]/92 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl glow-card-orange relative overflow-hidden">
          {/* Subtle interior glow accents */}
          <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />

          {/* IF CURRENTLY LOGGED IN */}
          {currentUser ? (
            <div className="text-center space-y-3 py-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-lg mx-auto shadow-md">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Signed In
                </span>
                <h3 className="text-base font-black text-white">{currentUser.name}</h3>
                <p className="text-[11px] text-slate-400">{currentUser.email}</p>
              </div>

              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-2.5 px-4 text-xs font-black text-slate-950 hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all"
              >
                <span>Go to Auction Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 py-2 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out / Switch Account</span>
              </button>
            </div>
          ) : (
            <>
              {/* SEGMENTED TABS: IDENTICAL BOXES & GENEROUS SPACING */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 h-12 w-full rounded-2xl px-3 transition-all duration-200 text-xs sm:text-[13px] ${
                    tab === "login"
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black border border-amber-400/90 shadow-lg shadow-orange-500/30 scale-[1.01]"
                      : "bg-[#0c1424] border border-slate-700/80 text-slate-300 font-bold hover:bg-[#101b32] hover:border-slate-600 hover:text-white shadow-inner"
                  }`}
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span className="truncate">Direct Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab("signup");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 h-12 w-full rounded-2xl px-3 transition-all duration-200 text-xs sm:text-[13px] ${
                    tab === "signup"
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black border border-amber-400/90 shadow-lg shadow-orange-500/30 scale-[1.01]"
                      : "bg-[#0c1424] border border-slate-700/80 text-slate-300 font-bold hover:bg-[#101b32] hover:border-slate-600 hover:text-white shadow-inner"
                  }`}
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span className="truncate">Sign Up (Pass Mandatory)</span>
                </button>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="mb-3 rounded-xl bg-rose-500/15 p-2.5 text-[11px] font-bold text-rose-300 border border-rose-500/30 flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError("")} className="text-rose-400 hover:text-white text-xs">
                    ✕
                  </button>
                </div>
              )}

              {/* 1. DIRECT LOGIN FORM */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  {/* Username or Email Input Field */}
                  <div>
                    <label className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Username or Email
                      </span>
                    </label>

                    <div className="group relative flex items-center rounded-2xl border border-slate-700/80 bg-[#0d1527]/90 backdrop-blur-md shadow-inner transition-all duration-200 hover:border-slate-500 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 focus-within:bg-[#0f1930]">
                      <div className="pl-3.5 pr-2.5 flex items-center justify-center text-amber-400/80 group-focus-within:text-amber-400 transition-colors shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Enter your username or email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full bg-transparent py-3 pr-3 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Input Field */}
                  <div>
                    <label className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Password
                      </span>
                    </label>

                    <div className="group relative flex items-center rounded-2xl border border-slate-700/80 bg-[#0d1527]/90 backdrop-blur-md shadow-inner transition-all duration-200 hover:border-slate-500 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 focus-within:bg-[#0f1930]">
                      <div className="pl-3.5 pr-2.5 flex items-center justify-center text-amber-400/80 group-focus-within:text-amber-400 transition-colors shrink-0">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-transparent py-3 pr-2 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="pr-3.5 pl-2 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1.5 min-h-[46px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 px-4 text-xs sm:text-sm font-black text-slate-950 hover:brightness-110 shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>Log In & Go to Dashboard</span>
                        <ArrowRight className="h-4 w-4 text-slate-950" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 2. SIGN UP FORM */}
              {tab === "signup" && (
                <form onSubmit={handleSignup} className="space-y-3">
                  <div>
                    <label className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Username
                      </span>
                    </label>

                    <div className="group relative flex items-center rounded-2xl border border-slate-700/80 bg-[#0d1527]/90 backdrop-blur-md shadow-inner transition-all duration-200 hover:border-slate-500 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 focus-within:bg-[#0f1930]">
                      <div className="pl-3.5 pr-2.5 flex items-center justify-center text-amber-400/80 group-focus-within:text-amber-400 transition-colors shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Choose your username"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full bg-transparent py-2.5 pr-3 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        Email Address (Optional)
                      </span>
                    </label>

                    <div className="group relative flex items-center rounded-2xl border border-slate-700/80 bg-[#0d1527]/90 backdrop-blur-md shadow-inner transition-all duration-200 hover:border-slate-500 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 focus-within:bg-[#0f1930]">
                      <div className="pl-3.5 pr-2.5 flex items-center justify-center text-amber-400/80 group-focus-within:text-amber-400 transition-colors shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="name@example.com (optional)"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full bg-transparent py-2.5 pr-3 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Password (Mandatory)
                      </span>
                    </label>

                    <div className="group relative flex items-center rounded-2xl border border-slate-700/80 bg-[#0d1527]/90 backdrop-blur-md shadow-inner transition-all duration-200 hover:border-slate-500 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 focus-within:bg-[#0f1930]">
                      <div className="pl-3.5 pr-2.5 flex items-center justify-center text-amber-400/80 group-focus-within:text-amber-400 transition-colors shrink-0">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showSignupPassword ? "text" : "password"}
                        required
                        placeholder="Choose password (min 4 chars)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full bg-transparent py-2.5 pr-2 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="pr-3.5 pl-2 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1.5 min-h-[46px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 px-4 text-xs sm:text-sm font-black text-slate-950 hover:brightness-110 shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>Sign Up & Go to Dashboard</span>
                        <ArrowRight className="h-4 w-4 text-slate-950" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* FRANCHISE OWNER ROOM JOINING */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-amber-400 mb-2">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>FRANCHISE OWNER? JOIN ROOM BY CODE</span>
            </div>

            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <div className="group relative flex-1 flex items-center rounded-xl border border-slate-700/80 bg-[#0d1527]/90 backdrop-blur-md shadow-inner transition-all duration-200 hover:border-slate-500 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25">
                <div className="pl-3 pr-2 text-amber-400/80 shrink-0">
                  <KeyRound className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="E.G.  VB-VVUDX"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-transparent py-2.5 pr-3 text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-amber-300 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!roomCode.trim()}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs px-5 py-2.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* FOOTER (COMPACT & CLEAN, NO SCROLL) */}
      <footer className="relative z-10 py-2.5 text-center text-[11px] text-slate-500 font-medium">
        <p>© 2026 Narayana Guru Premiere League (NPL) • Live Volleyball Player Auction</p>
      </footer>
    </div>
  );
}
