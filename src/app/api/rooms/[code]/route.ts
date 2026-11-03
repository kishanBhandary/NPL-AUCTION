import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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
        owner: {
          select: { id: true, name: true, email: true },
        },
        teams: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
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
            _count: {
              select: { squad: true, bids: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        players: {
          select: {
            id: true,
            roomId: true,
            name: true,
            photoUrl: true,
            position: true,
          },
          orderBy: { createdAt: "asc" },
        },
        auctions: {
          where: { status: { in: ["ACTIVE", "SCHEDULED", "PAUSED"] } },
          take: 1,
          include: {
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
            currentHighestBidder: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error: unknown) {
    console.error("Get room error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { code } = await params;
    const roomCode = code.toUpperCase().trim();

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      select: { id: true, ownerId: true, title: true, roomCode: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    // Only room owner can delete the room
    if (room.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the auction room creator can delete this room" },
        { status: 403 }
      );
    }

    // Break circular references in Auction (currentAuctionPlayerId) before cascade delete
    await prisma.auction.updateMany({
      where: { roomId: room.id },
      data: { currentAuctionPlayerId: null },
    });

    // Delete the room and cascade delete all related teams, players, memberships, bids, events
    await prisma.auctionRoom.delete({
      where: { id: room.id },
    });

    return NextResponse.json({
      success: true,
      message: `Auction room "${room.title}" (${room.roomCode}) was successfully deleted`,
    });
  } catch (error: unknown) {
    console.error("Delete room error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
