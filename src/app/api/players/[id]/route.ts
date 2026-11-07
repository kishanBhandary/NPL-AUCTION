import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireAuctioneer } from "@/lib/auth";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { room: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    await requireAuctioneer(player.roomId, user.id);

    const body = await req.json();
    const { name, position, photoUrl } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "Player name cannot be empty" }, { status: 400 });
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(position !== undefined && { position }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl || null }),
      },
    });

    // Broadcast Realtime Update
    await broadcastAuctionEvent(player.room.roomCode, "PLAYER_UPDATED", {
      player: updatedPlayer,
    });

    return NextResponse.json({ success: true, player: updatedPlayer });
  } catch (error: unknown) {
    console.error("Player update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        room: true,
        auctionPlayers: {
          include: {
            auction: {
              select: { status: true, currentAuctionPlayerId: true },
            },
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    await requireAuctioneer(player.roomId, user.id);

    // Validate that player is not currently active on block
    const isInAuction = player.auctionPlayers.some(
      (ap) => ap.status === "IN_AUCTION" || ap.auction?.currentAuctionPlayerId === ap.id
    );
    if (isInAuction) {
      return NextResponse.json(
        { error: "Cannot delete a player while they are on the live auction block." },
        { status: 400 }
      );
    }

    // Validate that player is not already sold
    const isSold = player.auctionPlayers.some((ap) => ap.status === "SOLD");
    if (isSold) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a player that has already been acquired by a team. Reset the auction first if you wish to remove them.",
        },
        { status: 400 }
      );
    }

    await prisma.player.delete({
      where: { id: playerId },
    });

    // Broadcast Realtime Deletion
    await broadcastAuctionEvent(player.room.roomCode, "PLAYER_DELETED", {
      playerId,
      roomId: player.roomId,
    });

    return NextResponse.json({ success: true, message: "Player removed successfully" });
  } catch (error: unknown) {
    console.error("Player deletion error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
