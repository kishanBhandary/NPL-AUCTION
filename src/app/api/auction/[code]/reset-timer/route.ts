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
      return NextResponse.json({ error: "No active auction" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const seconds = body.seconds ? Number(body.seconds) : room.timerDuration || 30;

    const newTimerEndsAt = new Date(Date.now() + seconds * 1000);

    await prisma.auction.update({
      where: { id: auction.id },
      data: {
        timerEndsAt: newTimerEndsAt,
        timerSeconds: seconds,
      },
    });

    await broadcastAuctionEvent(roomCode, "TIMER_RESET", {
      timerEndsAt: newTimerEndsAt.toISOString(),
      timerSeconds: seconds,
    });

    return NextResponse.json({
      success: true,
      timerEndsAt: newTimerEndsAt,
      timerSeconds: seconds,
    });
  } catch (error: unknown) {
    console.error("Reset timer error:", error);
    const message = error instanceof Error ? error.message : "Failed to reset timer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

