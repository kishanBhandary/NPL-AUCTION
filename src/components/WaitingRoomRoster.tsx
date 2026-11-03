"use client";

import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Clock, Play, Users, Trophy, Star } from "lucide-react";

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
    owner?: { name: string } | null;
  }>;
  playerCount: number;
  isAuctioneer: boolean;
  onLaunchAuction?: () => void;
  onToggleReady?: () => void;
  isCurrentUserReady?: boolean;
  launching?: boolean;
}

export default function WaitingRoomRoster({
  teams,
  playerCount,
  isAuctioneer,
  onLaunchAuction,
  onToggleReady,
  isCurrentUserReady,
  launching = false,
}: WaitingRoomRosterProps) {
  const readyCount = teams.filter((t) => t.isReady).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Registered Franchises</p>
              <p className="text-2xl font-black text-white">{teams.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Franchises Ready</p>
              <p className="text-2xl font-black text-emerald-400">
                {readyCount} / {teams.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Registered Players</p>
              <p className="text-2xl font-black text-cyan-400">{playerCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Roster Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-white">Participating Franchises</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates as franchises join with their designated main fixed players.
            </p>
          </div>

          {!isAuctioneer && onToggleReady && (
            <button
              onClick={onToggleReady}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md ${
                isCurrentUserReady
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isCurrentUserReady ? "You are Ready!" : "Mark as Ready"}
            </button>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-300">No franchises joined yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Share the invitation URL or room code with franchise owners.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => {
              const fallbackLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`;

              return (
                <div
                  key={team.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shrink-0">
                        <Image
                          src={team.logoUrl || fallbackLogo}
                          alt={team.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: team.color || "#3b82f6" }}
                          />
                          <span className="truncate">{team.name}</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          Owner: {team.owner?.name ? team.owner.name : "Franchise Owner"}
                        </p>
                      </div>
                    </div>

                    <div>
                      {team.isReady ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          READY
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                          <Clock className="h-3 w-3" />
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1 Main Fixed Player Badge */}
                  {team.mainPlayerName && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="text-[11px] font-bold text-white truncate">
                          Fixed: {team.mainPlayerName}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase">
                        {team.mainPlayerPosition || "MARQUEE"}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Purse Budget</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(team.remainingPurse)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Auctioneer Launch Control */}
        {isAuctioneer && (
          <div className="mt-8 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">Ready to begin the live draft?</p>
              <p className="text-xs text-slate-400">
                Clicking launch will simultaneously transport all connected franchise owners directly into the live bidding arena.
              </p>
            </div>

            <button
              onClick={onLaunchAuction}
              disabled={launching || playerCount === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-extrabold text-slate-950 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              {launching ? "Launching..." : "Launch Live Auction"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
