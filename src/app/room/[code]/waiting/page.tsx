"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import WaitingRoomRoster from "@/components/WaitingRoomRoster";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Copy, Check, Users, UserPlus, Radio, Loader2 } from "lucide-react";
import { RoomDetails, SessionUser } from "@/types";

export default function WaitingRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        if (data.room.status === "LIVE") {
          router.push(`/room/${code}/live`);
        }
      }
    } catch {
      // Quiet background refresh error
    } finally {
      setLoading(false);
    }
  }, [code, router]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});

    fetchRoom();

    // 1. Fast SSE listener
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/auction/${code}/stream`);

      eventSource.addEventListener("TEAM_JOINED", () => {
        fetchRoom();
      });

      eventSource.addEventListener("TEAM_READY_TOGGLED", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.teamId && payload?.isReady !== undefined) {
            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                teams: prev.teams.map((t) =>
                  t.id === payload.teamId ? { ...t, isReady: payload.isReady } : t
                ),
              };
            });
          }
        } catch {}
        fetchRoom();
      });

      eventSource.addEventListener("AUCTION_LAUNCHED", () => {
        router.push(`/room/${code}/live`);
      });

      eventSource.addEventListener("PLAYER_ADDED", () => {
        fetchRoom();
      });
    } catch {}

    // 2. Supabase Realtime subscription
    const supabaseClient = getSupabaseClient();
    let supabaseChannel: RealtimeChannel | null = null;
    if (supabaseClient) {
      supabaseChannel = supabaseClient.channel(`auction_${code}`);

      supabaseChannel
        .on("broadcast", { event: "TEAM_JOINED" }, () => {
          fetchRoom();
        })
        .on("broadcast", { event: "TEAM_READY_TOGGLED" }, (payload) => {
          if (payload?.payload?.teamId && payload?.payload?.isReady !== undefined) {
            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                teams: prev.teams.map((t) =>
                  t.id === payload.payload.teamId
                    ? { ...t, isReady: payload.payload.isReady }
                    : t
                ),
              };
            });
          }
          fetchRoom();
        })
        .on("broadcast", { event: "AUCTION_LAUNCHED" }, () => {
          router.push(`/room/${code}/live`);
        })
        .on("broadcast", { event: "PLAYER_ADDED" }, () => {
          fetchRoom();
        })
        .subscribe();
    }

    // 3. 800ms Fast Polling fallback
    const interval = setInterval(fetchRoom, 800);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
      if (supabaseClient && supabaseChannel) supabaseClient.removeChannel(supabaseChannel);
    };
  }, [code, fetchRoom, router]);

  const isAuctioneer = currentUser?.id === room?.ownerId;
  const currentTeam = room?.teams.find((t) => t.ownerId === currentUser?.id);

  const handleLaunchAuction = async () => {
    if (!isAuctioneer) return;
    setLaunching(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${code}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LIVE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to launch auction");
        setLaunching(false);
      } else {
        router.push(`/room/${code}/live`);
      }
    } catch {
      setError("An unexpected error occurred launching auction");
      setLaunching(false);
    }
  };

  const handleToggleReady = async () => {
    try {
      // Optimistic instant local update
      if (currentTeam) {
        setRoom((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            teams: prev.teams.map((t) =>
              t.id === currentTeam.id ? { ...t, isReady: !t.isReady } : t
            ),
          };
        });
      }
      await fetch(`/api/rooms/${code}/ready`, { method: "POST" });
      fetchRoom();
    } catch {}
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/room/${code}/join`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b16] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-slate-300">Connecting to Waiting Room...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* 1. CINEMATIC VOLLEYBALL STADIUM ARENA BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/npl-dashboard-bg.jpg"
          alt="Volleyball Arena Stadium"
          fill
          priority
          className="object-cover object-center opacity-45 brightness-95 contrast-110 scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/80 via-[#070b18]/60 to-[#060913]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(4,7,16,0.85)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar roomCode={code} roomTitle={room?.title} roomStatus={room?.status} activeTab="rooms" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Banner with Panoramic Stadium Hero Graphic */}
        <div className="relative rounded-2xl border border-amber-500/30 bg-[#090e1e]/95 p-4 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
          {/* Panoramic Stadium Banner Background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <Image
              src="/images/npl-hero-banner.jpg"
              alt="Stadium Hero Banner"
              fill
              priority
              className="object-cover object-right sm:object-center opacity-60 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070c1a] via-[#070c1a]/85 to-transparent sm:w-2/3" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070c1a]/80 via-transparent to-transparent" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] sm:text-xs font-black text-amber-400 tracking-wider">
                ROOM CODE: {code}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-300 border border-amber-500/40">
                <Radio className="h-3 w-3 text-amber-400 animate-pulse" />
                <span>WAITING ROOM</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 drop-shadow">
              {room?.title}
            </h1>
            <p className="text-xs text-slate-300/90 mt-0.5 drop-shadow">
              Organized by <strong className="text-white font-bold">{room?.owner.name}</strong> • Share link to register franchises
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={copyInviteLink}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-amber-400" />}
              <span>{copied ? "Copied!" : "Invite Link"}</span>
            </button>

            <Link
              href={`/room/${code}/players`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5 text-cyan-400" />
              <span>Roster ({room?.players.length || 0})</span>
            </Link>

            {!currentTeam && !isAuctioneer && (
              <Link
                href={`/room/${code}/join`}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-amber-500 px-4 py-2 sm:py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                <Users className="h-4 w-4" />
                <span>Register Team</span>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
            {error}
          </div>
        )}

        {/* Waiting Room Roster Component */}
        <WaitingRoomRoster
          teams={room?.teams || []}
          playerCount={room?.players.length || 0}
          isAuctioneer={isAuctioneer}
          onLaunchAuction={handleLaunchAuction}
          onToggleReady={handleToggleReady}
          isCurrentUserReady={currentTeam?.isReady}
          isTeamOwner={Boolean(currentTeam)}
          userTeamName={currentTeam?.name}
          launching={launching}
          auctioneerName={room?.owner.name || "Auctioneer"}
        />
      </div>
      </div>
    </div>
  );
}
