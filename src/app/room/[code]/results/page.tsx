"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
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
} from "lucide-react";

export default function AuctionResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    room: {
      title: string;
      roomCode: string;
      startingPurse: number;
    };
    stats: {
      totalPlayers: number;
      soldCount: number;
      unsoldCount: number;
      upcomingCount: number;
      totalMoneySpent: number;
      positionStats: Record<string, { total: number; sold: number; unsold: number; totalSpent: number }>;
    };
    teamSummaries: Array<{
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
      color: string | null;
      owner: { name: string };
      totalPurse: number;
      remainingPurse: number;
      totalSpent: number;
      squadCount: number;
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

  useEffect(() => {
    fetch(`/api/rooms/${code}/results`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

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
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col arena-court-bg">
      <Navbar roomCode={code} roomTitle={data.room.title} activeTab="results" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 mb-2 border border-amber-500/20">
              <Trophy className="h-3.5 w-3.5" />
              OFFICIAL AUCTION RESULTS
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">{data.room.title}</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              ROOM CODE: {data.room.roomCode}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/room/${code}/live`}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
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

        {/* Team Rosters Breakdown */}
        <div className="space-y-6">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-400" />
            Complete Franchise Squad Rosters
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.teamSummaries.map((team) => {
              const fallbackLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`;

              return (
                <div key={team.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
                  <div>
                    {/* Team Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                          <Image src={team.logoUrl || fallbackLogo} alt={team.name} fill className="object-cover" unoptimized />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color || "#3b82f6" }} />
                            {team.name}
                          </h4>
                          <p className="text-xs text-slate-400">Owner: {team.owner.name}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Squad Count</span>
                        <p className="text-base font-black text-white font-mono">{team.squadCount} Players</p>
                      </div>
                    </div>

                    {/* Purse Breakdown */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950/60 p-3 border border-slate-800/80 mb-4 text-center">
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

                    {/* Players Squad Table */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Purchased Squad
                      </span>

                      {team.squad.length === 0 ? (
                        <div className="rounded-lg bg-slate-950/40 p-4 text-center text-xs text-slate-500">
                          No players acquired yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {team.squad.map((p) => {
                            const badge = getPositionBadge(p.position);
                            return (
                              <div
                                key={p.auctionPlayerId}
                                className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2 border border-slate-800/60 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                                    {badge.badge}
                                  </span>
                                  <span className="font-bold text-slate-200">{p.name}</span>
                                </div>
                                <span className="font-mono font-extrabold text-emerald-400">
                                  {formatCurrency(p.finalPrice || 0)}
                                </span>
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
    </div>
  );
}
