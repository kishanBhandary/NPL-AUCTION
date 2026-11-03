import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireAuctioneer } from "@/lib/auth";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const roomCode = searchParams.get("roomCode");

    if (!roomId && !roomCode) {
      return NextResponse.json({ error: "roomId or roomCode is required" }, { status: 400 });
    }

    const players = await prisma.player.findMany({
      where: roomId ? { roomId } : { room: { roomCode: roomCode?.toUpperCase() } },
      select: {
        id: true,
        roomId: true,
        name: true,
        photoUrl: true,
        position: true,
        auctionPlayers: {
          select: {
            id: true,
            status: true,
            basePrice: true,
            finalPrice: true,
            winningTeam: {
              select: { id: true, name: true, color: true, logoUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ players });
  } catch (error: unknown) {
    console.error("Fetch players error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      roomId,
      name,
      photoUrl,
      position = "ALL_ROUNDER",
    } = body;

    if (!roomId || !name) {
      return NextResponse.json({ error: "Room ID and player name are required" }, { status: 400 });
    }

    const room = await prisma.auctionRoom.findUnique({
      where: { id: roomId },
      include: {
        auctions: { where: { status: { in: ["ACTIVE", "SCHEDULED"] } }, take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await requireAuctioneer(room.id, user.id);

    // Create player with only name, photoUrl, and position
    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        name: name.trim(),
        photoUrl: photoUrl || null,
        position,
      },
    });

    // If active or scheduled auction exists, add player to AuctionPlayer roster with 50 base price
    if (room.auctions[0]) {
      const lotCount = await prisma.auctionPlayer.count({
        where: { auctionId: room.auctions[0].id },
      });

      await prisma.auctionPlayer.create({
        data: {
          auctionId: room.auctions[0].id,
          playerId: player.id,
          status: "UPCOMING",
          basePrice: room.minBasePrice || 50,
          lotNumber: lotCount + 1,
        },
      });
    }

    // Broadcast Realtime Update
    await broadcastAuctionEvent(room.roomCode, "PLAYER_ADDED", {
      player: {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        position: player.position,
        basePrice: room.minBasePrice || 50,
      },
    });

    return NextResponse.json({ success: true, player });
  } catch (error: unknown) {
    console.error("Player creation error:", error);
    const message = error instanceof Error ? error.message : "Failed to register player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
