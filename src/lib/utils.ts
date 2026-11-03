import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "VB-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getPositionBadge(position: string) {
  switch (position) {
    case "ATTACKER":
      return {
        label: "Attacker (Spiker)",
        bgColor: "bg-rose-500/15",
        textColor: "text-rose-400",
        borderColor: "border-rose-500/30",
        badge: "ATK",
      };
    case "SETTER":
      return {
        label: "Setter (Playmaker)",
        bgColor: "bg-cyan-500/15",
        textColor: "text-cyan-400",
        borderColor: "border-cyan-500/30",
        badge: "SET",
      };
    case "LIBERO":
      return {
        label: "Libero (Defensive Specialist)",
        bgColor: "bg-emerald-500/15",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        badge: "LIB",
      };
    case "DEFENDER":
      return {
        label: "Blocker / Defender",
        bgColor: "bg-amber-500/15",
        textColor: "text-amber-400",
        borderColor: "border-amber-500/30",
        badge: "DEF",
      };
    case "ALL_ROUNDER":
    default:
      return {
        label: "All-Rounder",
        bgColor: "bg-purple-500/15",
        textColor: "text-purple-400",
        borderColor: "border-purple-500/30",
        badge: "ALL",
      };
  }
}

