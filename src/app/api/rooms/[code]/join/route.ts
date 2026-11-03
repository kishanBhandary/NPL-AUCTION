import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase().trim();

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      include: {
        auctions: { where: { status: { in: ["ACTIVE", "SCHEDULED"] } }, take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    if (room.status === "COMPLETED") {
      return NextResponse.json({ error: "This auction has already concluded" }, { status: 400 });
    }

    const body = await req.json();
    const {
      teamName,
      teamCode,
      logoUrl,
      color = "#3B82F6",
      ownerName,
      email,
      password,
      // 1 Main Fixed Player
      mainPlayerName,
      mainPlayerPosition = "ALL_ROUNDER",
      mainPlayerPhotoUrl,
    } = body;

    if (!teamName || !ownerName || !email) {
      return NextResponse.json({ error: "Team name, owner name and email are required" }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Find or create User with password
    let user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      const hashedPassword = password ? hashPassword(password) : undefined;
      user = await prisma.user.create({
        data: {
          name: ownerName.trim(),
          email: trimmedEmail,
          password: hashedPassword,
          role: "TEAM_OWNER",
        },
      });
    }

    // Check if team name already taken in this room
    const existingTeamInRoom = await prisma.team.findFirst({
      where: {
        roomId: room.id,
        OR: [
          { name: { equals: teamName.trim(), mode: "insensitive" } },
          { ownerId: user.id },
        ],
      },
      include: { squad: true },
    });

    if (existingTeamInRoom) {
      // If user already owns a team in this room, sign them in with their existing team
      if (existingTeamInRoom.ownerId === user.id) {
        await setSessionUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });
        return NextResponse.json({
          success: true,
          message: "Signed back in with existing franchise",
          team: existingTeamInRoom,
          user,
        });
      }

      return NextResponse.json({ error: "A franchise with this name already exists in this room" }, { status: 400 });
    }

    // Create Team in room with 1 Main Fixed Player details
    const team = await prisma.team.create({
      data: {
        roomId: room.id,
        ownerId: user.id,
        name: teamName.trim(),
        code: teamCode ? teamCode.toUpperCase().trim() : teamName.slice(0, 3).toUpperCase(),
        logoUrl: logoUrl || null,
        color: color || "#3B82F6",
        totalPurse: room.startingPurse || 5000,
        remainingPurse: room.startingPurse || 5000,
        isReady: false,
        mainPlayerName: mainPlayerName ? mainPlayerName.trim() : null,
        mainPlayerPosition: mainPlayerPosition || "ALL_ROUNDER",
        mainPlayerPhotoUrl: mainPlayerPhotoUrl || null,
      },
    });

    // If Main Player details provided, register them as fixed player in squad!
    if (mainPlayerName && mainPlayerName.trim()) {
      const fixedPlayer = await prisma.player.create({
        data: {
          roomId: room.id,
          name: mainPlayerName.trim(),
          position: mainPlayerPosition || "ALL_ROUNDER",
          photoUrl: mainPlayerPhotoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mainPlayerName)}`,
        },
      });

      // If auction exists, assign fixed player to this team's squad as SOLD/FIXED
      if (room.auctions[0]) {
        await prisma.auctionPlayer.create({
          data: {
            auctionId: room.auctions[0].id,
            playerId: fixedPlayer.id,
            status: "SOLD",
            basePrice: room.minBasePrice || 50,
            finalPrice: 0, // Free franchise marquee retention
            winningTeamId: team.id,
            soldAt: new Date(),
          },
        });
      }
    }

    // Create room membership
    await prisma.roomMembership.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: user.id,
        },
      },
      update: {
        role: "TEAM_OWNER",
      },
      create: {
        roomId: room.id,
        userId: user.id,
        role: "TEAM_OWNER",
        isReady: false,
      },
    });

    // Record Event
    await prisma.auctionEvent.create({
      data: {
        roomId: room.id,
        eventType: "TEAM_JOINED",
        message: `${team.name} joined the league with Main Player ${mainPlayerName || "Captain"}.`,
        payload: { teamId: team.id, teamName: team.name, ownerName, mainPlayerName },
        createdById: user.id,
      },
    });

    // Set Session
    await setSessionUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "TEAM_OWNER",
    });

    // Broadcast realtime event
    await broadcastAuctionEvent(roomCode, "TEAM_JOINED", {
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
        logoUrl: team.logoUrl,
        color: team.color,
        remainingPurse: team.remainingPurse,
        isReady: team.isReady,
        mainPlayerName: team.mainPlayerName,
        owner: { id: user.id, name: user.name, email: user.email },
      },
    });

    return NextResponse.json({ success: true, team, user });
  } catch (error: unknown) {
    console.error("Team registration error:", error);
    const message = error instanceof Error ? error.message : "Failed to register team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
