"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Trophy,
  Plus,
  Users,
  Copy,
  Check,
  Share2,
  Radio,
  Clock,
  UserPlus,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Trash2,
  AlertTriangle,
  Flame,
  Shield,
  Layers,
  Activity,
} from "lucide-react";
import { SessionUser } from "@/types";

interface RoomSummary {
  id: string;
  title: string;
  roomCode: string;
  status: string;
  startingPurse: number;
  expectedTeamsCount?: number;
  playersPerTeam?: number;
  createdAt?: string;
  _count: {
    teams: number;
    players: number;
  };
  teams: Array<{
    id: string;
    name: string;
    logoUrl: string | null;
    remainingPurse: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Deletion state
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<RoomSummary | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRooms = () => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((d) => {
        if (d.rooms) setRooms(d.rooms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/");
        } else {
          setCurrentUser(d.user);
        }
      })
      .catch(() => router.push("/"));

    fetchRooms();
  }, [router]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/room/${code}/join`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleShareWhatsApp = (code: string, title: string) => {
    const inviteUrl = `${window.location.origin}/room/${code}/join`;
    const message = encodeURIComponent(
      `🏐 *Narayana Guru Premiere League (NPL)*\n\nYou're invited to register your team for the live auction:\n🏆 *${title}*\n🔑 *Room Code:* ${code}\n🔗 *Join Link:* ${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    const code = roomToDelete.roomCode;
    setDeletingCode(code);
    setNotification(null);

    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Failed to delete room" });
      } else {
        setRooms((prev) => prev.filter((r) => r.roomCode !== code));
        setNotification({ type: "success", text: `Room ${code} was successfully deleted.` });
        setRoomToDelete(null);
      }
    } catch {
      setNotification({ type: "error", text: "Network error while deleting room." });
    } finally {
      setDeletingCode(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b16] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-slate-300">Loading your NPL Auction dashboard...</p>
      </div>
    );
  }

  // Dashboard Aggregates
  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r) => r.status === "LIVE").length;
  const waitingRooms = rooms.filter((r) => r.status === "WAITING" || r.status === "DRAFT").length;
  const totalFranchises = rooms.reduce((acc, r) => acc + (r._count?.teams || 0), 0);
  const totalPlayers = rooms.reduce((acc, r) => acc + (r._count?.players || 0), 0);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* 1. CINEMATIC DARK VOLLEYBALL ARENA BACKGROUND (CLEARLY VISIBLE STADIUM DETAILS) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/dash.jpg"
          alt="Volleyball Arena Background"
          fill
          priority
          className="object-cover object-center opacity-50 brightness-95 contrast-110 scale-100 transition-transform duration-1000"
        />
        {/* Balanced Dark Vignette & Gradient Overlays - Keeps Arena Visible & Content Readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/80 via-[#070b18]/55 to-[#060913]/88" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(6,9,19,0.85)_100%)]" />

        {/* Stadium Floodlight Ambient Accents */}
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-amber-500/15 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-orange-600/15 blur-[100px] pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar activeTab="dashboard" />

      <main className="flex-1 max-w-[1700px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Section with Panoramic Stadium Hero Graphic */}
        <div className="rounded-2xl border border-amber-500/30 bg-[#090e1e]/95 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
          {/* Panoramic Stadium Banner Background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <Image
              src="/images/npl-hero-banner.jpg"
              alt="Stadium Hero Banner"
              fill
              priority
              className="object-cover object-right sm:object-center opacity-65 group-hover:scale-105 transition-transform duration-700"
            />
            {/* Dark gradient mask on left so text stays 100% crystal clear */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#070c1a] via-[#070c1a]/85 to-transparent sm:w-2/3" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070c1a]/80 via-transparent to-transparent" />
            {/* Subtle amber rim glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-2xl">

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">
              Welcome back, <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">{currentUser?.name || "Auctioneer"}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-1.5 font-medium max-w-xl drop-shadow">
              Manage your Narayana Guru Premiere League live auctions, franchises, player rosters, and real-time bidding rooms.
            </p>
          </div>

          <div className="relative z-10">
            <Link
              href="/room/create"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-6 py-3.5 text-xs sm:text-sm font-black text-slate-950 hover:brightness-110 transition-all shadow-xl shadow-amber-500/30 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 text-slate-950 stroke-[3]" />
              <span>Create New Auction Room</span>
            </Link>
          </div>
        </div>

        {/* 5 KPI Metric Cards matching reference visual language */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Rooms */}
          <div className="rounded-2xl bg-[#090e1c] border border-slate-800/90 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Tournament Rooms
              </span>
              <Layers className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black font-mono text-white">{totalRooms}</p>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Created Rooms</span>
          </div>

          {/* Active Live Rooms */}
          <div className="rounded-2xl bg-[#090e1c] border border-rose-500/30 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                Live Arenas
              </span>
              <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
            </div>
            <p className="text-2xl font-black font-mono text-rose-400">{activeRooms}</p>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Currently Live</span>
          </div>

          {/* Waiting Rooms */}
          <div className="rounded-2xl bg-[#090e1c] border border-slate-800/90 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Waiting Rooms
              </span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black font-mono text-amber-400">{waitingRooms}</p>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Pre-Auction Stage</span>
          </div>

          {/* Registered Franchises */}
          <div className="rounded-2xl bg-[#090e1c] border border-slate-800/90 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Franchises
              </span>
              <Shield className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black font-mono text-cyan-400">{totalFranchises}</p>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Registered Teams</span>
          </div>

          {/* Registered Players */}
          <div className="rounded-2xl bg-[#090e1c] border border-slate-800/90 p-4 shadow-lg col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Athletes
              </span>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black font-mono text-emerald-400">{totalPlayers}</p>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 block">In Roster Pools</span>
          </div>
        </div>

        {/* Status Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
              notification.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            <span>{notification.text}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {roomToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#090e1d] p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Delete Auction Room?</h3>
                  <p className="text-xs text-rose-400 font-semibold">{roomToDelete.title}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete room <strong className="text-amber-400">{roomToDelete.roomCode}</strong>? This action cannot be undone. All teams, players, bids, and auction events will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={Boolean(deletingCode)}
                  onClick={() => setRoomToDelete(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingCode)}
                  onClick={handleDeleteRoom}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 disabled:opacity-50"
                >
                  {deletingCode ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Yes, Delete Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <span>Your Tournament Rooms ({rooms.length})</span>
            </h2>
          </div>

          {rooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#090e1c]/60 p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Auction Rooms Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-6">
                Create your first Narayana Guru Premiere League auction room to register teams and commence live bidding.
              </p>
              <Link
                href="/room/create"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black text-slate-950 hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
                Create Room Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-2xl border border-slate-800/90 bg-[#090e1d]/90 p-6 shadow-xl hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative"
                >
                  {/* Left Info: Room Code + Status + Title + Counts + Purse */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-black text-amber-400 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        {room.roomCode}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                          room.status === "LIVE"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
                            : room.status === "WAITING"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">{room.title}</h3>
                      <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-cyan-400" />
                          <strong className="text-slate-200">{room._count.teams}</strong> Franchises
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5 text-amber-400" />
                          <strong className="text-slate-200">{room._count.players}</strong> Athletes
                        </span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          ₹{room.startingPurse?.toLocaleString("en-IN")} Purse / Team
                        </span>
                      </div>
                    </div>

                    {/* Share & Invite Buttons */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => handleCopyCode(room.roomCode)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold text-slate-300 hover:text-white border border-slate-800"
                      >
                        {copiedCode === room.roomCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        <span>{copiedCode === room.roomCode ? "Code Copied" : "Copy Code"}</span>
                      </button>

                      <button
                        onClick={() => handleCopyInviteLink(room.roomCode)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white border border-slate-800"
                      >
                        {copiedLink === room.roomCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5 text-cyan-400" />
                        )}
                        <span>{copiedLink === room.roomCode ? "Link Copied" : "Copy Share Link"}</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(room.roomCode, room.title)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                      >
                        <span>Share WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Actions: Working Buttons for Waiting Room, Live Arena, Players, Results, Delete */}
                  <div className="flex items-center gap-2.5 flex-wrap border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
                    <Link
                      href={`/room/${room.roomCode}/players`}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Players ({room._count.players})</span>
                    </Link>

                    <Link
                      href={`/room/${room.roomCode}/waiting`}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Waiting Room</span>
                    </Link>

                    <Link
                      href={`/room/${room.roomCode}/live`}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-black text-slate-950 hover:brightness-110 transition-all shadow-md shadow-amber-500/20"
                    >
                      <Radio className="h-3.5 w-3.5 text-slate-950" />
                      <span>Live Arena</span>
                    </Link>

                    <Link
                      href={`/room/${room.roomCode}/results`}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                      <span>Results</span>
                    </Link>

                    {/* Delete Room Button */}
                    <button
                      type="button"
                      onClick={() => setRoomToDelete(room)}
                      title="Delete Auction Room"
                      className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 px-3 py-2 text-xs font-bold text-rose-400 border border-rose-500/25 transition-all hover:border-rose-500/40"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
