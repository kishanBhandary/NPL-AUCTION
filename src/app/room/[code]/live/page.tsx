"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { fireConfetti } from "@/components/ConfettiBlast";
import { sounds } from "@/components/SoundEffects";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
import { SessionUser, AuctionPlayerDetails, BidDetails, TeamDetails } from "@/types";
import {
  Trophy,
  Gavel,
  Radio,
  Clock,
  Shuffle,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Volume2,
  VolumeX,
  Users,
  Loader2,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
  Flame,
  Shield,
  Zap,
  Sparkles,
  User,
  Crown,
  FastForward,
} from "lucide-react";

interface TeamWithSquad {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
  color: string | null;
  totalPurse: number;
  remainingPurse: number;
  mainPlayerName?: string | null;
  squadCount: number;
  owner?: { name: string } | null;
}

interface AuctionEventItem {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
}

// Preset visual color themes for the 4 surrounding team cards matching reference
const TEAM_THEMES = [
  {
    key: "amber",
    glowClass: "glow-amber-team",
    badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    purseBg: "bg-purple-950/70 text-purple-300 border-purple-500/30",
    accentColor: "#F59E0B",
    icon: Flame,
  },
  {
    key: "blue",
    glowClass: "glow-blue-team",
    badgeBg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    purseBg: "bg-purple-950/70 text-purple-300 border-purple-500/30",
    accentColor: "#3B82F6",
    icon: Zap,
  },
  {
    key: "purple",
    glowClass: "glow-purple-team",
    badgeBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    purseBg: "bg-purple-950/70 text-purple-300 border-purple-500/30",
    accentColor: "#A855F7",
    icon: Crown,
  },
  {
    key: "teal",
    glowClass: "glow-teal-team",
    badgeBg: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    purseBg: "bg-purple-950/70 text-purple-300 border-purple-500/30",
    accentColor: "#14B8A6",
    icon: Shield,
  },
];

export default function LiveAuctionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedBidIncrement, setSelectedBidIncrement] = useState<number>(50);

  // Auction State
  const [room, setRoom] = useState<{
    id: string;
    title: string;
    roomCode: string;
    ownerId: string;
    startingPurse: number;
    minBasePrice: number;
    defaultBidIncrement: number;
    timerDuration: number;
    maxSquadSize: number;
  } | null>(null);

  const [auction, setAuction] = useState<{
    id: string;
    status: string;
    currentAuctionPlayerId: string | null;
    currentAuctionPlayer: AuctionPlayerDetails | null;
    currentBid: number;
    currentHighestBidderId: string | null;
    currentHighestBidder: TeamDetails | null;
    timerSeconds: number;
    timerEndsAt: string | null;
  } | null>(null);

  const [currentLotBids, setCurrentLotBids] = useState<BidDetails[]>([]);
  const [teams, setTeams] = useState<TeamWithSquad[]>([]);
  const [upcomingPlayers, setUpcomingPlayers] = useState<AuctionPlayerDetails[]>([]);
  const [soldPlayers, setSoldPlayers] = useState<AuctionPlayerDetails[]>([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState<AuctionPlayerDetails[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuctionEventItem[]>([]);

  // Timer Countdown state in seconds (supports fractional or exact display)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const queueScrollRef = useRef<HTMLDivElement>(null);

  // Fetch full live snapshot from database
  const fetchAuctionState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auction/${code}/state`);
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        setAuction(data.auction);
        setCurrentLotBids(data.currentLotBids || []);
        setTeams(data.teams || []);
        setUpcomingPlayers(data.upcomingPlayers || []);
        setSoldPlayers(data.soldPlayers || []);
        setUnsoldPlayers(data.unsoldPlayers || []);
        if (data.recentEvents) setRecentEvents(data.recentEvents);
      }
    } catch {
      // Quiet background polling
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});

    fetchAuctionState();

    // Supabase Realtime Listener
    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase.channel(`auction_${code}`);

      channel
        .on("broadcast", { event: "PLAYER_CALLED" }, () => {
          fetchAuctionState();
          if (soundEnabled) sounds.playTick();
        })
        .on("broadcast", { event: "BIDDING_STARTED" }, () => {
          fetchAuctionState();
        })
        .on("broadcast", { event: "BID_PLACED" }, () => {
          fetchAuctionState();
          if (soundEnabled) sounds.playBid();
        })
        .on("broadcast", { event: "PLAYER_SOLD" }, () => {
          fetchAuctionState();
          if (soundEnabled) sounds.playSold();
          fireConfetti();
        })
        .on("broadcast", { event: "PLAYER_UNSOLD" }, () => {
          fetchAuctionState();
        })
        .on("broadcast", { event: "TIMER_RESET" }, () => {
          fetchAuctionState();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const interval = setInterval(fetchAuctionState, 1500);
      return () => clearInterval(interval);
    }
  }, [code, fetchAuctionState, soundEnabled]);

  // High precision timer countdown ticker
  useEffect(() => {
    if (!auction?.timerEndsAt) {
      setSecondsRemaining(room?.timerDuration || 30);
      return;
    }

    const interval = setInterval(() => {
      const endsAt = new Date(auction.timerEndsAt!).getTime();
      const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
    }, 250);

    return () => clearInterval(interval);
  }, [auction?.timerEndsAt, room?.timerDuration]);

  const isAuctioneer = currentUser?.id === room?.ownerId;
  const userTeam =
    teams.find((t) => t.owner?.name === currentUser?.name) ||
    teams.find((t) => t.id === currentUser?.teamId) ||
    null;

  const isHighestBidder = Boolean(
    auction?.currentHighestBidderId && userTeam && auction.currentHighestBidderId === userTeam.id
  );

  const activeLot = auction?.currentAuctionPlayer;
  const isPlayerOnBlock = Boolean(activeLot && activeLot.status === "IN_AUCTION");
  const isTimerActive = Boolean(
    auction?.timerEndsAt && new Date(auction.timerEndsAt).getTime() > Date.now()
  );

  const currentBidAmount = auction?.currentBid || room?.minBasePrice || 50;
  const nextCalculatedBid =
    !auction?.currentHighestBidderId
      ? currentBidAmount
      : currentBidAmount + selectedBidIncrement;

  // Master Auctioneer Controls
  const handleSelectRandomPlayer = async () => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/auction/${code}/select-player`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to call next player");
      } else {
        fetchAuctionState();
      }
    } catch {
      setErrorMsg("Network error selecting player");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBidding = async () => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/auction/${code}/start-bidding`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to start bidding");
      } else {
        fetchAuctionState();
      }
    } catch {
      setErrorMsg("Network error starting bidding");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSold = async () => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/auction/${code}/sold`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to mark player as sold");
      } else {
        sounds.playSold();
        fireConfetti();
        fetchAuctionState();
      }
    } catch {
      setErrorMsg("Network error completing sale");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsold = async () => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/auction/${code}/unsold`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to mark unsold");
      } else {
        fetchAuctionState();
      }
    } catch {
      setErrorMsg("Network error marking unsold");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetTimer = async () => {
    if (!isAuctioneer) return;
    try {
      await fetch(`/api/auction/${code}/reset-timer`, { method: "POST" });
      fetchAuctionState();
    } catch {}
  };

  // Place Bid for Franchise Owner
  const handlePlaceBid = async (customAmount?: number) => {
    const amountToBid = customAmount || nextCalculatedBid;
    setErrorMsg(null);
    setBiddingLoading(true);

    try {
      const res = await fetch(`/api/auction/${code}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToBid }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to place bid");
      } else {
        sounds.playBid();
        fetchAuctionState();
      }
    } catch {
      setErrorMsg("Network error placing bid");
    } finally {
      setBiddingLoading(false);
    }
  };

  // Queue Horizontal Scroll helpers
  const scrollQueue = (direction: "left" | "right") => {
    if (queueScrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      queueScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b16] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-slate-300">Entering NPL Live Auction Arena...</p>
      </div>
    );
  }

  // Calculate statistics
  const totalAmountSpent = soldPlayers.reduce((acc, sp) => acc + (sp.finalPrice || 0), 0);
  const totalPoolPlayers =
    (activeLot ? 1 : 0) + upcomingPlayers.length + soldPlayers.length + unsoldPlayers.length;

  // Separate surrounding 4 teams
  const team1 = teams[0] || null;
  const team2 = teams[1] || null;
  const team3 = teams[2] || null;
  const team4 = teams[3] || null;

  // Render Franchise Panel helper
  const renderTeamCard = (team: TeamWithSquad | null, themeIndex: number, positionLabel: string) => {
    const theme = TEAM_THEMES[themeIndex % TEAM_THEMES.length];
    const isCurrentHighest = Boolean(team && auction?.currentHighestBidderId === team.id);

    // Latest bid placed by this team on current lot
    const teamLatestBid = team
      ? currentLotBids.find((b) => b.teamId === team.id)
      : null;

    if (!team) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/30 p-4 min-h-[145px] flex flex-col items-center justify-center text-center">
          <Shield className="h-6 w-6 text-slate-700 mb-1" />
          <p className="text-xs font-bold text-slate-500">Franchise Slot {positionLabel}</p>
          <span className="text-[10px] text-slate-600">Waiting for team to join</span>
        </div>
      );
    }

    return (
      <div
        className={`rounded-2xl p-4 transition-all duration-300 relative bg-[#090e1c]/90 backdrop-blur-md ${
          isCurrentHighest
            ? "glow-amber-team border-2 border-amber-400 scale-[1.02]"
            : `${theme.glowClass} bg-[#090e1c]/90`
        }`}
      >
        {/* Top Header: Logo + Name + Owner + Online + Purse */}
        <div className="flex items-start justify-between gap-2">
          {/* Logo & Name */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Team Logo Badge */}
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 relative overflow-hidden shadow-lg border border-slate-700/60"
              style={{
                backgroundColor: team.color ? `${team.color}20` : "#1e293b",
                color: team.color || "#f8fafc",
              }}
            >
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span>{team.name.charAt(0)}</span>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-black text-white truncate tracking-wide">
                {team.name}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                Owner: <span className="text-slate-200">{team.owner?.name || "Franchise"}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400">Online</span>
              </div>
            </div>
          </div>

          {/* Purse Badge on Top Right */}
          <div className="rounded-xl px-2.5 py-1 text-right shrink-0 bg-[#16122d] border border-purple-500/30">
            <span className="text-[12px] font-black font-mono text-purple-300 block">
              ₹{team.remainingPurse?.toLocaleString("en-IN")}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400/80">
              Purse
            </span>
          </div>
        </div>

        {/* Bottom Inset: Latest Bid / No Bid Yet / Highest Bidder Badge */}
        <div className="mt-3">
          {isCurrentHighest ? (
            <div className="rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 p-2 text-center border border-amber-500/50 shadow-sm flex items-center justify-center gap-2">
              <Flame className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
              <span className="text-xs font-black text-amber-300">
                HOLDING HIGHEST BID (₹{auction?.currentBid?.toLocaleString("en-IN")})
              </span>
            </div>
          ) : teamLatestBid ? (
            <div className="rounded-xl bg-slate-950/80 p-2 text-center border border-slate-800 flex items-center justify-between px-3 text-xs">
              <span className="text-slate-400 text-[11px]">Latest Bid:</span>
              <span className="font-mono font-black text-cyan-400">
                ₹{teamLatestBid.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-950/60 p-2 text-center border border-slate-900 text-xs font-medium text-slate-500">
              No Bid Yet
            </div>
          )}
        </div>
      </div>
    );
  };

  const positionBadge = getPositionBadge(activeLot?.player.position || "ATTACKER");

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col arena-court-bg">
      {/* Top Navigation */}
      <Navbar
        roomCode={code}
        roomTitle={room?.title}
        roomStatus="LIVE"
        activeTab="live"
      />

      <main className="flex-1 max-w-[1700px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Error notification */}
        {errorMsg && (
          <div className="rounded-xl bg-rose-500/15 p-3 text-xs font-bold text-rose-300 border border-rose-500/30 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Sub-header Bar: Center Title & Right 3 Stat Badges */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
          {/* Audio toggle left for convenience */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute Arena Audio" : "Enable Arena Audio"}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white border border-slate-800"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Audio ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>

          {/* Centered Grand Title matching reference screenshot */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-amber-400 mb-0.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>NARAYANA GURU PREMIERE LEAGUE (NPL)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              LIVE <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">AUCTION ARENA</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Real-time volleyball player auction
            </p>
          </div>

          {/* Right 3 Stat Cards matching screenshot: Base Price (₹50), Bid Increment (₹50), Team Purse (₹5,000) */}
          <div className="flex items-center gap-2.5">
            {/* Base Price Card */}
            <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-3.5 py-1.5 text-center min-w-[75px] shadow-md">
              <span className="text-sm font-black font-mono text-white block">
                ₹{room?.minBasePrice || 50}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                Base Price
              </span>
            </div>

            {/* Bid Increment Card */}
            <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-3.5 py-1.5 text-center min-w-[85px] shadow-md">
              <span className="text-sm font-black font-mono text-white block">
                ₹{room?.defaultBidIncrement || 50}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                Bid Increment
              </span>
            </div>

            {/* Team Purse Card (Emerald) */}
            <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-3.5 py-1.5 text-center min-w-[95px] shadow-md">
              <span className="text-sm font-black font-mono text-emerald-400 block">
                ₹{room?.startingPurse?.toLocaleString("en-IN") || "5,000"}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                Team Purse
              </span>
            </div>
          </div>
        </div>

        {/* MAIN STAGE: 4 Surrounding Franchise Panels + Central Player Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left Column: Franchise 1 (Top) & Franchise 2 (Bottom) */}
          <div className="lg:col-span-3 space-y-4">
            {renderTeamCard(team1, 0, "1")}
            {renderTeamCard(team2, 1, "2")}
          </div>

          {/* Center Column: Central Player Spotlight + 3D Current Bid Plinth + Timer + Control Bar */}
          <div className="lg:col-span-6 space-y-3">
            {/* Central Player Spotlight Card */}
            <div className="rounded-2xl border border-slate-800/90 bg-[#090e1d]/90 p-5 shadow-2xl relative overflow-hidden court-net-pattern backdrop-blur-md">
              {/* Subtle Stadium Floodlight effects */}
              <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

              {activeLot ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                  {/* Player Photograph with Golden Highlight Frame */}
                  <div className="relative h-44 w-44 sm:h-48 sm:w-48 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-500/60 shadow-xl shadow-amber-500/20 bg-slate-900">
                    {activeLot.player.photoUrl ? (
                      <Image
                        src={activeLot.player.photoUrl}
                        alt={activeLot.player.name}
                        fill
                        className="object-cover"
                        unoptimized
                        priority
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-slate-900 to-slate-800 text-amber-400">
                        <User className="h-20 w-20 opacity-80" />
                      </div>
                    )}

                    {/* Lot Number Badge */}
                    <div className="absolute top-2 left-2 rounded-lg bg-slate-950/80 px-2 py-0.5 text-[10px] font-black text-amber-400 border border-amber-500/40">
                      LOT #{activeLot.lotNumber || 1}
                    </div>
                  </div>

                  {/* Player Details Information */}
                  <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide truncate">
                        {activeLot.player.name}
                      </h2>

                      {/* Position Pill with gavel/ball icon */}
                      <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 mt-1">
                        <Gavel className="h-3.5 w-3.5 text-amber-400" />
                        <span>{positionBadge.label}</span>
                      </div>
                    </div>

                    {/* Additional Details Table matching reference style */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 max-w-sm mx-auto sm:mx-0">
                      <div className="flex items-center gap-2 text-slate-400">
                        <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Role:</span>
                        <strong className="text-slate-200">{positionBadge.badge}</strong>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <Trophy className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Status:</span>
                        <strong className="text-amber-400 uppercase font-mono text-[11px]">
                          {activeLot.status}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <Radio className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Base Price:</span>
                        <strong className="text-slate-200">₹{activeLot.basePrice || 50}</strong>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <Sparkles className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Increment:</span>
                        <strong className="text-cyan-400">₹{room?.defaultBidIncrement || 50}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Player in Auction Spotlight */
                <div className="py-12 text-center space-y-3 relative z-10">
                  <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Gavel className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">Auction Block Waiting</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {upcomingPlayers.length > 0
                      ? `${upcomingPlayers.length} players ready in the queue. Click "Call Next Player" to commence bidding.`
                      : "All players have been auctioned! Check the final results."}
                  </p>
                </div>
              )}
            </div>

            {/* Current Bid 3D Trapezoid Plinth flanked by Base Price and Bid Increment */}
            <div className="flex items-center justify-center gap-3">
              {/* Left Flank Card: Base Price */}
              <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-4 py-2 text-center shrink-0 min-w-[90px] shadow-md">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Base Price
                </span>
                <span className="text-sm font-black font-mono text-white block mt-0.5">
                  ₹{activeLot?.basePrice || room?.minBasePrice || 50}
                </span>
              </div>

              {/* Center 3D Current Bid Pedestal / Plinth */}
              <div className="flex-1 max-w-xs rounded-2xl bid-plinth-trapezoid py-2 px-6 text-center text-slate-950 shadow-2xl">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-900 block">
                  CURRENT BID
                </span>
                <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-black text-white drop-shadow">
                  <Gavel className="h-6 w-6 text-amber-200" />
                  <span>₹{currentBidAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Right Flank Card: Bid Increment */}
              <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-4 py-2 text-center shrink-0 min-w-[90px] shadow-md">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Bid Increment
                </span>
                <span className="text-sm font-black font-mono text-cyan-400 block mt-0.5">
                  ₹{room?.defaultBidIncrement || 50}
                </span>
              </div>
            </div>

            {/* Countdown Timer Row matching reference image */}
            <div className="rounded-xl bg-[#090e1c] border border-slate-800/80 px-4 py-2 flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-rose-500 font-mono font-black text-sm">
                  <Clock className="h-4 w-4 text-rose-500 animate-pulse" />
                  <span>
                    00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Time Left to Bid</span>
              </div>

              {/* Smooth Progress Bar */}
              <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (secondsRemaining / (room?.timerDuration || 30)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Bidding Controls & Auctioneer Action Bar matching reference image */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Quick Increment Buttons */}
                <div className="flex items-center gap-1.5">
                  {[50, 100, 250, 500].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setSelectedBidIncrement(inc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all border ${
                        selectedBidIncrement === inc
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm"
                          : "bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      + ₹{inc}
                    </button>
                  ))}
                </div>

                {/* Primary Action Button: Place Bid (₹...) for franchise owners */}
                {userTeam && isPlayerOnBlock && (
                  <button
                    type="button"
                    onClick={() => handlePlaceBid()}
                    disabled={
                      biddingLoading ||
                      isHighestBidder ||
                      !isTimerActive ||
                      nextCalculatedBid > userTeam.remainingPurse
                    }
                    className="flex-1 min-w-[180px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-2.5 px-4 text-xs font-black text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {biddingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    ) : isHighestBidder ? (
                      <span>YOU ARE HIGHEST BIDDER</span>
                    ) : (
                      <>
                        <Gavel className="h-4 w-4" />
                        <span>Place Bid (₹{nextCalculatedBid.toLocaleString("en-IN")})</span>
                      </>
                    )}
                  </button>
                )}

                {/* Auctioneer Gavel Action Buttons */}
                {isAuctioneer && (
                  <div className="flex items-center gap-2">
                    {!isPlayerOnBlock ? (
                      <button
                        onClick={handleSelectRandomPlayer}
                        disabled={actionLoading || upcomingPlayers.length === 0}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40 shadow-md shadow-amber-500/20"
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                        <span>Call Next Player</span>
                      </button>
                    ) : (
                      <>
                        {!isTimerActive && (
                          <button
                            onClick={handleStartBidding}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md"
                          >
                            <Play className="h-3.5 w-3.5 fill-slate-950" />
                            <span>Start Timer</span>
                          </button>
                        )}

                        <button
                          onClick={handleSold}
                          disabled={actionLoading || !auction?.currentHighestBidderId}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-40 shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>SOLD</span>
                        </button>

                        <button
                          onClick={handleUnsold}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-40 shadow-md"
                        >
                          <FastForward className="h-3.5 w-3.5" />
                          <span>Skip / Unsold</span>
                        </button>

                        <button
                          onClick={handleResetTimer}
                          title="Reset Timer (+30s)"
                          className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Franchise 3 (Top) & Franchise 4 (Bottom) */}
          <div className="lg:col-span-3 space-y-4">
            {renderTeamCard(team3, 2, "3")}
            {renderTeamCard(team4, 3, "4")}
          </div>
        </div>

        {/* BOTTOM ROW: 3 Panels matching screenshot
            Left: Auction Status
            Center: Player Queue (42)
            Right: Live Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch pt-2">
          {/* Left Panel: Auction Status (Bar Chart Icon) */}
          <div className="lg:col-span-3 rounded-2xl bg-[#090e1d]/90 border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5 mb-3">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Auction Status
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Players Sold</span>
                  <span className="font-mono font-black text-white">{soldPlayers.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Spent</span>
                  <span className="font-mono font-black text-emerald-400">
                    ₹{totalAmountSpent.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Unsold Players</span>
                  <span className="font-mono font-black text-rose-400">{unsoldPlayers.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Players Remaining</span>
                  <span className="font-mono font-black text-amber-400">{upcomingPlayers.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-900 text-[10px] text-slate-500 text-center font-bold">
              Total Roster Pool: {totalPoolPlayers} Athletes
            </div>
          </div>

          {/* Center Panel: Player Queue Carousel */}
          <div className="lg:col-span-6 rounded-2xl bg-[#090e1d]/90 border border-slate-800/90 p-4 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Player Queue ({upcomingPlayers.length + (activeLot ? 1 : 0)})
                </h3>
              </div>

              {/* Scroll controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollQueue("left")}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 p-1 text-slate-400 hover:text-white border border-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollQueue("right")}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 p-1 text-slate-400 hover:text-white border border-slate-800"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Horizontal Player Carousel */}
            <div
              ref={queueScrollRef}
              className="flex items-center gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
            >
              {/* If player on block, show as first card with glowing LIVE border */}
              {activeLot && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-500/10 p-2 min-w-[95px] max-w-[95px] text-center shadow-lg shrink-0 relative">
                  <div className="relative h-14 w-14 rounded-full overflow-hidden mx-auto bg-slate-900 border border-amber-400/80 shadow">
                    {activeLot.player.photoUrl ? (
                      <Image
                        src={activeLot.player.photoUrl}
                        alt={activeLot.player.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-amber-400">
                        {activeLot.player.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <p className="mt-1.5 text-[11px] font-black text-white truncate">
                    {activeLot.player.name}
                  </p>
                  <p className="text-[9px] text-amber-400 font-bold truncate">
                    {activeLot.player.position}
                  </p>

                  <span className="mt-1 inline-block rounded bg-amber-500 px-1.5 py-0.2 text-[8px] font-black text-slate-950 uppercase">
                    LIVE
                  </span>
                </div>
              )}

              {/* Upcoming players */}
              {upcomingPlayers.map((ap) => (
                <div
                  key={ap.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 min-w-[95px] max-w-[95px] text-center shrink-0 hover:border-slate-700 transition-colors"
                >
                  <div className="relative h-14 w-14 rounded-full overflow-hidden mx-auto bg-slate-950 border border-slate-800">
                    {ap.player.photoUrl ? (
                      <Image
                        src={ap.player.photoUrl}
                        alt={ap.player.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">
                        {ap.player.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <p className="mt-1.5 text-[11px] font-bold text-slate-200 truncate">
                    {ap.player.name}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">{ap.player.position}</p>
                  <span className="mt-1 inline-block text-[9px] font-mono text-cyan-400 font-bold">
                    ₹{ap.basePrice || 50}
                  </span>
                </div>
              ))}

              {upcomingPlayers.length === 0 && !activeLot && (
                <div className="py-6 text-center text-xs text-slate-500 w-full">
                  No upcoming players remaining in the queue.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Live Activity Feed (Radio Icon + Red LIVE Pill) */}
          <div className="lg:col-span-3 rounded-2xl bg-[#090e1d]/90 border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Live Activity
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-black text-rose-400 border border-rose-500/30">
                  <span className="h-1 w-1 rounded-full bg-rose-400 animate-ping" />
                  LIVE
                </span>
              </div>

              {/* Feed items */}
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {/* Synthesized recent bids if available */}
                {currentLotBids.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-[11px] rounded-lg bg-slate-950/60 p-2 border border-slate-900"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Gavel className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="text-slate-300 truncate">
                        <strong className="text-white">{b.team.name}</strong> placed bid
                      </span>
                    </div>
                    <span className="font-mono font-black text-emerald-400 shrink-0">
                      ₹{b.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}

                {/* Database events */}
                {recentEvents.slice(0, 4).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between text-[11px] rounded-lg bg-slate-950/40 p-2 border border-slate-900/60"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Activity className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span className="text-slate-400 truncate">{evt.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {new Date(evt.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}

                {currentLotBids.length === 0 && recentEvents.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Awaiting live bids and room events...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 text-right">
              <Link
                href={`/room/${code}/results`}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline"
              >
                View Full Results →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
