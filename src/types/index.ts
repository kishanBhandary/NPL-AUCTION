export type UserRole = "AUCTIONEER" | "TEAM_OWNER" | "VIEWER";
export type RoomStatus = "DRAFT" | "WAITING" | "LIVE" | "PAUSED" | "COMPLETED";
export type RoomRole = "AUCTIONEER" | "TEAM_OWNER" | "VIEWER";
export type PlayerPosition = "ATTACKER" | "SETTER" | "LIBERO" | "DEFENDER" | "ALL_ROUNDER";
export type AuctionState = "SCHEDULED" | "ACTIVE" | "PAUSED" | "CONCLUDED";
export type AuctionPlayerStatus = "UPCOMING" | "IN_AUCTION" | "SOLD" | "UNSOLD";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  teamId?: string | null;
  roomId?: string | null;
}

export interface RoomDetails {
  id: string;
  title: string;
  roomCode: string;
  description: string | null;
  status: RoomStatus;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  startingPurse: number;
  minBasePrice: number;
  defaultBidIncrement: number;
  timerDuration: number;
  minSquadSize: number;
  maxSquadSize: number;
  teams: TeamDetails[];
  players: PlayerDetails[];
  auctions: AuctionSnapshot[];
  _count?: {
    teams: number;
    players: number;
  };
}

export interface TeamDetails {
  id: string;
  roomId: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  name: string;
  code: string | null;
  logoUrl: string | null;
  color: string | null;
  totalPurse: number;
  remainingPurse: number;
  isReady: boolean;
  mainPlayerName?: string | null;
  mainPlayerPosition?: string | null;
  squad?: AuctionPlayerDetails[];
  _count?: {
    squad: number;
    bids: number;
  };
}

export interface PlayerDetails {
  id: string;
  roomId: string;
  name: string;
  photoUrl: string | null;
  position: PlayerPosition;
}

export interface AuctionPlayerDetails {
  id: string;
  auctionId: string;
  playerId: string;
  player: PlayerDetails;
  status: AuctionPlayerStatus;
  basePrice: number;
  finalPrice: number | null;
  lotNumber: number | null;
  soldAt: string | null;
  winningTeamId: string | null;
  winningTeam?: TeamDetails | null;
  bids?: BidDetails[];
}

export interface BidDetails {
  id: string;
  auctionId: string;
  auctionPlayerId: string;
  teamId: string;
  team: {
    id: string;
    name: string;
    code: string | null;
    logoUrl: string | null;
    color: string | null;
  };
  bidderId: string;
  bidder: {
    id: string;
    name: string;
  };
  amount: number;
  timestamp: string;
  isWinning: boolean;
}

export interface AuctionSnapshot {
  id: string;
  roomId: string;
  status: AuctionState;
  currentAuctionPlayerId: string | null;
  currentAuctionPlayer: AuctionPlayerDetails | null;
  currentBid: number;
  currentHighestBidderId: string | null;
  currentHighestBidder: TeamDetails | null;
  timerSeconds: number;
  timerEndsAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  bids: BidDetails[];
  auctionPlayers: AuctionPlayerDetails[];
}

export interface AuctionEventItem {
  id: string;
  roomId: string;
  auctionId: string | null;
  eventType: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
}
