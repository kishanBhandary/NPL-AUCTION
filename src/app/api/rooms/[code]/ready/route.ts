import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
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
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const team = await prisma.team.findFirst({
      where: {
        roomId: room.id,
        ownerId: user.id,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "You do not own a team in this room" }, { status: 403 });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: { isReady: !team.isReady },
    });

    await prisma.roomMembership.updateMany({
      where: { roomId: room.id, userId: user.id },
      data: { isReady: updatedTeam.isReady },
    });

    await broadcastAuctionEvent(roomCode, "TEAM_READY_TOGGLED", {
      teamId: team.id,
      isReady: updatedTeam.isReady,
      teamName: team.name,
    });

    return NextResponse.json({ success: true, isReady: updatedTeam.isReady });
  } catch (error: unknown) {
    console.error("Ready toggle error:", error);
    const message = error instanceof Error ? error.message : "Failed to toggle ready status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

