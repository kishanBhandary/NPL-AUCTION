"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import WaitingRoomRoster from "@/components/WaitingRoomRoster";
import { getSupabaseClient } from "@/lib/supabase/client";
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

    // Supabase Realtime subscription
    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase.channel(`auction_${code}`);

      channel
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

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback polling if Supabase keys are pending
      const interval = setInterval(fetchRoom, 2000);
      return () => clearInterval(interval);
    }
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
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col arena-court-bg">
      <Navbar roomCode={code} roomTitle={room?.title} roomStatus={room?.status} activeTab="rooms" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner with Share Link and Controls */}
        <div className="rounded-2xl border border-slate-800 bg-[#090e1c]/90 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-amber-400 tracking-wider">
                ROOM CODE: {code}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-500/30">
                WAITING ROOM
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {room?.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Organized by <strong className="text-slate-200">{room?.owner.name}</strong> • Share link to register franchises
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-amber-400" />}
              <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
            </button>

            <Link
              href={`/room/${code}/players`}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <UserPlus className="h-4 w-4 text-cyan-400" />
              <span>Roster & Players ({room?.players.length || 0})</span>
            </Link>

            {!currentTeam && !isAuctioneer && (
              <Link
                href={`/room/${code}/join`}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                <Users className="h-4 w-4" />
                <span>Register Your Team</span>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-xs font-semibold text-rose-400 border border-rose-500/20">
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
  );
}
