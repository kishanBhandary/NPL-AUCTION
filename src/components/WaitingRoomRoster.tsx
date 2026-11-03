"use client";

import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Clock, Play, Users, Trophy, Star, XCircle, ShieldCheck } from "lucide-react";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => {
              const fallbackLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`;

              return (
                <div
                  key={team.id}
                  className="rounded-2xl border border-slate-800/80 bg-[#060913]/90 p-4 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shrink-0 shadow">
                        <Image
                          src={team.logoUrl || fallbackLogo}
                          alt={team.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: team.color || "#3b82f6" }}
                          />
                          <span className="truncate">{team.name}</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          Owner: <span className="text-slate-300">{team.owner?.name ? team.owner.name : "Franchise Owner"}</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      {team.isReady ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          READY
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400 border border-slate-700">
                          <Clock className="h-3 w-3" />
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1 Main Fixed Player Badge */}
                  {team.mainPlayerName && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-xs">
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
