import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase().trim();

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        teams: {
          include: {
            owner: { select: { id: true, name: true } },
            squad: {
              include: {
                player: {
                  select: {
                    id: true,
                    roomId: true,
                    name: true,
                    photoUrl: true,
                    position: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        auctions: {
          where: { status: { in: ["ACTIVE", "SCHEDULED", "PAUSED"] } },
          take: 1,
          include: {
            currentHighestBidder: true,
            currentAuctionPlayer: {
              include: {
                player: {
                  select: {
                    id: true,
                    roomId: true,
                    name: true,
                    photoUrl: true,
                    position: true,
                  },
                },
                winningTeam: true,
              },
            },
            bids: {
              take: 20,
              orderBy: { timestamp: "desc" },
              include: {
                team: {
                  select: { id: true, name: true, code: true, logoUrl: true, color: true },
                },
                bidder: {
                  select: { id: true, name: true },
                },
              },
            },
            auctionPlayers: {
              include: {
                player: {
                  select: {
                    id: true,
                    roomId: true,
                    name: true,
                    photoUrl: true,
                    position: true,
                  },
                },
                winningTeam: {
                  select: { id: true, name: true, color: true, logoUrl: true },
                },
              },
              orderBy: { lotNumber: "asc" },
            },
          },
        },
        events: {
          take: 15,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    const auction = room.auctions[0] || null;

    // Filter current lot bids
    const currentLotBids = auction?.currentAuctionPlayerId
      ? auction.bids.filter((b) => b.auctionPlayerId === auction.currentAuctionPlayerId)
      : [];

    // Categorize roster
    const upcomingPlayers = auction?.auctionPlayers.filter((ap) => ap.status === "UPCOMING") || [];
    const soldPlayers = auction?.auctionPlayers.filter((ap) => ap.status === "SOLD") || [];
    const unsoldPlayers = auction?.auctionPlayers.filter((ap) => ap.status === "UNSOLD") || [];

    return NextResponse.json({
      room: {
        id: room.id,
        title: room.title,
        roomCode: room.roomCode,
        status: room.status,
        ownerId: room.ownerId,
        startingPurse: room.startingPurse,
        minBasePrice: room.minBasePrice,
        defaultBidIncrement: room.defaultBidIncrement,
        timerDuration: room.timerDuration,
        minSquadSize: room.minSquadSize,
        maxSquadSize: room.maxSquadSize,
      },
      auction: auction
        ? {
            id: auction.id,
            status: auction.status,
            currentAuctionPlayerId: auction.currentAuctionPlayerId,
            currentAuctionPlayer: auction.currentAuctionPlayer,
            currentBid: auction.currentBid,
            currentHighestBidderId: auction.currentHighestBidderId,
            currentHighestBidder: auction.currentHighestBidder,
            timerSeconds: auction.timerSeconds,
            timerEndsAt: auction.timerEndsAt,
            startedAt: auction.startedAt,
          }
        : null,
      currentLotBids,
      upcomingPlayers,
      soldPlayers,
      unsoldPlayers,
      teams: room.teams.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        logoUrl: t.logoUrl,
        color: t.color,
        totalPurse: t.totalPurse,
        remainingPurse: t.remainingPurse,
        mainPlayerName: t.mainPlayerName,
        mainPlayerPosition: t.mainPlayerPosition,
        mainPlayerPhotoUrl: t.mainPlayerPhotoUrl,
        squadCount: t.squad.length,
        squad: t.squad,
        owner: t.owner,
      })),
      recentEvents: room.events,
    });
  } catch (error: unknown) {
    console.error("Auction state fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch auction state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
