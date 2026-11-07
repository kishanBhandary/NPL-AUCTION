"use client";

import { use, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
import { SessionUser } from "@/types";
import {
  Trophy,
  Users,
  Shield,
  TrendingUp,
  History,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  Radio,
  Plus,
  Star,
  UserCheck,
  X,
  Crown,
  Wallet,
  UserMinus,
  User,
} from "lucide-react";

export default function AuctionResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  // Post-auction player assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPlayerToAssign, setSelectedPlayerToAssign] = useState<{
    id: string;
    name: string;
    position: string;
    photoUrl: string | null;
  } | null>(null);
  const [targetTeamId, setTargetTeamId] = useState("");
  const [assignPrice, setAssignPrice] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const [data, setData] = useState<{
    room: {
      id: string;
      title: string;
      roomCode: string;
      startingPurse: number;
      owner?: { id?: string; name?: string; email?: string };
    };
    stats: {
      totalPlayers: number;
      soldCount: number;
      unsoldCount: number;
      upcomingCount: number;
      unassignedCount?: number;
      totalMoneySpent: number;
      positionStats: Record<string, { total: number; sold: number; unsold: number; totalSpent: number }>;
    };
    teamSummaries: Array<{
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
      color: string | null;
      owner: { name: string; avatarUrl?: string | null; email?: string };
      totalPurse: number;
      remainingPurse: number;
      totalSpent: number;
      squadCount: number;
      mainPlayerName?: string | null;
      mainPlayerPosition?: string | null;
      mainPlayerPhotoUrl?: string | null;
      squad: Array<{
        auctionPlayerId: string;
        playerId: string;
        name: string;
        photoUrl: string | null;
        position: string;
        basePrice: number;
        finalPrice: number | null;
        soldAt: string | null;
      }>;
    }>;
    unassignedPlayers?: Array<{
      id: string;
      name: string;
      photoUrl: string | null;
      position: string;
    }>;
    availableTeams?: Array<{
      id: string;
      name: string;
      color: string | null;
      remainingPurse: number;
    }>;
    topBuys: Array<{
      id: string;
      player: { name: string; position: string; photoUrl: string | null };
      winningTeam: { name: string; color: string | null };
      finalPrice: number | null;
    }>;
    history: Array<{
      id: string;
      eventType: string;
      message: string;
      createdAt: string;
    }>;
  } | null>(null);

  const fetchResults = useCallback(() => {
    fetch(`/api/rooms/${code}/results`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    fetchResults();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});
  }, [fetchResults]);

  const isAuctioneer =
    Boolean(currentUser && data?.room?.owner?.id && currentUser.id === data.room.owner.id) ||
    currentUser?.role === "AUCTIONEER";

  const handleOpenAssignModal = (
    player?: { id: string; name: string; position: string; photoUrl: string | null },
    preselectedTeamId?: string
  ) => {
    if (player) {
      setSelectedPlayerToAssign(player);
    } else if (data?.unassignedPlayers && data.unassignedPlayers.length > 0) {
      setSelectedPlayerToAssign(data.unassignedPlayers[0]);
    }
    if (preselectedTeamId) {
      setTargetTeamId(preselectedTeamId);
    } else if (data?.teamSummaries && data.teamSummaries.length > 0) {
      setTargetTeamId(data.teamSummaries[0].id);
    }
    setAssignPrice(0);
    setAssignError("");
    setAssignModalOpen(true);
  };

  const handleAssignPlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerToAssign || !targetTeamId) return;

    setAssigning(true);
    setAssignError("");

    try {
      const res = await fetch(`/api/rooms/${code}/assign-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayerToAssign.id,
          teamId: targetTeamId,
          finalPrice: Number(assignPrice) || 0,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setAssignError(resData.error || "Failed to assign player");
      } else {
        setAssignModalOpen(false);
        setSelectedPlayerToAssign(null);
        fetchResults();
      }
    } catch {
      setAssignError("Network error while assigning player");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignPlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to unassign this athlete from the franchise squad?")) return;
    try {
      const res = await fetch(`/api/rooms/${code}/assign-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          action: "unassign",
        }),
      });
      if (res.ok) {
        fetchResults();
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm">Calculating final auction results...</p>
      </div>
    );
  }

  if (!data || !data.room) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col court-grid">
        <Navbar roomCode={code} />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-slate-400">Auction results not found</p>
        </div>
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
          className="object-cover object-center opacity-25 brightness-80 contrast-125 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/95 via-[#070b18]/85 to-[#060913]/98" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(4,7,16,0.95)_85%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar roomCode={code} roomTitle={data.room.title} activeTab="results" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Hero Banner */}
        <div className="relative rounded-2xl border border-amber-500/40 bg-[#080d1e]/50 p-5 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
          <div className="absolute inset-0 pointer-events-none z-0">
            <Image
              src="/images/npl-container-banner.jpg"
              alt="Stadium Hero Banner"
              fill
              priority
              className="object-cover object-center opacity-85 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060913]/90 via-[#060913]/60 to-transparent sm:w-3/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060913]/50 via-transparent to-transparent" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span>Auction Results & Final Rosters</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow">
              {data.room.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-1 font-mono">
              ROOM CODE: <span className="text-amber-400 font-bold">{data.room.roomCode}</span>
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Link
              href={`/room/${code}/live`}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/25 transition-all"
            >
              <Radio className="h-4 w-4 text-slate-950 animate-pulse" />
              <span>Back to Arena</span>
            </Link>
          </div>
        </div>

        {/* Global Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Players Sold</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">{data.stats.soldCount}</span>
              <span className="text-xs text-slate-500">/ {data.stats.totalPlayers}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Money Spent</span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {formatCurrency(data.stats.totalMoneySpent)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Unsold Players</span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">{data.stats.unsoldCount}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Franchises Formed</span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">{data.teamSummaries.length}</span>
            </div>
          </div>
        </div>

        {/* Top Buys Showcase */}
        {data.topBuys.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-400" />
              Top Auction Signings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {data.topBuys.map((buy, idx) => {
                const badge = getPositionBadge(buy.player.position);
                const fallback = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(buy.player.name)}`;

                return (
                  <div key={buy.id} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                    <span className="absolute top-2 right-2 text-xs font-mono font-black text-amber-400">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                        <Image src={buy.player.photoUrl || fallback} alt={buy.player.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-bold text-white truncate">{buy.player.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                          {badge.badge}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 truncate">{buy.winningTeam.name}</span>
                      <span className="font-mono font-extrabold text-emerald-400">
                        {formatCurrency(buy.finalPrice || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Team Rosters Breakdown: Which player is in which team */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Users className="h-6 w-6 text-amber-400" />
                <span>Final Franchise Squad Rosters</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete breakdown of which athletes are assigned to each franchise team.
              </p>
            </div>

            {isAuctioneer && (
              <button
                type="button"
                onClick={() => handleOpenAssignModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                <span>Assign Player to Franchise</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.teamSummaries.map((team) => {
              const fallbackLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`;
              const fallbackOwner = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(team.owner?.name || team.name)}`;
              const fallbackPlayer = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(team.mainPlayerName || team.name)}`;
              const mainBadge = team.mainPlayerPosition ? getPositionBadge(team.mainPlayerPosition) : null;

              return (
                <div
                  key={team.id}
                  className="rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-[#0e162d]/90 via-[#070c1a]/95 to-[#050813]/98 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden backdrop-blur-xl group hover:border-amber-500/40 transition-all"
                >
                  <div>
                    {/* Team Header with Logo, Owner Photo and Squad Count */}
                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 mb-4 gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Team Logo */}
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 shrink-0 shadow-md">
                          <Image
                            src={team.logoUrl || fallbackLogo}
                            alt={team.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: team.color || "#3b82f6" }}
                            />
                            <h4 className="text-lg font-black text-white truncate">{team.name}</h4>
                          </div>

                          {/* Owner Details with Owner Photo */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="relative h-7 w-7 rounded-full border border-amber-400 overflow-hidden bg-slate-800 shrink-0">
                              <Image
                                src={team.owner.avatarUrl || fallbackOwner}
                                alt={team.owner.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <span className="text-xs text-slate-300 font-semibold truncate">
                              Owner: <strong className="text-white">{team.owner.name}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Squad</span>
                        <p className="text-lg font-black text-amber-400 font-mono">{team.squadCount} Athletes</p>
                      </div>
                    </div>

                    {/* Purse Breakdown */}
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-950/70 p-3 border border-slate-800/80 mb-5 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Purse Budget</span>
                        <p className="font-mono text-xs font-bold text-slate-300">{formatCurrency(team.totalPurse)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Purse Spent</span>
                        <p className="font-mono text-xs font-bold text-amber-400">{formatCurrency(team.totalSpent)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Remaining</span>
                        <p className="font-mono text-xs font-bold text-emerald-400">{formatCurrency(team.remainingPurse)}</p>
                      </div>
                    </div>

                    {/* Squad Members List (Which player is in which team) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                          Assigned Athletes Roster ({team.squadCount})
                        </span>
                        {isAuctioneer && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(undefined, team.id)}
                            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Player</span>
                          </button>
                        )}
                      </div>

                      {/* 1. Main Fixed Player (Marquee Captain) */}
                      {team.mainPlayerName && (
                        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 px-3 py-2.5 border border-amber-500/40 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-amber-500/60 bg-slate-800 shrink-0">
                              <Image
                                src={team.mainPlayerPhotoUrl || fallbackPlayer}
                                alt={team.mainPlayerName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-white truncate">{team.mainPlayerName}</span>
                                <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                                  <Star className="h-2 w-2 fill-amber-400" />
                                  Captain
                                </span>
                              </div>
                              {mainBadge && (
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {mainBadge.label}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                            Fixed (₹0)
                          </span>
                        </div>
                      )}

                      {/* 2. Acquired & Assigned Auction Players */}
                      {team.squad.length === 0 && !team.mainPlayerName ? (
                        <div className="rounded-xl bg-slate-950/40 p-5 text-center text-xs text-slate-500 border border-dashed border-slate-800">
                          No players acquired or assigned yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {team.squad.map((p) => {
                            const badge = getPositionBadge(p.position);
                            const playerFallback = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`;
                            return (
                              <div
                                key={p.auctionPlayerId}
                                className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                                    <Image
                                      src={p.photoUrl || playerFallback}
                                      alt={p.name}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-200 block truncate">{p.name}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                                      {badge.badge} • {badge.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-extrabold text-emerald-400 text-xs sm:text-sm">
                                    {formatCurrency(p.finalPrice || 0)}
                                  </span>

                                  {isAuctioneer && (
                                    <button
                                      type="button"
                                      onClick={() => handleUnassignPlayer(p.playerId)}
                                      title="Unassign player from this squad"
                                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    >
                                      <UserMinus className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unassigned / Free Agent Athletes Pool */}
        {data.unassignedPlayers && data.unassignedPlayers.length > 0 && (
          <div className="rounded-3xl border border-slate-800 bg-[#070c1a]/90 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-400" />
                  <span>Unassigned Athletes Pool ({data.unassignedPlayers.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Athletes not yet drafted or assigned to any franchise squad.
                </p>
              </div>

              {isAuctioneer && (
                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  Click &quot;Assign to Team&quot; to allocate any athlete
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.unassignedPlayers.map((player) => {
                const badge = getPositionBadge(player.position);
                const fallback = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;

                return (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3.5 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                        <Image src={player.photoUrl || fallback} alt={player.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">{player.name}</h5>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                          {badge.badge}
                        </span>
                      </div>
                    </div>

                    {isAuctioneer && (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(player)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[10px] font-bold text-amber-300 shrink-0 transition-colors"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Auction Event Timeline */}
        {data.history.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-amber-400" />
              Complete Auction History Log
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {data.history.map((ev) => (
                <div key={ev.id} className="flex items-start justify-between rounded-lg bg-slate-950/50 p-3 border border-slate-800/60 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <span className="font-mono text-[10px] font-bold text-amber-400 uppercase mr-2">
                        [{ev.eventType}]
                      </span>
                      <span className="text-slate-300 font-medium">{ev.message}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-4">
                    {new Date(ev.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN PLAYER TO FRANCHISE MODAL */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-[#181106] via-[#090e1c] to-[#060913] p-6 text-slate-100 shadow-2xl shadow-amber-950/50">
            <button
              onClick={() => !assigning && setAssignModalOpen(false)}
              disabled={assigning}
              className="absolute top-4 right-4 rounded-full bg-slate-900/80 p-1.5 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Assign Player to Franchise</h3>
                <p className="text-xs text-slate-400">Allocate athlete to a team squad</p>
              </div>
            </div>

            {assignError && (
              <div className="rounded-xl bg-rose-500/15 p-2.5 text-xs font-bold text-rose-300 border border-rose-500/30 mb-3">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignPlayerSubmit} className="space-y-4">
              {/* Select Athlete (or preselected) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Athlete
                </label>
                {selectedPlayerToAssign ? (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-950/80 p-3 border border-slate-700">
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                      <Image
                        src={
                          selectedPlayerToAssign.photoUrl ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                            selectedPlayerToAssign.name
                          )}`
                        }
                        alt={selectedPlayerToAssign.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-black text-white truncate block">
                        {selectedPlayerToAssign.name}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold uppercase">
                        {selectedPlayerToAssign.position}
                      </span>
                    </div>
                    {data?.unassignedPlayers && data.unassignedPlayers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerToAssign(null)}
                        className="text-[10px] text-slate-400 hover:text-white underline"
                      >
                        Change
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    required
                    onChange={(e) => {
                      const found = data?.unassignedPlayers?.find((p) => p.id === e.target.value);
                      if (found) setSelectedPlayerToAssign(found);
                    }}
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Choose an athlete...
                    </option>
                    {data?.unassignedPlayers?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.position})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target Franchise */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target Franchise Squad
                </label>
                <select
                  required
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Choose franchise team...
                  </option>
                  {data?.teamSummaries.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} (Remaining: {formatCurrency(team.remainingPurse)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Acquisition / Transfer Price */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Acquisition / Transfer Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={assignPrice}
                  onChange={(e) => setAssignPrice(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
                  placeholder="0 for free transfer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter 0 for free post-auction draft, or amount to deduct from team purse.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={assigning}
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedPlayerToAssign || !targetTeamId}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Confirm Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
