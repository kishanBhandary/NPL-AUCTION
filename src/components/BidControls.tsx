"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, CheckCircle2, DollarSign, Loader2 } from "lucide-react";
import { sounds } from "./SoundEffects";

interface BidControlsProps {
  roomCode: string;
  currentBid: number;
  minIncrement?: number;
  userTeam: {
    id: string;
    name: string;
    remainingPurse: number;
    color?: string | null;
  } | null;
  isHighestBidder: boolean;
  isAuctioneer: boolean;
  isTimerActive: boolean;
  onBidSuccess?: () => void;
}

export default function BidControls({
  roomCode,
  currentBid,
  minIncrement = 50,
  userTeam,
  isHighestBidder,
  isAuctioneer,
  isTimerActive,
  onBidSuccess,
}: BidControlsProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");

  const handleQuickBid = async (increment: number) => {
    if (!userTeam) return;
    setErrorMsg(null);
    setLoading(true);

    const targetAmount = currentBid + increment;

    try {
      const res = await fetch(`/api/auction/${roomCode}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: targetAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to place bid");
      } else {
        sounds.playBid();
        if (onBidSuccess) onBidSuccess();
      }
    } catch {
      setErrorMsg("Network error placing bid");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTeam || !customAmount) return;
    const amount = Number(customAmount);
    if (isNaN(amount) || amount <= currentBid) {
      setErrorMsg(`Bid must be greater than current bid (${formatCurrency(currentBid)})`);
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auction/${roomCode}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to place bid");
      } else {
        sounds.playBid();
        setCustomAmount("");
        if (onBidSuccess) onBidSuccess();
      }
    } catch {
      setErrorMsg("Network error placing bid");
    } finally {
      setLoading(false);
    }
  };

  if (isAuctioneer) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
        <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
          Auctioneer Mode
        </p>
        <p className="text-xs text-slate-400 mt-1">
          You are orchestrating this auction. Team owners submit live bids below. Use the hammer controls to manage the lot.
        </p>
      </div>
    );
  }

  if (!userTeam) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
        <p className="text-xs font-semibold text-slate-400">
          Viewing Mode: You are participating as a spectator. Register a team to bid.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Team</span>
          <h4 className="text-base font-extrabold text-white flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: userTeam.color || "#3b82f6" }} />
            {userTeam.name}
          </h4>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Purse</span>
          <p className="text-sm font-mono font-extrabold text-emerald-400">
            {formatCurrency(userTeam.remainingPurse)}
          </p>
        </div>
      </div>

      {isHighestBidder && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>You currently hold the highest bid of {formatCurrency(currentBid)}!</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20">
          {errorMsg}
        </div>
      )}

      {/* Quick Increments */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Bid Increments
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[minIncrement, minIncrement * 2, minIncrement * 5, minIncrement * 10].map((inc) => {
            const nextAmount = currentBid + inc;
            const canAfford = nextAmount <= userTeam.remainingPurse;
            const disabled = loading || isHighestBidder || !canAfford;

            return (
              <button
                key={inc}
                type="button"
                disabled={disabled}
                onClick={() => handleQuickBid(inc)}
                className={`relative flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                  disabled
                    ? "opacity-50 cursor-not-allowed bg-slate-900 border border-slate-800 text-slate-500"
                    : "bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 border border-slate-700/80 text-white font-bold shadow-md hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                <span className="text-xs font-extrabold font-mono">+{formatCurrency(inc)}</span>
                <span className="text-[10px] opacity-75 mt-0.5">
                  ({formatCurrency(nextAmount)})
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Bid Input */}
        <form onSubmit={handleCustomBid} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="number"
              placeholder={`Min ${formatCurrency(currentBid + minIncrement)}`}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={loading || isHighestBidder}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono font-bold text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isHighestBidder || !customAmount}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/20"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Bid</span>
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
