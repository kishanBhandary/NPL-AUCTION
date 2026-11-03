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

    const [updatedLot] = await prisma.$transaction([
      prisma.auctionPlayer.update({
        where: { id: currentLot.id },
        data: {
          status: "UNSOLD",
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
          currentAuctionPlayerId: null,
          currentBid: 0,
          currentHighestBidderId: null,
          timerEndsAt: null,
        },
      }),
      prisma.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: auction.id,
          eventType: "PLAYER_UNSOLD",
          message: `${currentLot.player.name} (${currentLot.player.position}) went UNSOLD at base price ₹${currentLot.basePrice.toLocaleString("en-IN")}.`,
          payload: {
            auctionPlayerId: currentLot.id,
            playerName: currentLot.player.name,
            position: currentLot.player.position,
            basePrice: currentLot.basePrice,
          },
          createdById: user.id,
        },
      }),
    ]);

    await broadcastAuctionEvent(roomCode, "PLAYER_UNSOLD", {
      unsoldPlayer: updatedLot,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      unsoldPlayer: updatedLot,
    });
  } catch (error: unknown) {
    console.error("Unsold error:", error);
    const message = error instanceof Error ? error.message : "Failed to mark player unsold";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

