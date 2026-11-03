-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AUCTIONEER', 'TEAM_OWNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('DRAFT', 'WAITING', 'LIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('AUCTIONEER', 'TEAM_OWNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('ATTACKER', 'SETTER', 'LIBERO', 'DEFENDER', 'ALL_ROUNDER');

-- CreateEnum
CREATE TYPE "AuctionState" AS ENUM ('SCHEDULED', 'ACTIVE', 'PAUSED', 'CONCLUDED');

-- CreateEnum
CREATE TYPE "AuctionPlayerStatus" AS ENUM ('UPCOMING', 'IN_AUCTION', 'SOLD', 'UNSOLD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AUCTIONEER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_rooms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "ownerId" TEXT NOT NULL,
    "startingPurse" DOUBLE PRECISION NOT NULL DEFAULT 10000000,
    "minBasePrice" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "defaultBidIncrement" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "timerDuration" INTEGER NOT NULL DEFAULT 30,
    "minSquadSize" INTEGER NOT NULL DEFAULT 6,
    "maxSquadSize" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_memberships" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomRole" NOT NULL DEFAULT 'VIEWER',
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "logoUrl" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "totalPurse" DOUBLE PRECISION NOT NULL,
    "remainingPurse" DOUBLE PRECISION NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "position" "PlayerPosition" NOT NULL DEFAULT 'ALL_ROUNDER',
    "jerseyNumber" INTEGER,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "nationality" TEXT DEFAULT 'Domestic',
    "age" INTEGER,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "AuctionState" NOT NULL DEFAULT 'SCHEDULED',
    "currentAuctionPlayerId" TEXT,
    "currentBid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentHighestBidderId" TEXT,
    "timerSeconds" INTEGER NOT NULL DEFAULT 30,
    "timerEndsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_players" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "AuctionPlayerStatus" NOT NULL DEFAULT 'UPCOMING',
    "basePrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION,
    "lotNumber" INTEGER,
    "soldAt" TIMESTAMP(3),
    "winningTeamId" TEXT,

    CONSTRAINT "auction_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "auctionPlayerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isWinning" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_events" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "auctionId" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auction_rooms_roomCode_key" ON "auction_rooms"("roomCode");

-- CreateIndex
CREATE INDEX "auction_rooms_ownerId_idx" ON "auction_rooms"("ownerId");

-- CreateIndex
CREATE INDEX "auction_rooms_roomCode_idx" ON "auction_rooms"("roomCode");

-- CreateIndex
CREATE INDEX "room_memberships_roomId_idx" ON "room_memberships"("roomId");

-- CreateIndex
CREATE INDEX "room_memberships_userId_idx" ON "room_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_memberships_roomId_userId_key" ON "room_memberships"("roomId", "userId");

-- CreateIndex
CREATE INDEX "teams_roomId_idx" ON "teams"("roomId");

-- CreateIndex
CREATE INDEX "teams_ownerId_idx" ON "teams"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_roomId_name_key" ON "teams"("roomId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_roomId_ownerId_key" ON "teams"("roomId", "ownerId");

-- CreateIndex
CREATE INDEX "players_roomId_idx" ON "players"("roomId");

-- CreateIndex
CREATE INDEX "players_position_idx" ON "players"("position");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_currentAuctionPlayerId_key" ON "auctions"("currentAuctionPlayerId");

-- CreateIndex
CREATE INDEX "auctions_roomId_idx" ON "auctions"("roomId");

-- CreateIndex
CREATE INDEX "auction_players_auctionId_idx" ON "auction_players"("auctionId");

-- CreateIndex
CREATE INDEX "auction_players_playerId_idx" ON "auction_players"("playerId");

-- CreateIndex
CREATE INDEX "auction_players_winningTeamId_idx" ON "auction_players"("winningTeamId");

-- CreateIndex
CREATE INDEX "auction_players_status_idx" ON "auction_players"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auction_players_auctionId_playerId_key" ON "auction_players"("auctionId", "playerId");

-- CreateIndex
CREATE INDEX "bids_auctionId_idx" ON "bids"("auctionId");

-- CreateIndex
CREATE INDEX "bids_auctionPlayerId_amount_idx" ON "bids"("auctionPlayerId", "amount" DESC);

-- CreateIndex
CREATE INDEX "bids_teamId_idx" ON "bids"("teamId");

-- CreateIndex
CREATE INDEX "auction_events_roomId_createdAt_idx" ON "auction_events"("roomId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "auction_events_auctionId_idx" ON "auction_events"("auctionId");

-- AddForeignKey
ALTER TABLE "auction_rooms" ADD CONSTRAINT "auction_rooms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_currentAuctionPlayerId_fkey" FOREIGN KEY ("currentAuctionPlayerId") REFERENCES "auction_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_currentHighestBidderId_fkey" FOREIGN KEY ("currentHighestBidderId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_players" ADD CONSTRAINT "auction_players_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_players" ADD CONSTRAINT "auction_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_players" ADD CONSTRAINT "auction_players_winningTeamId_fkey" FOREIGN KEY ("winningTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auctionPlayerId_fkey" FOREIGN KEY ("auctionPlayerId") REFERENCES "auction_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

