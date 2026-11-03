"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { sounds } from "./SoundEffects";

interface LiveTimerProps {
  timerEndsAt: string | null;
  totalDuration?: number;
  onTimerExpired?: () => void;
}

export default function LiveTimer({
  timerEndsAt,
  totalDuration = 30,
  onTimerExpired,
}: LiveTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalDuration);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    if (!timerEndsAt) {
      setIsActive(false);
      setSecondsRemaining(totalDuration);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = new Date(timerEndsAt).getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(secs);
      setIsActive(secs > 0);

      if (secs <= 5 && secs > 0) {
        sounds.playWarning();
      }

      if (secs === 0) {
        clearInterval(interval);
        if (onTimerExpired) onTimerExpired();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timerEndsAt, totalDuration, onTimerExpired]);

  const percentage = Math.min(100, Math.max(0, (secondsRemaining / totalDuration) * 100));

  const isCritical = secondsRemaining <= 5 && isActive;
  const isWarning = secondsRemaining <= 10 && secondsRemaining > 5 && isActive;

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
      isCritical
        ? "border-rose-500/80 bg-rose-950/30 animate-pulse shadow-lg shadow-rose-900/40"
        : isWarning
        ? "border-amber-500/80 bg-amber-950/20"
        : "border-slate-800 bg-slate-900/60"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${isCritical ? "text-rose-400 animate-spin" : isWarning ? "text-amber-400" : "text-slate-400"}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Bid Countdown
          </span>
        </div>

        {isCritical && (
          <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-300 border border-rose-500/30 animate-bounce">
            <AlertTriangle className="h-3 w-3" />
            FINAL CALL!
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1 font-mono">
          <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
            isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-white"
          }`}>
            {isActive ? secondsRemaining : "--"}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase">sec</span>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-semibold text-slate-400">
            {!timerEndsAt
              ? "Timer Paused"
              : secondsRemaining <= 3
              ? "Hammer Down Imminent"
              : secondsRemaining <= 10
              ? "Going Twice..."
              : "Bidding Open"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isCritical
              ? "bg-rose-500 shadow-rose-500 shadow-sm"
              : isWarning
              ? "bg-amber-500"
              : "bg-gradient-to-r from-emerald-500 to-cyan-500"
          }`}
          style={{ width: `${isActive ? percentage : 100}%` }}
        />
      </div>
    </div>
  );
}

