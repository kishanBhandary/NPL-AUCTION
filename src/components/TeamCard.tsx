"use client";

import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { Trophy, Users, Shield } from "lucide-react";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    code?: string | null;
    logoUrl?: string | null;
    color?: string | null;
    totalPurse: number;
    remainingPurse: number;
    squadCount?: number;
    owner?: {
      name: string;
    } | null;
    isReady?: boolean;
    mainPlayerName?: string | null;
  };
  maxSquadSize?: number;
  isCurrentHighest?: boolean;
}

export default function TeamCard({
  team,
  maxSquadSize = 14,
  isCurrentHighest = false,
}: TeamCardProps) {
  const squadCount = team.squadCount || 0;
  const pursePercentage = Math.min(100, Math.max(0, (team.remainingPurse / team.totalPurse) * 100));
  const fallbackLogo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
        isCurrentHighest
          ? "border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10 scale-[1.02]"
          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
      }`}
    >
      {/* Highest Bidder Banner */}
      {isCurrentHighest && (
        <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider flex items-center gap-1 shadow">
          <Trophy className="h-3 w-3" />
          Holding Bid
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Team Logo */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow">
          <Image
            src={team.logoUrl || fallbackLogo}
            alt={team.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Team Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: team.color || "#3b82f6" }}
            />
            <h4 className="truncate text-sm font-extrabold text-white">
              {team.name}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {team.owner?.name ? `Owner: ${team.owner.name}` : "Team Owner"}
          </p>
          {team.mainPlayerName && (
            <p className="text-[10px] text-amber-400 font-semibold truncate flex items-center gap-1 mt-0.5">
              <span>★ {team.mainPlayerName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Purse & Squad Metrics */}
      <div className="mt-3.5 space-y-2 border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-semibold text-slate-400">Purse Left</span>
          <span className="font-mono font-extrabold text-emerald-400">
            {formatCurrency(team.remainingPurse)}
          </span>
        </div>

        {/* Purse Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${pursePercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1 text-[11px]">
            <Users className="h-3 w-3 text-slate-500" />
            Squad
          </span>
          <span className="font-mono font-bold text-slate-200">
            {squadCount} / {maxSquadSize}
          </span>
        </div>
      </div>
    </div>
  );
}

