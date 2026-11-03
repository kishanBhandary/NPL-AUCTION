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
    if (!auction || !auction.currentAuctionPlayerId) {
      return NextResponse.json({ error: "No player currently on the auction block" }, { status: 400 });
    }

    if (!auction.currentHighestBidderId) {
      return NextResponse.json({
        error: "No bids have been placed for this player. Use 'Unsold' if no bids were received.",
      }, { status: 400 });
    }

    const currentLot = await prisma.auctionPlayer.findUnique({
      where: { id: auction.currentAuctionPlayerId },
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

    if (!currentLot) {
      return NextResponse.json({ error: "Player lot not found" }, { status: 404 });
    }

    const winningTeam = await prisma.team.findUnique({
      where: { id: auction.currentHighestBidderId },
    });

    if (!winningTeam) {
      return NextResponse.json({ error: "Winning team not found" }, { status: 404 });
    }

    const finalPrice = auction.currentBid;

    // Concurrency-safe Prisma interactive transaction
    const [updatedLot, updatedTeam] = await prisma.$transaction([
      // 1. Update AuctionPlayer to SOLD
      prisma.auctionPlayer.update({
        where: { id: currentLot.id },
        data: {
          status: "SOLD",
          finalPrice,
          winningTeamId: winningTeam.id,
          soldAt: new Date(),
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
          winningTeam: true,
        },
      }),

      // 2. Deduct winning bid from winning team's purse
      prisma.team.update({
        where: { id: winningTeam.id },
        data: {
          remainingPurse: {
            decrement: finalPrice,
          },
        },
      }),

      // 3. Mark the highest bid as isWinning
      prisma.bid.updateMany({
        where: {
          auctionPlayerId: currentLot.id,
          teamId: winningTeam.id,
          amount: finalPrice,
        },
        data: {
          isWinning: true,
        },
      }),

      // 4. Reset Auction active lot
      prisma.auction.update({
        where: { id: auction.id },
        data: {
          currentAuctionPlayerId: null,
          currentBid: 0,
          currentHighestBidderId: null,
          timerEndsAt: null,
        },
      }),

      // 5. Log AuctionEvent
      prisma.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: auction.id,
          eventType: "PLAYER_SOLD",
          message: `SOLD! ${currentLot.player.name} (${currentLot.player.position}) acquired by ${winningTeam.name} for ₹${finalPrice.toLocaleString("en-IN")}!`,
          payload: {
            auctionPlayerId: currentLot.id,
            playerName: currentLot.player.name,
            position: currentLot.player.position,
            winningTeamId: winningTeam.id,
            winningTeamName: winningTeam.name,
            finalPrice,
          },
          createdById: user.id,
        },
      }),
    ]);

    // Broadcast Realtime Event
    await broadcastAuctionEvent(roomCode, "PLAYER_SOLD", {
      soldPlayer: updatedLot,
      winningTeam: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        code: updatedTeam.code,
        logoUrl: updatedTeam.logoUrl,
        remainingPurse: updatedTeam.remainingPurse,
      },
      finalPrice,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      soldPlayer: updatedLot,
      winningTeam: updatedTeam,
      finalPrice,
    });
  } catch (error: unknown) {
    console.error("Sold error:", error);
    const message = error instanceof Error ? error.message : "Failed to finalize player sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

