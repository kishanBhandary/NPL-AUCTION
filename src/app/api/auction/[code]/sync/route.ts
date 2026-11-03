import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase().trim();

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      select: {
        id: true,
        status: true,
        auctions: {
          where: { status: { in: ["ACTIVE", "SCHEDULED", "PAUSED"] } },
          take: 1,
          select: {
            id: true,
            status: true,
            currentBid: true,
            currentHighestBidderId: true,
            timerEndsAt: true,
            currentAuctionPlayerId: true,
            updatedAt: true,
            currentHighestBidder: {
              select: {
                id: true,
                name: true,
                code: true,
                logoUrl: true,
                color: true,
                remainingPurse: true,
              },
            },
            currentAuctionPlayer: {
              select: {
                id: true,
                status: true,
                lotNumber: true,
                basePrice: true,
                finalPrice: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    photoUrl: true,
                    position: true,
                  },
                },
              },
            },
            bids: {
              take: 5,
              orderBy: { timestamp: "desc" },
              select: {
                id: true,
                amount: true,
                timestamp: true,
                teamId: true,
                team: {
                  select: { id: true, name: true, code: true, logoUrl: true, color: true },
                },
                bidder: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const auction = room.auctions[0] || null;

    return NextResponse.json({
      roomStatus: room.status,
      auction: auction
        ? {
            id: auction.id,
            status: auction.status,
            currentBid: auction.currentBid,
            currentHighestBidderId: auction.currentHighestBidderId,
            timerEndsAt: auction.timerEndsAt,
            currentAuctionPlayerId: auction.currentAuctionPlayerId,
            currentHighestBidder: auction.currentHighestBidder,
            currentAuctionPlayer: auction.currentAuctionPlayer,
            updatedAt: auction.updatedAt,
          }
        : null,
      latestBids: auction?.bids || [],
    });
  } catch (error) {
    console.error("Fast sync error:", error);
    return NextResponse.json({ error: "Sync error" }, { status: 500 });
  }
}

