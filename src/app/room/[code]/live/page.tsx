"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { fireConfetti } from "@/components/ConfettiBlast";
import { sounds } from "@/components/SoundEffects";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
  PartyPopper,
  Check,
  Star,
  ExternalLink,
  Power,
  AlertTriangle,
  X,
  RefreshCw,
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
  mainPlayerPosition?: string | null;
  mainPlayerPhotoUrl?: string | null;
  squadCount: number;
  squad?: Array<{
    id: string;
    finalPrice: number | null;
    basePrice?: number;
    lotNumber?: number | null;
    soldAt?: string | null;
    player: {
      id: string;
      name: string;
      photoUrl: string | null;
      position: string;
    };
  }>;
  ownerId?: string;
  owner?: { id?: string; name: string } | null;
}

interface AuctionEventItem {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
}

interface SoldCelebrationData {
  playerName: string;
  photoUrl: string | null;
  position?: string;
  winningTeamId?: string;
  winningTeamName: string;
  winningTeamLogo?: string | null;
  finalPrice: number;
}

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
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingText, setActionLoadingText] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedBidIncrement, setSelectedBidIncrement] = useState<number>(50);

  // Mobile Bottom Tab state: 'queue' | 'activity' | 'status'
  const [mobileBottomTab, setMobileBottomTab] = useState<"queue" | "activity" | "status">("queue");

  // Sold Celebration Modal state
  const [soldCelebration, setSoldCelebration] = useState<SoldCelebrationData | null>(null);
  const [celebrationSeconds, setCelebrationSeconds] = useState<number>(6);

  // Won Squad Viewer Modal state
  const [selectedTeamSquad, setSelectedTeamSquad] = useState<TeamWithSquad | null>(null);

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

  // Timer Countdown state in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const queueScrollRef = useRef<HTMLDivElement>(null);
  const lastKnownPlayerIdRef = useRef<string | null>(null);
  // Ultra-fast single-press bidding lock refs (0ms delay, blocks accidental double clicks)
  const isSubmittingBidRef = useRef(false);
  const lastBidTimestampRef = useRef(0);

  // Fetch full live snapshot
  const fetchAuctionState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auction/${code}/state`);
      const data = await res.json();
      if (data.room) {
        if (data.room.status === "COMPLETED") {
          router.push(`/room/${code}/results`);
          return;
        }
        if (data.room.status === "WAITING") {
          router.push(`/room/${code}/waiting`);
          return;
        }
        setRoom(data.room);
        setAuction((prev) => {
          if (!data.auction) return null;
          // Protect recent optimistic bid from being downgraded by stale snapshot
          if (
            prev &&
            Date.now() - lastBidTimestampRef.current < 2000 &&
            prev.currentBid > data.auction.currentBid &&
            prev.currentAuctionPlayerId === data.auction.currentAuctionPlayerId
          ) {
            return {
              ...data.auction,
              currentBid: prev.currentBid,
              currentHighestBidderId: prev.currentHighestBidderId,
              currentHighestBidder: prev.currentHighestBidder,
              timerEndsAt: prev.timerEndsAt,
            };
          }
          return data.auction;
        });
        lastKnownPlayerIdRef.current = data.auction?.currentAuctionPlayerId || null;
        setCurrentLotBids((prev) => {
          const serverBids: BidDetails[] = data.currentLotBids || [];
          const optimisticBids = prev.filter((b) => b.id.startsWith("opt-"));
          if (optimisticBids.length > 0 && Date.now() - lastBidTimestampRef.current < 2000) {
            const hasConfirmed = serverBids.some((b) => b.amount >= optimisticBids[0].amount);
            if (!hasConfirmed) {
              const serverIds = new Set(serverBids.map((b) => b.id));
              return [...optimisticBids, ...serverBids.filter((b) => !serverIds.has(b.id))];
            }
          }
          return serverBids;
        });
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
  }, [code, router]);

  // Handle trigger sold celebration across all participant and team owner screens
  const lastCelebratedTimestampRef = useRef<number>(0);
  const triggerSoldCelebration = useCallback(
    (details: {
      playerName: string;
      photoUrl: string | null;
      position?: string;
      winningTeamId?: string;
      winningTeamName: string;
      winningTeamLogo?: string | null;
      finalPrice: number;
    }) => {
      lastCelebratedTimestampRef.current = Date.now();
      setSoldCelebration(details);
      setCelebrationSeconds(7);
      if (soundEnabled) sounds.playSold();
      fireConfetti();
    },
    [soundEnabled]
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});

    fetchAuctionState();

    // 1. FAST REAL-TIME: Server-Sent Events (SSE) Listener (<20ms latency)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/auction/${code}/stream`);

      eventSource.addEventListener("BID_PLACED", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { bid, currentBid, highestBidder, timerEndsAt } = payload;

          setAuction((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentBid: currentBid ?? prev.currentBid,
              currentHighestBidderId: highestBidder?.id || prev.currentHighestBidderId,
              currentHighestBidder: highestBidder || prev.currentHighestBidder,
              timerEndsAt: timerEndsAt || prev.timerEndsAt,
            };
          });

          if (bid) {
            setCurrentLotBids((prev) => [bid, ...prev.filter((b) => b.id !== bid.id)]);
          }

          if (highestBidder) {
            setTeams((prev) =>
              prev.map((t) =>
                t.id === highestBidder.id
                  ? { ...t, remainingPurse: highestBidder.remainingPurse }
                  : t
              )
            );
          }

          if (soundEnabled) sounds.playBid();
        } catch {}
      });

      eventSource.addEventListener("PLAYER_CALLED", (e: MessageEvent) => {
        setSoldCelebration(null);
        try {
          const payload = JSON.parse(e.data);
          const { auctionPlayer, currentBid } = payload;
          if (auctionPlayer) {
            setAuction((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentAuctionPlayerId: auctionPlayer.id,
                currentAuctionPlayer: auctionPlayer,
                currentBid: currentBid || auctionPlayer.basePrice,
                currentHighestBidderId: null,
                currentHighestBidder: null,
                timerEndsAt: null,
              };
            });
            setUpcomingPlayers((prev) => prev.filter((p) => p.id !== auctionPlayer.id));
            setCurrentLotBids([]);
          }
        } catch {}
        if (soundEnabled) sounds.playTick();
      });

      eventSource.addEventListener("BIDDING_STARTED", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.timerEndsAt) {
            setAuction((prev) => (prev ? { ...prev, timerEndsAt: payload.timerEndsAt } : prev));
          }
        } catch {}
      });

      eventSource.addEventListener("PLAYER_SOLD", (e: MessageEvent) => {
        try {
          const p = JSON.parse(e.data);
          if (p) {
            triggerSoldCelebration({
              playerName: p.soldPlayer?.player?.name || "Player",
              photoUrl: p.soldPlayer?.player?.photoUrl || null,
              position: p.soldPlayer?.player?.position,
              winningTeamName: p.winningTeam?.name || "Winning Team",
              winningTeamLogo: p.winningTeam?.logoUrl || null,
              finalPrice: p.finalPrice || 0,
            });
            if (p.soldPlayer) {
              setSoldPlayers((prev) => [p.soldPlayer, ...prev.filter((sp) => sp.id !== p.soldPlayer.id)]);
            }
            if (p.winningTeam) {
              setTeams((prev) =>
                prev.map((t) =>
                  t.id === p.winningTeam.id
                    ? { ...t, remainingPurse: p.winningTeam.remainingPurse }
                    : t
                )
              );
            }
          }
        } catch {}
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentAuctionPlayerId: null,
                currentAuctionPlayer: null,
                currentBid: 0,
                currentHighestBidderId: null,
                currentHighestBidder: null,
                timerEndsAt: null,
              }
            : prev
        );
        setCurrentLotBids([]);
      });

      eventSource.addEventListener("PLAYER_UNSOLD", (e: MessageEvent) => {
        try {
          const p = JSON.parse(e.data);
          if (p?.unsoldPlayer) {
            setUnsoldPlayers((prev) => [p.unsoldPlayer, ...prev.filter((u) => u.id !== p.unsoldPlayer.id)]);
          }
        } catch {}
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentAuctionPlayerId: null,
                currentAuctionPlayer: null,
                currentBid: 0,
                currentHighestBidderId: null,
                currentHighestBidder: null,
                timerEndsAt: null,
              }
            : prev
        );
        setCurrentLotBids([]);
      });

      eventSource.addEventListener("TIMER_RESET", (e: MessageEvent) => {
        try {
          const p = JSON.parse(e.data);
          if (p?.timerEndsAt) {
            setAuction((prev) => (prev ? { ...prev, timerEndsAt: p.timerEndsAt } : prev));
          }
        } catch {}
      });

      eventSource.addEventListener("AUCTION_RESET", (e: MessageEvent) => {
        try {
          const p = JSON.parse(e.data);
          if (p?.status === "WAITING") {
            router.push(`/room/${code}/waiting`);
          } else {
            setSoldCelebration(null);
            setCurrentLotBids([]);
            fetchAuctionState();
          }
        } catch {}
      });

      eventSource.addEventListener("ROOM_STATUS_CHANGED", (e: MessageEvent) => {
        try {
          const p = JSON.parse(e.data);
          if (p?.status === "COMPLETED") {
            router.push(p?.redirectUrl || `/room/${code}/results`);
          } else if (p?.status === "WAITING") {
            router.push(p?.redirectUrl || `/room/${code}/waiting`);
          }
        } catch {}
      });
    } catch {
      // SSE not supported or blocked
    }

    // 2. SUPABASE REALTIME (if configured)
    const supabaseClient = getSupabaseClient();
    let supabaseChannel: RealtimeChannel | null = null;
    if (supabaseClient) {
      supabaseChannel = supabaseClient.channel(`auction_${code}`);
      supabaseChannel
        .on("broadcast", { event: "PLAYER_CALLED" }, (payload) => {
          setSoldCelebration(null);
          const p = payload?.payload;
          if (p?.auctionPlayer) {
            setAuction((prev) =>
              prev
                ? {
                    ...prev,
                    currentAuctionPlayerId: p.auctionPlayer.id,
                    currentAuctionPlayer: p.auctionPlayer,
                    currentBid: p.currentBid || p.auctionPlayer.basePrice,
                    currentHighestBidderId: null,
                    currentHighestBidder: null,
                    timerEndsAt: null,
                  }
                : prev
            );
            setUpcomingPlayers((prev) => prev.filter((pl) => pl.id !== p.auctionPlayer.id));
            setCurrentLotBids([]);
          }
          if (soundEnabled) sounds.playTick();
        })
        .on("broadcast", { event: "BID_PLACED" }, (payload) => {
          const p = payload?.payload;
          if (p) {
            setAuction((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentBid: p.currentBid ?? prev.currentBid,
                currentHighestBidderId: p.highestBidder?.id || prev.currentHighestBidderId,
                currentHighestBidder: p.highestBidder || prev.currentHighestBidder,
                timerEndsAt: p.timerEndsAt || prev.timerEndsAt,
              };
            });
            if (p.bid) {
              setCurrentLotBids((prev) => [p.bid, ...prev.filter((b) => b.id !== p.bid.id)]);
            }
            if (p.highestBidder) {
              setTeams((prev) =>
                prev.map((t) =>
                  t.id === p.highestBidder.id
                    ? { ...t, remainingPurse: p.highestBidder.remainingPurse }
                    : t
                )
              );
            }
          }
          if (soundEnabled) sounds.playBid();
        })
        .on("broadcast", { event: "PLAYER_SOLD" }, (payload) => {
          const p = payload?.payload;
          if (p) {
            triggerSoldCelebration({
              playerName: p.soldPlayer?.player?.name || "Player",
              photoUrl: p.soldPlayer?.player?.photoUrl || null,
              position: p.soldPlayer?.player?.position,
              winningTeamName: p.winningTeam?.name || "Winning Team",
              winningTeamLogo: p.winningTeam?.logoUrl || null,
              finalPrice: p.finalPrice || 0,
            });
            if (p.soldPlayer) {
              setSoldPlayers((prev) => [p.soldPlayer, ...prev.filter((sp) => sp.id !== p.soldPlayer.id)]);
            }
            if (p.winningTeam) {
              setTeams((prev) =>
                prev.map((t) =>
                  t.id === p.winningTeam.id
                    ? { ...t, remainingPurse: p.winningTeam.remainingPurse }
                    : t
                )
              );
            }
          }
          setAuction((prev) =>
            prev
              ? {
                  ...prev,
                  currentAuctionPlayerId: null,
                  currentAuctionPlayer: null,
                  currentBid: 0,
                  currentHighestBidderId: null,
                  currentHighestBidder: null,
                  timerEndsAt: null,
                }
              : prev
          );
          setCurrentLotBids([]);
        })
        .on("broadcast", { event: "PLAYER_UNSOLD" }, (payload) => {
          const p = payload?.payload;
          if (p?.unsoldPlayer) {
            setUnsoldPlayers((prev) => [p.unsoldPlayer, ...prev.filter((u) => u.id !== p.unsoldPlayer.id)]);
          }
          setAuction((prev) =>
            prev
              ? {
                  ...prev,
                  currentAuctionPlayerId: null,
                  currentAuctionPlayer: null,
                  currentBid: 0,
                  currentHighestBidderId: null,
                  currentHighestBidder: null,
                  timerEndsAt: null,
                }
              : prev
          );
          setCurrentLotBids([]);
        })
        .on("broadcast", { event: "TIMER_RESET" }, (payload) => {
          const p = payload?.payload;
          if (p?.timerEndsAt) {
            setAuction((prev) => (prev ? { ...prev, timerEndsAt: p.timerEndsAt } : prev));
          }
        })
        .on("broadcast", { event: "AUCTION_RESET" }, (payload) => {
          const p = payload?.payload;
          if (p?.status === "WAITING") {
            router.push(`/room/${code}/waiting`);
          } else {
            setSoldCelebration(null);
            setCurrentLotBids([]);
            fetchAuctionState();
          }
        })
        .on("broadcast", { event: "ROOM_STATUS_CHANGED" }, (payload) => {
          const p = payload?.payload;
          if (p?.status === "COMPLETED") {
            router.push(p?.redirectUrl || `/room/${code}/results`);
          } else if (p?.status === "WAITING") {
            router.push(p?.redirectUrl || `/room/${code}/waiting`);
          }
        })
        .subscribe();
    }

    // 3. ULTRA-FAST DELTA SYNC POLLER (500ms In-Memory Heartbeat Fallback)
    const deltaSyncInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auction/${code}/sync`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.roomStatus === "COMPLETED") {
          router.push(`/room/${code}/results`);
          return;
        } else if (data.roomStatus === "WAITING") {
          router.push(`/room/${code}/waiting`);
          return;
        }

        if (data.auction) {
          // If player lot changed, trigger full state refresh
          if (
            lastKnownPlayerIdRef.current &&
            data.auction.currentAuctionPlayerId !== lastKnownPlayerIdRef.current
          ) {
            fetchAuctionState();
            return;
          }

          // Ultra-fast local state sync with optimistic protection
          setAuction((prev) => {
            if (!prev) return prev;
            // Never let stale poller downgrade recent optimistic bid
            if (
              Date.now() - lastBidTimestampRef.current < 2000 &&
              prev.currentBid > data.auction.currentBid &&
              prev.currentAuctionPlayerId === data.auction.currentAuctionPlayerId
            ) {
              return prev;
            }
            if (
              prev.currentBid === data.auction.currentBid &&
              prev.currentHighestBidderId === data.auction.currentHighestBidderId &&
              prev.timerEndsAt === data.auction.timerEndsAt
            ) {
              return prev;
            }
            return {
              ...prev,
              currentBid: data.auction.currentBid,
              currentHighestBidderId: data.auction.currentHighestBidderId,
              currentHighestBidder: data.auction.currentHighestBidder,
              timerEndsAt: data.auction.timerEndsAt,
              status: data.auction.status,
            };
          });

          if (data.latestBids && data.latestBids.length > 0) {
            setCurrentLotBids((prev) => {
              const prevIds = new Set(prev.map((b) => b.id));
              const newBids = data.latestBids.filter((b: BidDetails) => !prevIds.has(b.id));
              if (newBids.length > 0) {
                return [...newBids, ...prev];
              }
              return prev;
            });
          }
        }
      } catch {}
    }, 500);

    return () => {
      clearInterval(deltaSyncInterval);
      if (eventSource) eventSource.close();
      if (supabaseClient && supabaseChannel) supabaseClient.removeChannel(supabaseChannel);
    };
  }, [code, fetchAuctionState, soundEnabled, triggerSoldCelebration]);

  // Congratulations celebration timer ticker
  useEffect(() => {
    if (!soldCelebration) return;

    const timer = setInterval(() => {
      setCelebrationSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSoldCelebration(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [soldCelebration]);

  // Auction timer countdown ticker
  useEffect(() => {
    if (!auction?.timerEndsAt) {
      setSecondsRemaining(room?.timerDuration || 30);
      return;
    }

    const interval = setInterval(() => {
      const endsAt = new Date(auction.timerEndsAt!).getTime();
      const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
    }, 200);

    return () => clearInterval(interval);
  }, [auction?.timerEndsAt, room?.timerDuration]);

  // Role checks
  const isAuctioneer = currentUser?.id === room?.ownerId;
  const userTeam =
    teams.find(
      (t) =>
        (t.owner?.id && currentUser?.id && t.owner.id === currentUser.id) ||
        (t.ownerId && currentUser?.id && t.ownerId === currentUser.id) ||
        (t.owner?.name && currentUser?.name && t.owner.name.toLowerCase() === currentUser.name.toLowerCase()) ||
        (currentUser?.teamId && t.id === currentUser.teamId)
    ) || null;
  const isTeamOwner = Boolean(userTeam);

  const isHighestBidder = Boolean(
    auction?.currentHighestBidderId && userTeam && auction.currentHighestBidderId === userTeam.id
  );

  const activeLot = auction?.currentAuctionPlayer;
  const isPlayerOnBlock = Boolean(activeLot && activeLot.status === "IN_AUCTION");
  const isTimerActive = Boolean(
    auction?.timerEndsAt && new Date(auction.timerEndsAt).getTime() > Date.now()
  );

  // Audio countdown warning in the final 5 seconds
  const lastTickSecondRef = useRef<number>(-1);
  useEffect(() => {
    if (
      isTimerActive &&
      secondsRemaining <= 5 &&
      secondsRemaining > 0 &&
      secondsRemaining !== lastTickSecondRef.current
    ) {
      lastTickSecondRef.current = secondsRemaining;
      if (soundEnabled) {
        sounds.playWarning();
      }
    }
  }, [secondsRemaining, isTimerActive, soundEnabled]);

  const currentBidAmount = auction?.currentBid || room?.minBasePrice || 50;
  const nextCalculatedBid =
    !auction?.currentHighestBidderId
      ? currentBidAmount
      : currentBidAmount + selectedBidIncrement;

  // Auctioneer Master Controls
  const handleSelectRandomPlayer = async () => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSoldCelebration(null);

    try {
      const res = await fetch(`/api/auction/${code}/select-player`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to call next player");
      } else if (data.auctionPlayer) {
        // INSTANT 0ms LOCAL UPDATE - NO WAITING
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentAuctionPlayerId: data.auctionPlayer.id,
                currentAuctionPlayer: data.auctionPlayer,
                currentBid: data.currentBid || data.auctionPlayer.basePrice,
                currentHighestBidderId: null,
                currentHighestBidder: null,
                timerEndsAt: null,
              }
            : prev
        );
        setUpcomingPlayers((prev) => prev.filter((p) => p.id !== data.auctionPlayer.id));
        setCurrentLotBids([]);
        if (soundEnabled) sounds.playTick();
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
      } else if (data.timerEndsAt) {
        setAuction((prev) => (prev ? { ...prev, timerEndsAt: data.timerEndsAt } : prev));
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
        triggerSoldCelebration({
          playerName: activeLot?.player.name || "Player",
          photoUrl: activeLot?.player.photoUrl || null,
          position: activeLot?.player.position,
          winningTeamName: auction?.currentHighestBidder?.name || "Winning Team",
          winningTeamLogo: auction?.currentHighestBidder?.logoUrl || null,
          finalPrice: auction?.currentBid || 0,
        });
        if (data.soldPlayer) {
          setSoldPlayers((prev) => [data.soldPlayer, ...prev.filter((sp) => sp.id !== data.soldPlayer.id)]);
        }
        if (data.winningTeam) {
          setTeams((prev) =>
            prev.map((t) =>
              t.id === data.winningTeam.id
                ? { ...t, remainingPurse: data.winningTeam.remainingPurse }
                : t
            )
          );
        }
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentAuctionPlayerId: null,
                currentAuctionPlayer: null,
                currentBid: 0,
                currentHighestBidderId: null,
                currentHighestBidder: null,
                timerEndsAt: null,
              }
            : prev
        );
        setCurrentLotBids([]);
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
        if (data.unsoldPlayer) {
          setUnsoldPlayers((prev) => [data.unsoldPlayer, ...prev.filter((u) => u.id !== data.unsoldPlayer.id)]);
        }
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentAuctionPlayerId: null,
                currentAuctionPlayer: null,
                currentBid: 0,
                currentHighestBidderId: null,
                currentHighestBidder: null,
                timerEndsAt: null,
              }
            : prev
        );
        setCurrentLotBids([]);
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
      const res = await fetch(`/api/auction/${code}/reset-timer`, { method: "POST" });
      const data = await res.json();
      if (data.timerEndsAt) {
        setAuction((prev) => (prev ? { ...prev, timerEndsAt: data.timerEndsAt } : prev));
      }
    } catch {}
  };

  const handleCloseArena = async (mode: "close_completed" | "close_waiting") => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setActionLoadingText(
      mode === "close_completed"
        ? "Closing Arena & Finalizing Results..."
        : "Closing Arena & Returning to Waiting Room..."
    );
    setErrorMsg(null);
    try {
      if (mode === "close_completed") {
        const res = await fetch(`/api/auction/${code}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "close_completed" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to close arena");
        router.push(data.redirectUrl || `/room/${code}/results`);
      } else {
        const res = await fetch(`/api/rooms/${code}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "WAITING" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to close arena");
        router.push(`/room/${code}/waiting`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to close live arena";
      setErrorMsg(message);
    } finally {
      setActionLoading(false);
      setActionLoadingText(null);
      setShowCloseModal(false);
    }
  };

  const handleResetAuction = async (mode: "reset_live" | "reset_waiting") => {
    if (!isAuctioneer) return;
    setActionLoading(true);
    setActionLoadingText("Resetting auction lots, team purses, and bids...");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/auction/${code}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset auction");

      if (mode === "reset_waiting") {
        router.push(`/room/${code}/waiting`);
      } else {
        setSoldCelebration(null);
        setCurrentLotBids([]);
        await fetchAuctionState();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset auction";
      setErrorMsg(message);
    } finally {
      setActionLoading(false);
      setActionLoadingText(null);
      setShowResetModal(false);
    }
  };

  // Team Owner Bidding with OPTIMISTIC 0MS INSTANT UI UPDATE & SINGLE-PRESS LOCK
  const handlePlaceBid = async (customAmount?: number) => {
    const now = Date.now();
    // 1. Single-press guard: ignore if in-flight or pressed within 500ms
    if (isSubmittingBidRef.current || now - lastBidTimestampRef.current < 500) {
      return;
    }
    if (!isTeamOwner || isAuctioneer || !userTeam) return;
    if (!isPlayerOnBlock || !isTimerActive || isHighestBidder) return;

    const amountToBid = customAmount || nextCalculatedBid;
    if (amountToBid > (userTeam.remainingPurse || 0)) return;

    isSubmittingBidRef.current = true;
    lastBidTimestampRef.current = now;
    setErrorMsg(null);

    // 2. Play audio instantly (0ms delay)
    if (soundEnabled) sounds.playBid();

    // 3. Snapshot previous state for rollback if server truly fails
    const prevAuction = auction ? { ...auction } : null;
    const prevBids = [...currentLotBids];
    const prevTeams = [...teams];

    // 4. OPTIMISTIC INSTANT UPDATE (0ms perceived delay)
    const newTimerEndsAt = new Date(Date.now() + (room?.timerDuration || 30) * 1000).toISOString();
    setAuction((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentBid: amountToBid,
        currentHighestBidderId: userTeam.id,
        currentHighestBidder: {
          id: userTeam.id,
          name: userTeam.name,
          code: userTeam.code,
          logoUrl: userTeam.logoUrl,
          color: userTeam.color,
          remainingPurse: userTeam.remainingPurse,
        } as unknown as TeamDetails,
        timerEndsAt: newTimerEndsAt,
      };
    });

    const optimisticBid = {
      id: "opt-" + Date.now(),
      amount: amountToBid,
      timestamp: new Date().toISOString(),
      teamId: userTeam.id,
      team: {
        id: userTeam.id,
        name: userTeam.name,
        code: userTeam.code,
        logoUrl: userTeam.logoUrl,
        color: userTeam.color,
      },
      bidder: {
        id: currentUser?.id || "temp",
        name: currentUser?.name || "You",
      },
    } as unknown as BidDetails;
    setCurrentLotBids((prev) => [optimisticBid, ...prev.filter((b) => !b.id.startsWith("opt-"))]);

    try {
      const res = await fetch(`/api/auction/${code}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToBid }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If server says we already hold the highest bid, keep our status!
        if (data.error && data.error.includes("already holding the highest bid")) {
          return;
        }
        // Rollback optimistic state on actual server error
        setErrorMsg(data.error || "Failed to place bid");
        setAuction(prevAuction);
        setCurrentLotBids(prevBids);
        setTeams(prevTeams);
      } else {
        // Confirm server data
        if (data.currentBid && data.highestBidder) {
          setAuction((prev) =>
            prev
              ? {
                  ...prev,
                  currentBid: data.currentBid,
                  currentHighestBidderId: data.highestBidder.id,
                  currentHighestBidder: data.highestBidder,
                  timerEndsAt: data.timerEndsAt,
                }
              : prev
          );
        }
      }
    } catch {
      setErrorMsg("Network error placing bid");
      setAuction(prevAuction);
      setCurrentLotBids(prevBids);
      setTeams(prevTeams);
    } finally {
      // Cooldown to prevent multi-press jitter
      setTimeout(() => {
        isSubmittingBidRef.current = false;
      }, 400);
    }
  };

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

  // Surrounding 4 teams
  const team1 = teams[0] || null;
  const team2 = teams[1] || null;
  const team3 = teams[2] || null;
  const team4 = teams[3] || null;

  const renderTeamCard = (
    team: TeamWithSquad | null,
    themeIndex: number,
    positionLabel: string,
    isMobileCompact = false
  ) => {
    const theme = TEAM_THEMES[themeIndex % TEAM_THEMES.length];
    const isCurrentHighest = Boolean(team && auction?.currentHighestBidderId === team.id);

    const teamLatestBid = team
      ? currentLotBids.find((b) => b.teamId === team.id)
      : null;

    if (!team) {
      return (
        <div
          className={`rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/30 flex flex-col items-center justify-center text-center ${
            isMobileCompact ? "p-2.5 min-h-[90px]" : "p-4 min-h-[145px]"
          }`}
        >
          <Shield className="h-5 w-5 text-slate-700 mb-1" />
          <p className="text-[10px] sm:text-xs font-bold text-slate-500">
            Franchise Slot {positionLabel}
          </p>
          <span className="text-[9px] text-slate-600">Awaiting team</span>
        </div>
      );
    }

    const wonCount = (team.squad?.length || 0) + (team.mainPlayerName ? 1 : 0);

    return (
      <div
        className={`rounded-2xl transition-all duration-300 relative bg-[#090e1c]/90 backdrop-blur-md ${
          isMobileCompact ? "p-2.5 sm:p-3" : "p-4"
        } ${
          isCurrentHighest
            ? "glow-amber-team border-2 border-amber-400 scale-[1.01]"
            : `${theme.glowClass} bg-[#090e1c]/90`
        }`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`rounded-xl flex items-center justify-center font-black shrink-0 relative overflow-hidden shadow-lg border border-slate-700/60 ${
                isMobileCompact ? "h-9 w-9 text-sm" : "h-12 w-12 text-lg"
              }`}
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
              <h4 className="text-xs sm:text-sm font-black text-white truncate tracking-wide">
                {team.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                <span className="text-slate-200">{team.owner?.name || "Owner"}</span>
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400">Online</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 gap-1">
            <div className="rounded-lg px-2 py-0.5 text-right bg-[#16122d] border border-purple-500/30">
              <span className="text-[11px] sm:text-xs font-black font-mono text-purple-300 block">
                ₹{team.remainingPurse?.toLocaleString("en-IN")}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400/80">
                Purse
              </span>
            </div>

            {/* Clickable Won Players count */}
            <button
              type="button"
              onClick={() => setSelectedTeamSquad(team)}
              className="text-[9px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/25 transition-colors"
              title="Click to view players won by this team"
            >
              <Trophy className="h-2 w-2" />
              <span>{wonCount} Won</span>
            </button>
          </div>
        </div>

        <div className="mt-2">
          {isCurrentHighest ? (
            <div className="rounded-lg bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-amber-500/25 p-1.5 text-center border border-amber-500/60 shadow-sm flex items-center justify-center gap-1.5 animate-pulse">
              <Flame className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-tight">
                TOP BID (₹{auction?.currentBid?.toLocaleString("en-IN")})
              </span>
            </div>
          ) : teamLatestBid ? (
            <div className="rounded-lg bg-slate-950/80 p-1.5 text-center border border-slate-800 flex items-center justify-between px-2 text-[10px]">
              <span className="text-slate-400 text-[9px]">Last Bid:</span>
              <span className="font-mono font-black text-cyan-400">
                ₹{teamLatestBid.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-950/50 p-1 text-center border border-slate-900/60 text-[9px] font-medium text-slate-500">
              No Bid Yet
            </div>
          )}
        </div>
      </div>
    );
  };

  const positionBadge = getPositionBadge(activeLot?.player.position || "ATTACKER");

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col relative pb-16 lg:pb-6 overflow-x-hidden">
      {/* 1. CINEMATIC NPL ARENA CROWD STADIUM LIVE BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/npl-arena-crowd-bg.jpg"
          alt="NPL Live Arena Crowd Stadium"
          fill
          priority
          className="object-cover object-center opacity-50 brightness-95 contrast-110 scale-100"
        />
        {/* Balanced Dark Vignette & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/80 via-[#070b18]/60 to-[#060913]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(4,7,16,0.85)_100%)]" />

        {/* Ambient stadium floodlights */}
        <div className="absolute -top-24 left-1/3 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-orange-600/15 blur-[120px] pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          roomCode={code}
          roomTitle={room?.title}
          roomStatus={room ? "LIVE" : "WAITING"}
          activeTab="live"
          initialUser={currentUser}
        />

      {/* SOLD CELEBRATION MODAL */}
      {soldCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-[#141204] via-[#090e1c] to-[#060913] p-6 text-center shadow-2xl shadow-amber-500/30 overflow-hidden">
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 px-4 py-1 text-xs font-black text-amber-300 uppercase tracking-widest mb-3">
              <PartyPopper className="h-4 w-4 text-amber-400 animate-bounce" />
              <span>PLAYER SOLD! CONGRATULATIONS!</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SOLD TO{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                {soldCelebration.winningTeamName}
              </span>
            </h2>

            <div className="my-5 flex items-center justify-center gap-5">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-slate-900 shrink-0">
                {soldCelebration.photoUrl ? (
                  <Image
                    src={soldCelebration.photoUrl}
                    alt={soldCelebration.playerName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-amber-400 font-black text-2xl">
                    {soldCelebration.playerName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="text-left space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  {soldCelebration.position || "ALL_ROUNDER"}
                </span>
                <h3 className="text-xl font-black text-white">{soldCelebration.playerName}</h3>
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block font-bold">Winning Bid Amount</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    ₹{soldCelebration.finalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium">Next player round starting in:</span>
              <span className="font-mono font-black text-amber-400 text-sm">
                00:0{celebrationSeconds}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSoldCelebration(null)}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all"
            >
              Continue Auction
            </button>
          </div>
        </div>
      )}

      {/* TEAM WON SQUAD MODAL */}
      {selectedTeamSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#090e1c] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black border border-slate-700 overflow-hidden relative"
                  style={{
                    backgroundColor: selectedTeamSquad.color ? `${selectedTeamSquad.color}30` : "#1e293b",
                    color: selectedTeamSquad.color || "#fff",
                  }}
                >
                  {selectedTeamSquad.logoUrl ? (
                    <Image
                      src={selectedTeamSquad.logoUrl}
                      alt={selectedTeamSquad.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span>{selectedTeamSquad.name.charAt(0)}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>{selectedTeamSquad.name}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Won Players
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Owner: <strong className="text-slate-200">{selectedTeamSquad.owner?.name || "Owner"}</strong> • Purse: <span className="font-mono font-bold text-emerald-400">₹{selectedTeamSquad.remainingPurse?.toLocaleString("en-IN")}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeamSquad(null)}
                className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* List of Won Players */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {/* Main Fixed Player if present */}
              {selectedTeamSquad.mainPlayerName && (
                <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-slate-900 border border-amber-400/60 shrink-0">
                      {selectedTeamSquad.mainPlayerPhotoUrl ? (
                        <Image
                          src={selectedTeamSquad.mainPlayerPhotoUrl}
                          alt={selectedTeamSquad.mainPlayerName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-amber-400 font-bold text-sm">
                          {selectedTeamSquad.mainPlayerName.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{selectedTeamSquad.mainPlayerName}</span>
                        <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40">
                          <Star className="h-2.5 w-2.5 fill-amber-400" />
                          MARQUEE RETENTION
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-400/90 font-medium">
                        {selectedTeamSquad.mainPlayerPosition || "ALL_ROUNDER"}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-400">Direct Pick</span>
                </div>
              )}

              {/* Won Auction Players */}
              {selectedTeamSquad.squad && selectedTeamSquad.squad.length > 0 ? (
                selectedTeamSquad.squad.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="rounded-xl border border-slate-800 bg-[#060913]/90 p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                        {item.player.photoUrl ? (
                          <Image
                            src={item.player.photoUrl}
                            alt={item.player.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-sm">
                            {item.player.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{item.player.name}</span>
                          {item.lotNumber && (
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              Lot #{item.lotNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-amber-400">
                          {item.player.position}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Winning Bid</span>
                      <span className="font-mono font-black text-sm text-emerald-400">
                        ₹{(item.finalPrice || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                !selectedTeamSquad.mainPlayerName && (
                  <div className="py-8 text-center space-y-2">
                    <Trophy className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">No Players Won Yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Place bids on active lots during live rounds to acquire athletes for your team.
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Squad Size: <strong className="text-white">{(selectedTeamSquad.squad?.length || 0) + (selectedTeamSquad.mainPlayerName ? 1 : 0)} Athletes</strong>
              </span>

              <button
                type="button"
                onClick={() => setSelectedTeamSquad(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE LIVE ARENA MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-rose-500/60 bg-gradient-to-b from-[#180a0e] via-[#0d1222] to-[#060913] p-6 text-slate-100 shadow-2xl shadow-rose-950/50">
            <button
              onClick={() => !actionLoading && setShowCloseModal(false)}
              disabled={actionLoading}
              className="absolute top-4 right-4 rounded-full bg-slate-900/80 p-1.5 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Power className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Close Live Arena</h3>
                <p className="text-xs text-slate-400">Choose how to close this auction session</p>
              </div>
            </div>

            <div className="space-y-3 my-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleCloseArena("close_completed")}
                className="w-full text-left rounded-2xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 p-4 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-emerald-300 group-hover:text-emerald-200 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Conclude Auction & View Results
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Finalize
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Marks the auction as completed, locks final rosters, and redirects everyone to the official results page.
                </p>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleCloseArena("close_waiting")}
                className="w-full text-left rounded-2xl border border-amber-500/40 bg-amber-950/20 hover:bg-amber-950/40 p-4 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-amber-300 group-hover:text-amber-200 flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    Pause & Return to Waiting Room
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Standby
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Suspends the live arena and returns all teams and viewers back to the Waiting Room without deleting squads.
                </p>
              </button>
            </div>

            {actionLoadingText && (
              <div className="flex items-center justify-center gap-2 text-xs text-rose-300 font-bold mb-3 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                <span>{actionLoadingText}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET AUCTION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-[#1c1305] via-[#0d1222] to-[#060913] p-6 text-slate-100 shadow-2xl shadow-amber-950/50">
            <button
              onClick={() => !actionLoading && setShowResetModal(false)}
              disabled={actionLoading}
              className="absolute top-4 right-4 rounded-full bg-slate-900/80 p-1.5 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Reset Entire Auction Once Again</h3>
                <p className="text-xs text-amber-300 font-medium">Start fresh with restored purses & full queue</p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200/90 leading-relaxed mb-4">
              <p className="font-bold mb-1 flex items-center gap-1 text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                What happens during reset:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                <li>All team budgets are restored back to ₹{room?.startingPurse?.toLocaleString("en-IN") || "5,000"}.</li>
                <li>All sold & unsold players return to the upcoming pool.</li>
                <li>All previous bids and sold history are wiped clean.</li>
                <li>The auction can be started completely anew!</li>
              </ul>
            </div>

            <div className="space-y-3 mb-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleResetAuction("reset_live")}
                className="w-full text-left rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 p-4 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-white group-hover:text-amber-300 flex items-center gap-2">
                    <Play className="h-4 w-4 text-amber-400 fill-amber-400" />
                    Reset & Restart Live Arena Now
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Immediate
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Resets everything and stays in this Live Arena so you can immediately call Lot #1 and begin bidding again.
                </p>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleResetAuction("reset_waiting")}
                className="w-full text-left rounded-2xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-900 p-4 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-white flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-slate-400" />
                    Reset & Return to Waiting Room
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    Waiting Room
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Resets everything and returns everyone to the Waiting Room so players/teams can be reviewed before relaunching.
                </p>
              </button>
            </div>

            {actionLoadingText && (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-bold mb-3 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <span>{actionLoadingText}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1700px] mx-auto w-full px-2 sm:px-4 lg:px-8 py-2 sm:py-4 space-y-3 sm:space-y-4">
        {/* Error notification */}
        {errorMsg && (
          <div className="rounded-xl bg-rose-500/15 p-2.5 sm:p-3 text-xs font-bold text-rose-300 border border-rose-500/30 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* SUBHEADER HERO BANNER: Stadium Atmosphere Banner */}
        <div className="relative rounded-2xl border border-amber-500/40 bg-[#090e1e]/50 p-3.5 sm:p-5 shadow-2xl overflow-hidden backdrop-blur-xl group">
          {/* Panoramic Stadium Banner Background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <Image
              src="/images/npl-container-banner.jpg"
              alt="Stadium Hero Banner"
              fill
              priority
              className="object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070c1a]/85 via-[#070c1a]/55 to-[#070c1a]/85" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(7,12,26,0.75)_100%)]" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center justify-between w-full md:w-auto gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute Arena Audio" : "Enable Arena Audio"}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white border border-slate-700/80 hover:border-amber-500/50 transition-all shadow-sm"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[11px]">Audio ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px]">Muted</span>
                  </>
                )}
              </button>

              {/* Team Owner Won Squad Quick Access Button */}
              {isTeamOwner && userTeam && (
                <button
                  type="button"
                  onClick={() => setSelectedTeamSquad(userTeam)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-900/80 to-purple-800/80 text-purple-200 border border-purple-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-black transition-all shadow-md hover:scale-105"
                >
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span className="text-[11px]">My Won Players ({(userTeam.squad?.length || 0) + (userTeam.mainPlayerName ? 1 : 0)})</span>
                </button>
              )}

              {/* Auctioneer Quick Actions: Reset & Close */}
              {isAuctioneer && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                    title="Reset Auction (Restore purses, restart lot order)"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold hidden sm:inline">Reset Auction</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCloseModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                    title="Close Live Arena"
                  >
                    <Power className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-[11px] font-bold hidden sm:inline">Close Arena</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
                <Trophy className="h-3 w-3 text-amber-400" />
                <span>NARAYANA GURU PREMIERE LEAGUE</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white drop-shadow">
                LIVE <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">AUCTION ARENA</span>
              </h1>
            </div>

            {/* 3 Stat Badges: Base Price, Bid Increment, Team Purse */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full md:w-auto">
              <div className="rounded-xl bg-[#0b1021]/90 border border-amber-500/30 px-2 sm:px-3.5 py-1 sm:py-1.5 text-center shadow-md">
                <span className="text-xs sm:text-sm font-black font-mono text-white block">
                  ₹{room?.minBasePrice || 50}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                  Base Price
                </span>
              </div>

              <div className="rounded-xl bg-[#0b1021]/90 border border-cyan-500/30 px-2 sm:px-3.5 py-1 sm:py-1.5 text-center shadow-md">
                <span className="text-xs sm:text-sm font-black font-mono text-cyan-400 block">
                  ₹{room?.defaultBidIncrement || 50}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                  Increment
                </span>
              </div>

              <div className="rounded-xl bg-[#0b1021]/90 border border-emerald-500/30 px-2 sm:px-3.5 py-1 sm:py-1.5 text-center shadow-md">
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 block">
                  ₹{room?.startingPurse?.toLocaleString("en-IN") || "5,000"}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                  Team Purse
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN STAGE:
            - Desktop: Left 2 Teams | Center Player Spotlight + Plinth + Controls | Right 2 Teams
            - Mobile: Center Player Spotlight + Plinth + Controls (TOP) | 2x2 Grid of 4 Teams (BELOW)
        */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Desktop Left Column: Teams 1 & 2 */}
          <div className="hidden lg:block lg:col-span-3 space-y-4 w-full">
            {renderTeamCard(team1, 0, "1")}
            {renderTeamCard(team2, 1, "2")}
          </div>

          {/* CENTER STAGE: Central Player Spotlight + 3D Plinth + Timer + Bid Buttons */}
          <div className="w-full lg:col-span-6 space-y-2.5 sm:space-y-3">
            {/* Central Player Spotlight Card */}
            <div className="rounded-2xl border border-slate-800/90 bg-[#090e1d]/90 p-3.5 sm:p-5 shadow-2xl relative overflow-hidden court-net-pattern backdrop-blur-md">
              <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

              {activeLot ? (
                <div className="flex flex-row items-center gap-3.5 sm:gap-6 relative z-10">
                  {/* Player Photo */}
                  <div className="relative h-28 w-28 sm:h-44 sm:w-44 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-500/70 shadow-xl shadow-amber-500/20 bg-slate-900">
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
                        <User className="h-12 w-12 sm:h-20 sm:w-20 opacity-80" />
                      </div>
                    )}

                    <div className="absolute top-1.5 left-1.5 rounded-lg bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/40">
                      LOT #{activeLot.lotNumber || 1}
                    </div>
                  </div>

                  {/* Player Metadata */}
                  <div className="flex-1 space-y-1.5 sm:space-y-3 text-left min-w-0">
                    <div>
                      <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-wide truncate">
                        {activeLot.player.name}
                      </h2>

                      <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 mt-0.5">
                        <Gavel className="h-3 w-3 text-amber-400" />
                        <span>{positionBadge.label}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs pt-0.5 max-w-sm">
                      <div className="flex items-center gap-1 text-slate-400 truncate">
                        <User className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="hidden sm:inline">Role:</span>
                        <strong className="text-slate-200 truncate">{positionBadge.badge}</strong>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 truncate">
                        <Trophy className="h-3 w-3 text-slate-500 shrink-0" />
                        <strong className="text-amber-400 uppercase font-mono text-[10px]">
                          {activeLot.status}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 truncate">
                        <Radio className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>Base:</span>
                        <strong className="text-slate-200 font-mono">₹{activeLot.basePrice || 50}</strong>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 truncate">
                        <Sparkles className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>Incr:</span>
                        <strong className="text-cyan-400 font-mono">₹{room?.defaultBidIncrement || 50}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 sm:py-12 text-center space-y-2 sm:space-y-3 relative z-10">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Gavel className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isAuctioneer ? "Select Next Player for Auction" : "Waiting for Auctioneer"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isAuctioneer
                      ? `${upcomingPlayers.length} players waiting in the queue. Click "Call Next Player" below to place an athlete on the block.`
                      : `The Auctioneer is selecting the next athlete. All ${teams.length} franchises get ready!`}
                  </p>
                </div>
              )}
            </div>

            {/* Current Bid 3D Trapezoid Plinth (Responsive & Non-overflowing) */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 w-full">
              <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-2 sm:px-4 py-1.5 sm:py-2 text-center shrink-0 min-w-[70px] sm:min-w-[90px] shadow-md">
                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Base Price
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-white block mt-0.5">
                  ₹{activeLot?.basePrice || room?.minBasePrice || 50}
                </span>
              </div>

              <div className="flex-1 max-w-xs rounded-2xl bid-plinth-trapezoid py-1.5 sm:py-2 px-3 sm:px-6 text-center text-slate-950 shadow-2xl">
                <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-900 block">
                  CURRENT BID
                </span>
                <div className="flex items-center justify-center gap-1.5 text-xl sm:text-3xl font-black text-white drop-shadow">
                  <Gavel className="h-4 w-4 sm:h-6 sm:w-6 text-amber-200" />
                  <span>₹{currentBidAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0b1021] border border-slate-800 px-2 sm:px-4 py-1.5 sm:py-2 text-center shrink-0 min-w-[70px] sm:min-w-[90px] shadow-md">
                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Increment
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-cyan-400 block mt-0.5">
                  ₹{room?.defaultBidIncrement || 50}
                </span>
              </div>
            </div>

            {/* Countdown Timer Row */}
            <div className="rounded-xl bg-[#090e1c] border border-slate-800/80 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 text-rose-500 font-mono font-black text-xs sm:text-sm">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 animate-pulse" />
                  <span>
                    00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Time Left</span>
              </div>

              <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-200"
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

            {/* Controls Bar: STRICT ROLE ENFORCEMENT */}
            <div className="space-y-2 pt-0.5">
              {/* 1. Team Owner: Quick increments + Place Bid */}
              {isTeamOwner && !isAuctioneer && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5">
                    {[50, 100, 250, 500].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setSelectedBidIncrement(inc)}
                        className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono font-black transition-all border text-center ${
                          selectedBidIncrement === inc
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/60 shadow-sm"
                            : "bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        +₹{inc}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePlaceBid();
                    }}
                    disabled={
                      !isPlayerOnBlock ||
                      !isTimerActive ||
                      isHighestBidder ||
                      nextCalculatedBid > (userTeam?.remainingPurse || 0)
                    }
                    className={`flex-1 min-h-[46px] flex items-center justify-center gap-2 rounded-xl py-2.5 sm:py-3 px-4 text-xs font-black shadow-lg transition-all active:scale-[0.98] ${
                      isHighestBidder
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-emerald-500/30 cursor-default"
                        : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    {!isPlayerOnBlock ? (
                      <span>AWAITING NEXT LOT...</span>
                    ) : isHighestBidder ? (
                      <span className="flex items-center gap-1.5 font-black text-slate-950">
                        <CheckCircle className="h-4 w-4 stroke-[2.5]" />
                        <span>YOU HOLD TOP BID (₹{currentBidAmount.toLocaleString("en-IN")})</span>
                      </span>
                    ) : !isTimerActive ? (
                      <span>TIMER PAUSED</span>
                    ) : (
                      <>
                        <Gavel className="h-4 w-4" />
                        <span>Place Bid (₹{nextCalculatedBid.toLocaleString("en-IN")})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 2. Auctioneer Master Controls */}
              {isAuctioneer && (
                <div className="w-full space-y-2">
                  <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                    {!isPlayerOnBlock ? (
                      <button
                        type="button"
                        onClick={handleSelectRandomPlayer}
                        disabled={actionLoading || upcomingPlayers.length === 0}
                        className="flex-1 min-h-[46px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 px-4 text-xs font-black text-slate-950 hover:brightness-110 disabled:opacity-40 shadow-xl shadow-amber-500/25 transition-all"
                      >
                        <Shuffle className="h-4 w-4 text-slate-950" />
                        <span>Call Next Player ({upcomingPlayers.length} in queue)</span>
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                        {!isTimerActive && (
                          <button
                            type="button"
                            onClick={handleStartBidding}
                            disabled={actionLoading}
                            className="flex-1 min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2.5 px-3 text-xs font-black text-slate-950 shadow-md transition-colors"
                          >
                            <Play className="h-3.5 w-3.5 fill-slate-950" />
                            <span>Start Timer</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleSold}
                          disabled={actionLoading || !auction?.currentHighestBidderId}
                          className="flex-1 min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 px-3 text-xs font-black text-slate-950 disabled:opacity-40 shadow-md shadow-emerald-500/20 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>CONFIRM SOLD</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleUnsold}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 px-3 text-xs font-black text-white disabled:opacity-40 shadow-md transition-colors"
                        >
                          <FastForward className="h-3.5 w-3.5" />
                          <span>Unsold</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetTimer}
                          title="Reset Timer (+30s)"
                          className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Secondary Room Controls for Auctioneer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 w-full">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Arena Host Controls
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset Auction Once Again</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCloseModal(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>Close Live Arena</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Right Column: Teams 3 & 4 */}
          <div className="hidden lg:block lg:col-span-3 space-y-4 w-full">
            {renderTeamCard(team3, 2, "3")}
            {renderTeamCard(team4, 3, "4")}
          </div>

          {/* MOBILE ONLY: 2x2 Grid of the 4 Franchise Panels beneath the stage */}
          <div className="lg:hidden w-full pt-1">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Franchises in Arena
              </span>
              <span className="text-[10px] font-bold text-amber-400">
                Tap card to view won squad
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {renderTeamCard(team1, 0, "1", true)}
              {renderTeamCard(team2, 1, "2", true)}
              {renderTeamCard(team3, 2, "3", true)}
              {renderTeamCard(team4, 3, "4", true)}
            </div>
          </div>
        </div>

        {/* BOTTOM PANELS:
            - Desktop: 3 side-by-side columns (Status, Queue Carousel, Live Activity)
            - Mobile: Sleek 3-button tab bar switching between the 3 views
        */}
        <div className="pt-2">
          {/* Mobile Bottom Tab Selector (< lg) */}
          <div className="lg:hidden flex items-center gap-1.5 p-1 rounded-2xl bg-[#090e1d] border border-slate-800 mb-2">
            <button
              type="button"
              onClick={() => setMobileBottomTab("queue")}
              className={`flex-1 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                mobileBottomTab === "queue"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5 text-amber-400" />
              <span>Queue ({upcomingPlayers.length + (activeLot ? 1 : 0)})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileBottomTab("activity")}
              className={`flex-1 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                mobileBottomTab === "activity"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-rose-400" />
              <span>Live Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileBottomTab("status")}
              className={`flex-1 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                mobileBottomTab === "status"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Stats</span>
            </button>
          </div>

          {/* Panels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* 1. Auction Status (Left on desktop, Tab on mobile) */}
            <div
              className={`lg:col-span-3 rounded-2xl bg-[#090e1d]/90 border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between ${
                mobileBottomTab !== "status" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 mb-2.5">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Auction Status
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
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

              <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 text-center font-bold">
                Total Pool: {totalPoolPlayers} Athletes
              </div>
            </div>

            {/* 2. Player Queue Carousel (Center on desktop, Tab on mobile) */}
            <div
              className={`lg:col-span-6 rounded-2xl bg-[#090e1d]/90 border border-slate-800/90 p-4 shadow-xl relative ${
                mobileBottomTab !== "queue" ? "hidden lg:block" : "block"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Player Queue ({upcomingPlayers.length + (activeLot ? 1 : 0)})
                  </h3>
                </div>

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

              <div
                ref={queueScrollRef}
                className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
              >
                {activeLot && (
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-500/10 p-2 min-w-[90px] sm:min-w-[95px] max-w-[95px] text-center shadow-lg shrink-0 relative">
                    <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden mx-auto bg-slate-900 border border-amber-400/80 shadow">
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

                    <p className="mt-1 text-[10px] sm:text-[11px] font-black text-white truncate">
                      {activeLot.player.name}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-amber-400 font-bold truncate">
                      {activeLot.player.position}
                    </p>

                    <span className="mt-0.5 inline-block rounded bg-amber-500 px-1 py-0.2 text-[7px] sm:text-[8px] font-black text-slate-950 uppercase">
                      LIVE
                    </span>
                  </div>
                )}

                {upcomingPlayers.map((ap) => (
                  <div
                    key={ap.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 min-w-[90px] sm:min-w-[95px] max-w-[95px] text-center shrink-0 hover:border-slate-700 transition-colors"
                  >
                    <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden mx-auto bg-slate-950 border border-slate-800">
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

                    <p className="mt-1 text-[10px] sm:text-[11px] font-bold text-slate-200 truncate">
                      {ap.player.name}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 truncate">{ap.player.position}</p>
                    <span className="mt-0.5 inline-block text-[8px] sm:text-[9px] font-mono text-cyan-400 font-bold">
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

            {/* 3. Live Activity (Right on desktop, Tab on mobile) */}
            <div
              className={`lg:col-span-3 rounded-2xl bg-[#090e1d]/90 border border-slate-800/90 p-4 shadow-xl flex flex-col justify-between ${
                mobileBottomTab !== "activity" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Live Activity
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[8px] sm:text-[9px] font-black text-rose-400 border border-rose-500/30">
                    <span className="h-1 w-1 rounded-full bg-rose-400 animate-ping" />
                    LIVE
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {currentLotBids.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-[10px] sm:text-[11px] rounded-lg bg-slate-950/60 p-2 border border-slate-900"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <Gavel className="h-3 w-3 text-amber-400 shrink-0" />
                        <span className="text-slate-300 truncate">
                          <strong className="text-white">{b.team.name}</strong> bid
                        </span>
                      </div>
                      <span className="font-mono font-black text-emerald-400 shrink-0">
                        ₹{b.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}

                  {recentEvents.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between text-[10px] sm:text-[11px] rounded-lg bg-slate-950/40 p-1.5 border border-slate-900/60"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <Activity className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="text-slate-400 truncate">{evt.message}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                        {new Date(evt.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}

                  {currentLotBids.length === 0 && recentEvents.length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-500">
                      Awaiting live bids and events...
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
        </div>

        {/* STICKY MOBILE BID BAR FOR TEAM OWNERS */}
        {isTeamOwner && !isAuctioneer && isPlayerOnBlock && isTimerActive && !isHighestBidder && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/95 border-t border-slate-800 p-2.5 backdrop-blur-md flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[50, 100].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setSelectedBidIncrement(inc)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border ${
                    selectedBidIncrement === inc
                      ? "bg-amber-500/20 text-amber-400 border-amber-500"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  +₹{inc}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handlePlaceBid();
              }}
              disabled={
                !isPlayerOnBlock ||
                !isTimerActive ||
                isHighestBidder ||
                nextCalculatedBid > (userTeam?.remainingPurse || 0)
              }
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition-all ${
                isHighestBidder
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30 cursor-default"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 disabled:opacity-40"
              }`}
            >
              {isHighestBidder ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>YOU HOLD TOP BID</span>
                </>
              ) : (
                <>
                  <Gavel className="h-3.5 w-3.5" />
                  <span>BID ₹{nextCalculatedBid.toLocaleString("en-IN")}</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
