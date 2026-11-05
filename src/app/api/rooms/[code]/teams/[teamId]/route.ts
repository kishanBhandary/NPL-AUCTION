import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ code: string; teamId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { code, teamId } = await params;
    const roomCode = code.toUpperCase().trim();

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      select: { id: true, ownerId: true, roomCode: true, status: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    // Only the room owner (Auctioneer) can remove a team
    if (room.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the official auctioneer can remove teams from this room" },
        { status: 403 }
      );
    }

    // Check if team exists in this room
    const team = await prisma.team.findFirst({
      where: { id: teamId, roomId: room.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found in this auction room" }, { status: 404 });
    }

    // If team has won players or placed bids, clean up auction references first
    await prisma.auction.updateMany({
      where: { roomId: room.id, currentHighestBidderId: team.id },
      data: { currentHighestBidderId: null },
    });

    await prisma.auctionPlayer.updateMany({
      where: { winningTeamId: team.id },
      data: { winningTeamId: null, status: "UPCOMING", finalPrice: null },
    });

    // Remove room membership for the team owner (if not the room creator)
    if (team.ownerId !== room.ownerId) {
      await prisma.roomMembership.deleteMany({
        where: { roomId: room.id, userId: team.ownerId },
      });
    }

    // Delete the team
    await prisma.team.delete({
      where: { id: team.id },
    });

    // Create an auction event log
    await prisma.auctionEvent.create({
      data: {
        roomId: room.id,
        eventType: "TEAM_REMOVED",
        message: `Franchise "${team.name}" was removed by the auctioneer.`,
        payload: { teamId: team.id, teamName: team.name, removedBy: user.name },
        createdById: user.id,
      },
    });

    // Broadcast realtime event to all connected clients
    await broadcastAuctionEvent(room.roomCode, "TEAM_REMOVED", {
      teamId: team.id,
      teamName: team.name,
      removedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Team "${team.name}" was successfully removed from the room.`,
    });
  } catch (error: unknown) {
    console.error("Remove team error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
