// Ultra-fast in-memory auction store for sub-millisecond sync and real-time state caching

export interface SoldCelebrationPayload {
  playerId: string;
  playerName: string;
  photoUrl: string | null;
  position?: string;
  winningTeamId: string;
  winningTeamName: string;
  winningTeamLogo?: string | null;
  finalPrice: number;
  timestamp: number;
}

export interface ActiveAuctionMemoryState {
  roomCode: string;
  status: string;
  currentAuctionPlayerId: string | null;
  currentAuctionPlayer: {
    id: string;
    status: string;
    lotNumber?: number | null;
    basePrice?: number;
    player: {
      id: string;
      name: string;
      photoUrl: string | null;
      position: string;
    };
  } | null;
  currentBid: number;
  currentHighestBidderId: string | null;
  currentHighestBidder: {
    id: string;
    name: string;
    code: string | null;
    logoUrl: string | null;
    color: string | null;
    remainingPurse: number;
  } | null;
  timerEndsAt: string | null;
  timerSeconds: number;
  latestBids: Array<{
    id: string;
    amount: number;
    timestamp: string;
    teamId: string;
    team: {
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
      color: string | null;
    };
    bidder: {
      id: string;
      name: string;
    };
  }>;
  lastSoldCelebration: SoldCelebrationPayload | null;
  lastUpdated: number;
}

// Persist map on globalThis to survive development hot-reloads
const globalStore = globalThis as unknown as {
  auctionMemoryStore?: Map<string, ActiveAuctionMemoryState>;
};

if (!globalStore.auctionMemoryStore) {
  globalStore.auctionMemoryStore = new Map<string, ActiveAuctionMemoryState>();
}

const memoryStore = globalStore.auctionMemoryStore;

export function getAuctionMemoryState(roomCode: string): ActiveAuctionMemoryState | null {
  const key = roomCode.toUpperCase().trim();
  const state = memoryStore.get(key);
  if (!state) return null;
  return state;
}

export function setAuctionMemoryState(
  roomCode: string,
  state: Partial<ActiveAuctionMemoryState>
): ActiveAuctionMemoryState {
  const key = roomCode.toUpperCase().trim();
  const existing: ActiveAuctionMemoryState = memoryStore.get(key) || {
    roomCode: key,
    status: "LIVE",
    currentAuctionPlayerId: null,
    currentAuctionPlayer: null,
    currentBid: 50,
    currentHighestBidderId: null,
    currentHighestBidder: null,
    timerEndsAt: null,
    timerSeconds: 30,
    latestBids: [],
    lastSoldCelebration: null,
    lastUpdated: Date.now(),
  };

  const updated: ActiveAuctionMemoryState = {
    ...existing,
    ...state,
    lastSoldCelebration:
      state.lastSoldCelebration !== undefined
        ? state.lastSoldCelebration
        : existing.lastSoldCelebration,
    lastUpdated: Date.now(),
  };

  memoryStore.set(key, updated);
  return updated;
}

export function recordBidInMemory(
  roomCode: string,
  bid: ActiveAuctionMemoryState["latestBids"][0],
  currentBid: number,
  highestBidder: ActiveAuctionMemoryState["currentHighestBidder"],
  timerEndsAt: string
) {
  const key = roomCode.toUpperCase().trim();
  const existing = memoryStore.get(key);

  const updatedBids = existing ? [bid, ...existing.latestBids.filter((b) => b.id !== bid.id)].slice(0, 10) : [bid];

  setAuctionMemoryState(key, {
    currentBid,
    currentHighestBidderId: highestBidder?.id || null,
    currentHighestBidder: highestBidder,
    timerEndsAt,
    latestBids: updatedBids,
  });
}

export function callPlayerInMemory(
  roomCode: string,
  auctionPlayer: ActiveAuctionMemoryState["currentAuctionPlayer"],
  currentBid: number
) {
  const key = roomCode.toUpperCase().trim();
  setAuctionMemoryState(key, {
    currentAuctionPlayerId: auctionPlayer?.id || null,
    currentAuctionPlayer: auctionPlayer,
    currentBid,
    currentHighestBidderId: null,
    currentHighestBidder: null,
    timerEndsAt: null,
    latestBids: [],
  });
}

export function resetPlayerLotInMemory(roomCode: string) {
  const key = roomCode.toUpperCase().trim();
  setAuctionMemoryState(key, {
    currentAuctionPlayerId: null,
    currentAuctionPlayer: null,
    currentBid: 0,
    currentHighestBidderId: null,
    currentHighestBidder: null,
    timerEndsAt: null,
    latestBids: [],
  });
}

export function soldPlayerInMemory(
  roomCode: string,
  celebration: SoldCelebrationPayload
) {
  const key = roomCode.toUpperCase().trim();
  setAuctionMemoryState(key, {
    currentAuctionPlayerId: null,
    currentAuctionPlayer: null,
    currentBid: 0,
    currentHighestBidderId: null,
    currentHighestBidder: null,
    timerEndsAt: null,
    latestBids: [],
    lastSoldCelebration: celebration,
  });
}

export function resetAuctionEntirelyInMemory(
  roomCode: string,
  targetStatus: string = "LIVE"
): ActiveAuctionMemoryState {
  const key = roomCode.toUpperCase().trim();
  const resetState: ActiveAuctionMemoryState = {
    roomCode: key,
    status: targetStatus,
    currentAuctionPlayerId: null,
    currentAuctionPlayer: null,
    currentBid: 50,
    currentHighestBidderId: null,
    currentHighestBidder: null,
    timerEndsAt: null,
    timerSeconds: 30,
    latestBids: [],
    lastSoldCelebration: null,
    lastUpdated: Date.now(),
  };
  memoryStore.set(key, resetState);
  return resetState;
}

export function clearAuctionMemoryState(roomCode: string) {
  const key = roomCode.toUpperCase().trim();
  memoryStore.delete(key);
}

