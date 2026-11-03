import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireAuctioneer } from "@/lib/auth";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase().trim();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      include: {
        auctions: { where: { status: "ACTIVE" }, take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await requireAuctioneer(room.id, user.id);

    const auction = room.auctions[0];
    if (!auction) {
      return NextResponse.json({ error: "No active auction found in this room" }, { status: 400 });
    }

    // Check if there is already an active lot in bidding
    if (auction.currentAuctionPlayerId) {
      const activeLot = await prisma.auctionPlayer.findUnique({
        where: { id: auction.currentAuctionPlayerId },
      });
      if (activeLot && activeLot.status === "IN_AUCTION") {
        return NextResponse.json({
          error: "A player is currently on the auction block. Mark as Sold or Unsold before calling a new player.",
        }, { status: 400 });
      }
    }

    // Find all upcoming players
    const upcomingPlayers = await prisma.auctionPlayer.findMany({
      where: {
        auctionId: auction.id,
        status: "UPCOMING",
      },
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
    });

    if (upcomingPlayers.length === 0) {
      return NextResponse.json({ error: "No remaining upcoming players in the auction pool!" }, { status: 400 });
    }

    // Pick random eligible player
    const randomIndex = Math.floor(Math.random() * upcomingPlayers.length);
    const selectedAuctionPlayer = upcomingPlayers[randomIndex];

    // Update lot and auction in transaction
    const [updatedLot, updatedAuction] = await prisma.$transaction([
      prisma.auctionPlayer.update({
        where: { id: selectedAuctionPlayer.id },
        data: {
          status: "IN_AUCTION",
        },
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
      }),
      prisma.auction.update({
        where: { id: auction.id },
        data: {
          currentAuctionPlayerId: selectedAuctionPlayer.id,
          currentBid: selectedAuctionPlayer.basePrice,
          currentHighestBidderId: null,
          timerEndsAt: null, // Paused until auctioneer starts timer
        },
        include: {
          currentHighestBidder: true,
        },
      }),
      prisma.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: auction.id,
          eventType: "PLAYER_CALLED",
          message: `Lot #${selectedAuctionPlayer.lotNumber || "-"}: ${selectedAuctionPlayer.player.name} (${selectedAuctionPlayer.player.position}) is now on the block! Base price: ${selectedAuctionPlayer.basePrice}.`,
          payload: {
            auctionPlayerId: selectedAuctionPlayer.id,
            playerName: selectedAuctionPlayer.player.name,
            position: selectedAuctionPlayer.player.position,
            basePrice: selectedAuctionPlayer.basePrice,
          },
          createdById: user.id,
        },
      }),
    ]);

    // Broadcast Realtime Event
    await broadcastAuctionEvent(roomCode, "PLAYER_CALLED", {
      auctionPlayer: updatedLot,
      currentBid: updatedAuction.currentBid,
      highestBidder: null,
      timerEndsAt: null,
    });

    return NextResponse.json({
      success: true,
      auctionPlayer: updatedLot,
      currentBid: updatedAuction.currentBid,
    });
  } catch (error: unknown) {
    console.error("Select player error:", error);
    const message = error instanceof Error ? error.message : "Failed to select player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

