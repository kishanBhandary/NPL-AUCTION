import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { generateRoomCode } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rooms = await prisma.auctionRoom.findMany({
      where: { ownerId: user.id },
      include: {
        _count: {
          select: {
            teams: true,
            players: true,
          },
        },
        teams: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            remainingPurse: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rooms });
  } catch (error: unknown) {
    console.error("Fetch rooms error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch rooms";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title = "Narayana Guru Premiere League",
      description = "Official live auction for Narayana Guru Premiere League",
      startingPurse = 5000,
      minBasePrice = 50,
      defaultBidIncrement = 50,
      timerDuration = 30,
      expectedTeamsCount = 4,
      playersPerTeam = 8, // 7 on court + 1 substitute
      players = [],       // optional initial player list
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Room title is required" }, { status: 400 });
    }

    const squadSize = Number(playersPerTeam) || 8;

    // Generate unique room code
    let roomCode = generateRoomCode();
    let existing = await prisma.auctionRoom.findUnique({ where: { roomCode } });
    while (existing) {
      roomCode = generateRoomCode();
      existing = await prisma.auctionRoom.findUnique({ where: { roomCode } });
    }

    // Create room with linked auction and owner membership
    const room = await prisma.auctionRoom.create({
      data: {
        title,
        description: description || null,
        roomCode,
        ownerId: user.id,
        startingPurse: Number(startingPurse) || 5000,
        minBasePrice: Number(minBasePrice) || 50,
        defaultBidIncrement: Number(defaultBidIncrement) || 50,
        timerDuration: Number(timerDuration) || 30,
        expectedTeamsCount: Number(expectedTeamsCount) || 4,
        playersPerTeam: squadSize,
        minSquadSize: squadSize,
        maxSquadSize: squadSize,
        status: "WAITING",
        memberships: {
          create: {
            userId: user.id,
            role: "AUCTIONEER",
            isReady: true,
          },
        },
        auctions: {
          create: {
            status: "SCHEDULED",
            timerSeconds: Number(timerDuration) || 30,
            currentBid: Number(minBasePrice) || 50,
          },
        },
      },
      include: {
        auctions: true,
      },
    });

    // If players list provided during room creation, populate them!
    if (Array.isArray(players) && players.length > 0) {
      const auction = room.auctions[0];
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        if (p.name) {
          const createdPlayer = await prisma.player.create({
            data: {
              roomId: room.id,
              name: p.name.trim(),
              position: p.position || "ALL_ROUNDER",
              photoUrl: p.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`,
            },
          });

          if (auction) {
            await prisma.auctionPlayer.create({
              data: {
                auctionId: auction.id,
                playerId: createdPlayer.id,
                status: "UPCOMING",
                basePrice: room.minBasePrice || 50,
                lotNumber: i + 1,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, room });
  } catch (error: unknown) {
    console.error("Create room error:", error);
    const message = error instanceof Error ? error.message : "Failed to create auction room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
