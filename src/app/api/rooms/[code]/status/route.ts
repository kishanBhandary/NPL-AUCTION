import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireAuctioneer } from "@/lib/auth";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";

export async function PATCH(
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
        players: {
          select: {
            id: true,
            roomId: true,
            name: true,
            photoUrl: true,
            position: true,
          },
        },
        auctions: { take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await requireAuctioneer(room.id, user.id);

    const body = await req.json();
    const { status } = body;

    if (!["WAITING", "LIVE", "PAUSED", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let auction = room.auctions[0];

    // If starting or launching auction:
    if (status === "LIVE") {
      if (room.players.length === 0) {
        return NextResponse.json({
          error: "Cannot launch auction without players. Please register players first.",
        }, { status: 400 });
      }

      // Ensure auction entity exists
      if (!auction) {
        auction = await prisma.auction.create({
          data: {
            roomId: room.id,
            status: "ACTIVE",
            startedAt: new Date(),
            currentBid: room.minBasePrice || 50,
          },
        });
      } else {
        auction = await prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: "ACTIVE",
            startedAt: auction.startedAt || new Date(),
            currentBid: auction.currentBid || room.minBasePrice || 50,
          },
        });
      }

      // Populate AuctionPlayer roster for any room player not yet in roster
      const existingRoster = await prisma.auctionPlayer.findMany({
        where: { auctionId: auction.id },
        select: { playerId: true },
      });
      const existingPlayerIds = new Set(existingRoster.map((r) => r.playerId));

      const missingPlayers = room.players.filter((p) => !existingPlayerIds.has(p.id));

      if (missingPlayers.length > 0) {
        let lotCounter = existingRoster.length + 1;
        await prisma.auctionPlayer.createMany({
          data: missingPlayers.map((player) => ({
            auctionId: auction.id,
            playerId: player.id,
            status: "UPCOMING",
            basePrice: room.minBasePrice || 50,
            lotNumber: lotCounter++,
          })),
        });
      }
    } else if (status === "COMPLETED") {
      if (auction) {
        await prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: "CONCLUDED",
            endedAt: new Date(),
          },
        });
      }
    }

    const updatedRoom = await prisma.auctionRoom.update({
      where: { id: room.id },
      data: { status },
    });

    // Record Event
    await prisma.auctionEvent.create({
      data: {
        roomId: room.id,
        auctionId: auction?.id || null,
        eventType: status === "LIVE" ? "AUCTION_LAUNCHED" : "ROOM_STATUS_CHANGED",
        message: `Auction room status updated to ${status}.`,
        payload: { status },
        createdById: user.id,
      },
    });

    // Broadcast Realtime Event to all connected screens
    await broadcastAuctionEvent(roomCode, status === "LIVE" ? "AUCTION_LAUNCHED" : "ROOM_STATUS_CHANGED", {
      status,
      roomCode,
      roomId: room.id,
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: unknown) {
    console.error("Room status update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update room status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
