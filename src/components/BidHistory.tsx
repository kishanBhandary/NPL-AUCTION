"use client";

import { formatCurrency } from "@/lib/utils";
import { BidDetails } from "@/types";
import { History, TrendingUp } from "lucide-react";

interface BidHistoryProps {
  bids: BidDetails[];
}

export default function BidHistory({ bids }: BidHistoryProps) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Bid Stream
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {bids.length} {bids.length === 1 ? "bid" : "bids"}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {bids.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No bids placed for this player yet.
          </div>
        ) : (
          bids.map((bid, index) => {
            const isLatest = index === 0;
            const timeFormatted = new Date(bid.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={bid.id || `${bid.amount}-${index}`}
                className={`flex items-center justify-between rounded-lg p-2.5 transition-all ${
                  isLatest
                    ? "bg-amber-500/15 border border-amber-500/30 text-white font-bold animate-bid-pulse"
                    : "bg-slate-950/40 border border-slate-800/60 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: bid.team.color || "#3b82f6" }}
                  />
                  <div>
                    <p className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                      <span>{bid.team.name}</span>
                      {isLatest && (
                        <span className="flex items-center gap-0.5 text-[9px] uppercase font-extrabold text-amber-400">
                          <TrendingUp className="h-2.5 w-2.5" /> High
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500">{timeFormatted}</p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs font-extrabold text-white">
                  {formatCurrency(bid.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

