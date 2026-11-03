"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Trophy, Mail, Lock, User, ArrowRight, Loader2, Sparkles, LogIn, UserPlus } from "lucide-react";
import { SessionUser } from "@/types";

export default function HomePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login inputs
  const [loginEmail, setLoginEmail] = useState("");
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
    if (!loginEmail || !loginPassword) {
      setError("Email and Password are mandatory");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail) {
      setError("Name and Email are required");
      return;
    }

    if (!signupPassword || signupPassword.length < 4) {
      setError("Password is mandatory (minimum 4 characters)");
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
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    router.push(`/room/${roomCode.trim().toUpperCase()}/join`);
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col arena-court-bg">
      <Navbar activeTab="dashboard" />

      <main className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 mb-4 backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            <span>NARAYANA GURU PREMIERE LEAGUE (NPL)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            LIVE VOLLEYBALL AUCTION PORTAL
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Log in or sign up to manage your Narayana Guru Premiere League auction rooms, or join as a team owner using a room code.
          </p>
        </div>

        {/* Auth / Entrance Card */}
        <div className="max-w-md mx-auto w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {currentUser ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mx-auto">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Signed in as {currentUser.name}</h3>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
              >
                <span>Go to Auction Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    tab === "login"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Direct Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab("signup");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    tab === "signup"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Sign Up (Pass Mandatory)</span>
                </button>
              </div>

              {error && (
                <div className="mb-5 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20">
                  {error}
                </div>
              )}

              {/* Login Form */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="auctioneer@npl.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Password <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Log In & Go to Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Sign Up Form (Password Mandatory) */}
              {tab === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Auctioneer / Manager Name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="name@npl.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Password (Mandatory) <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Choose a secure password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign Up & Open Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Quick Team Join by Room Code */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Franchise Owner? Join Room by Code
            </span>
            <form onSubmit={handleJoinByCode} className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="e.g. NPL-2026"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs font-mono font-bold text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none uppercase"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 border border-slate-700"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <p>© 2026 Narayana Guru Premiere League (NPL) • Live Player Auction System</p>
      </footer>
    </div>
  );
}
