"use client";

import Image from "next/image";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
import { CheckCircle2, Clock, Play, Users, Trophy, Star, XCircle, ShieldCheck, Trash2, Loader2, User, Crown, Wallet, Shield } from "lucide-react";

interface WaitingRoomRosterProps {
  teams: Array<{
    id: string;
    name: string;
    code?: string | null;
    logoUrl?: string | null;
    color?: string | null;
    totalPurse: number;
    remainingPurse: number;
    isReady: boolean;
    mainPlayerName?: string | null;
    mainPlayerPosition?: string | null;
    mainPlayerPhotoUrl?: string | null;
    owner?: { name: string; avatarUrl?: string | null; email?: string } | null;
  }>;
  playerCount: number;
  isAuctioneer: boolean;
  onLaunchAuction?: () => void;
  onToggleReady?: () => void;
  onRemoveTeam?: (teamId: string, teamName: string) => void;
  removingTeamId?: string | null;
  isCurrentUserReady?: boolean;
  isTeamOwner?: boolean;
  userTeamName?: string | null;
  launching?: boolean;
  auctioneerName?: string;
}

export default function WaitingRoomRoster({
  teams,
  playerCount,
  isAuctioneer,
  onLaunchAuction,
  onToggleReady,
  onRemoveTeam,
  removingTeamId = null,
  isCurrentUserReady = false,
  isTeamOwner = false,
  userTeamName = null,
  launching = false,
  auctioneerName = "Auctioneer",
}: WaitingRoomRosterProps) {
  const readyCount = teams.filter((t) => t.isReady).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#090e1c]/90 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Registered Franchises
              </p>
              <p className="text-2xl font-black font-mono text-white">{teams.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#090e1c]/90 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Franchises Ready
              </p>
              <p className="text-2xl font-black font-mono text-emerald-400">
                {readyCount} / {teams.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#090e1c]/90 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Registered Athletes
              </p>
              <p className="text-2xl font-black font-mono text-cyan-400">{playerCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Owner Ready / Not Ready Interactive Controls */}
      {isTeamOwner && onToggleReady && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              <h4 className="text-sm font-black text-white">
                Franchise Readiness Control: <span className="text-amber-400">{userTeamName || "Your Team"}</span>
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              Set your franchise status so the auctioneer knows your team is ready to begin the live draft.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                isCurrentUserReady
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/40"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isCurrentUserReady ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              {isCurrentUserReady ? "Ready to Draft" : "Not Ready Yet"}
            </span>

            {/* Dedicated Ready / Not Ready Toggle Buttons */}
            {isCurrentUserReady ? (
              <button
                type="button"
                onClick={onToggleReady}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-300 border border-slate-700 transition-colors shadow"
              >
                <XCircle className="h-4 w-4 text-rose-400" />
                <span>Change to Not Ready</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleReady}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-xs font-black text-slate-950 transition-all shadow-lg shadow-emerald-500/30 hover:scale-105"
              >
                <CheckCircle2 className="h-4 w-4 text-slate-950" />
                <span>Mark Franchise as Ready</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Team Roster Grid */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#090e1c]/90 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-white">Participating Franchises</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates as franchises join with their designated main fixed players.
            </p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-300">No franchises joined yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Share the room code or invitation URL with franchise owners.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.map((team) => {
              const fallbackLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`;
              const fallbackOwner = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(team.owner?.name || team.name)}`;
              const fallbackPlayer = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(team.mainPlayerName || team.name)}`;
              const badge = team.mainPlayerPosition ? getPositionBadge(team.mainPlayerPosition) : null;

              return (
                <div
                  key={team.id}
                  className="rounded-3xl border-2 border-slate-800/90 bg-gradient-to-b from-[#0e162d]/90 via-[#070c1a]/95 to-[#050813]/98 p-6 sm:p-7 hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between space-y-5 shadow-2xl relative overflow-hidden backdrop-blur-xl group"
                >
                  {/* Accent ambient lighting */}
                  <div
                    className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-25 pointer-events-none transition-opacity group-hover:opacity-40"
                    style={{ backgroundColor: team.color || "#F59E0B" }}
                  />

                  {/* Top: Big Team Logo & Team Brand Info */}
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                      {/* Big Team Logo */}
                      <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-2xl border-2 border-slate-700/80 bg-slate-900 shrink-0 shadow-2xl ring-2 ring-white/10 group-hover:scale-105 transition-transform duration-300">
                        <Image
                          src={team.logoUrl || fallbackLogo}
                          alt={team.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="h-3 w-3 rounded-full shrink-0 shadow"
                            style={{ backgroundColor: team.color || "#3b82f6" }}
                          />
                          <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            {team.code || "FRANCHISE"}
                          </span>
                        </div>

                        <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate drop-shadow">
                          {team.name}
                        </h4>

                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Shield className="h-3.5 w-3.5 text-slate-500" />
                          <span>Official League Franchise</span>
                        </p>
                      </div>
                    </div>

                    {/* Readiness Status Capsule */}
                    <div className="shrink-0">
                      {team.isReady ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/20">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>READY</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-400 border border-slate-700">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>PENDING</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Grid: Franchise Owner Section & Main Fixed Player Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 relative z-10">
                    {/* 1. Franchise Owner Card with Photo */}
                    <div className="rounded-2xl border border-slate-800 bg-[#060913]/90 p-3.5 flex items-center gap-3">
                      <div className="relative h-12 w-12 sm:h-13 sm:w-13 rounded-full border-2 border-amber-400/80 overflow-hidden bg-slate-900 shrink-0 shadow-md">
                        <Image
                          src={team.owner?.avatarUrl || fallbackOwner}
                          alt={team.owner?.name || "Owner"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                          <Crown className="h-2.5 w-2.5 text-amber-400" />
                          Franchise Owner
                        </span>
                        <h5 className="text-sm font-black text-white truncate">
                          {team.owner?.name ? team.owner.name : "Franchise Owner"}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate">
                          {team.owner?.email || "Managing Director"}
                        </p>
                      </div>
                    </div>

                    {/* 2. Main Fixed Marquee Athlete */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center gap-3">
                      <div className="relative h-12 w-12 sm:h-13 sm:w-13 rounded-xl border border-amber-500/50 overflow-hidden bg-slate-900 shrink-0 shadow-md">
                        <Image
                          src={team.mainPlayerPhotoUrl || fallbackPlayer}
                          alt={team.mainPlayerName || "Player"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase font-black tracking-wider text-amber-300 flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                          Marquee Star
                        </span>
                        <h5 className="text-sm font-black text-white truncate">
                          {team.mainPlayerName || "Fixed Squad Member"}
                        </h5>
                        {badge && (
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                            {badge.badge} • {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Purse Budget Box & Auctioneer Control */}
                  <div className="border-t border-slate-800/90 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Starting Purse Budget
                        </span>
                        <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 drop-shadow">
                          {formatCurrency(team.remainingPurse)}
                        </span>
                      </div>
                    </div>

                    {/* Auctioneer Remove Team Button */}
                    {isAuctioneer && onRemoveTeam && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to remove franchise "${team.name}" from this auction room?`)) {
                            onRemoveTeam(team.id, team.name);
                          }
                        }}
                        disabled={removingTeamId === team.id}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 px-3.5 py-2 text-xs font-bold text-rose-300 hover:text-white transition-all disabled:opacity-50"
                        title={`Remove ${team.name}`}
                      >
                        {removingTeamId === team.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        <span>{removingTeamId === team.id ? "Removing..." : "Remove Franchise"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Controls Section */}
        <div className="mt-8 border-t border-slate-800 pt-6">
          {isAuctioneer ? (
            /* Only Auctioneer Can Launch */
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white flex items-center gap-2">
                  <Play className="h-4 w-4 text-amber-400 fill-amber-400" />
                  Auctioneer Master Control: Ready to begin the live draft?
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clicking Launch Live Auction will simultaneously transport all connected franchise owners directly into the live bidding arena.
                </p>
              </div>

              <button
                type="button"
                onClick={onLaunchAuction}
                disabled={launching || playerCount === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-8 py-3.5 text-xs font-black text-slate-950 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl shadow-amber-500/30 shrink-0 hover:scale-105 active:scale-95"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>{launching ? "Launching Arena..." : "Launch Live Auction"}</span>
              </button>
            </div>
          ) : (
            /* Franchise Owner Waiting Notice */
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-amber-400 animate-ping shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-white">
                    Waiting for Auctioneer ({auctioneerName}) to Launch Auction
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Once the auctioneer clicks start, your screen will automatically transition to the Live Auction Arena.
                  </p>
                </div>
              </div>

              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 shrink-0">
                Awaiting Launch
              </span>
            </div>
          )}
        </div>      </div>
    </div>
  );
}
