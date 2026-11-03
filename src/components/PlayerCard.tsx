"use client";

import Image from "next/image";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
import { PlayerPosition } from "@/types";
import { User, Zap } from "lucide-react";

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    photoUrl?: string | null;
    position: PlayerPosition;
  } | null;
  lotNumber?: number | null;
  basePrice?: number;
  currentBid?: number;
  highestBidderName?: string | null;
  highestBidderColor?: string | null;
  status?: string;
}

export default function PlayerCard({
  player,
  lotNumber,
  basePrice = 50,
  currentBid,
  highestBidderName,
  highestBidderColor,
  status = "IN_AUCTION",
}: PlayerCardProps) {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80 text-slate-500 mb-4">
          <User className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-300">Auction Podium Standby</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          Waiting for the Auctioneer to call the next player to the block.
        </p>
      </div>
    );
  }

  const badge = getPositionBadge(player.position);
  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-black/80">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header Info: Lot & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-2">
          {lotNumber && (
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-bold text-amber-400 border border-amber-500/20">
              LOT #{lotNumber}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
            <Zap className="h-3 w-3" />
            {badge.label}
          </span>
        </div>

        <div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
            status === "SOLD" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
            status === "UNSOLD" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
            "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
          }`}>
            {status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Player Photo */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative group">
            <div className="relative h-64 w-64 sm:h-72 sm:w-72 overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900/80 shadow-inner">
              <Image
                src={player.photoUrl || fallbackAvatar}
                alt={player.name}
                fill
                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            </div>

            {/* Glowing ring border */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 opacity-20 group-hover:opacity-40 transition-opacity blur" />
          </div>
        </div>

        {/* Player Info & Live Auction Bid Spotlight */}
        <div className="md:col-span-7 flex flex-col justify-between h-full space-y-5">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight sm:text-4xl">
              {player.name}
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                {player.position}
              </span>
              <span className="text-xs font-medium text-slate-400">
                Base Price: <strong className="text-slate-200 font-mono">{formatCurrency(basePrice)}</strong>
              </span>
            </div>
          </div>

          {/* Current Highest Bid Showcase */}
          <div className="rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  Current Highest Bid
                </p>
                <div className="mt-1 text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-2">
                  <span>{formatCurrency(currentBid ?? basePrice)}</span>
                </div>
              </div>

              {highestBidderName ? (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Holding Franchise</span>
                  <div className="mt-1.5 flex items-center gap-2 justify-end">
                    <span
                      className="h-3 w-3 rounded-full shadow"
                      style={{ backgroundColor: highestBidderColor || "#f59e0b" }}
                    />
                    <span className="font-extrabold text-white text-base tracking-wide">
                      {highestBidderName}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400">Opening Bid</span>
                  <p className="text-[11px] text-amber-400 font-mono mt-0.5">{formatCurrency(basePrice)} Ready</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
