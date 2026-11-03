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
      return NextResponse.json({ error: "No player is currently on the auction block" }, { status: 400 });
    }

    const timerDuration = room.timerDuration || 30;
    const timerEndsAt = new Date(Date.now() + timerDuration * 1000);

    const updatedAuction = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        timerEndsAt,
        timerSeconds: timerDuration,
      },
    });

    await prisma.auctionEvent.create({
      data: {
        roomId: room.id,
        auctionId: auction.id,
        eventType: "BIDDING_STARTED",
        message: `Bidding timer started! Countdown: ${timerDuration} seconds.`,
        payload: { timerEndsAt, timerDuration },
        createdById: user.id,
      },
    });

    await broadcastAuctionEvent(roomCode, "BIDDING_STARTED", {
      timerEndsAt: timerEndsAt.toISOString(),
      timerSeconds: timerDuration,
    });

    return NextResponse.json({
      success: true,
      timerEndsAt: updatedAuction.timerEndsAt,
      timerSeconds: timerDuration,
    });
  } catch (error: unknown) {
    console.error("Start bidding error:", error);
    const message = error instanceof Error ? error.message : "Failed to start bidding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

