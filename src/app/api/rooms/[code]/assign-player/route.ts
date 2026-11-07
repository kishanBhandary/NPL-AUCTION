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
        auctions: { orderBy: { createdAt: "desc" }, take: 1 },
        teams: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    await requireAuctioneer(room.id, user.id);

    const body = await req.json();
    const { playerId, teamId, finalPrice = 0, action = "assign" } = body;

    if (!playerId) {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
    }

    // Ensure auction exists
    let auction = room.auctions[0];
    if (!auction) {
      auction = await prisma.auction.create({
        data: {
          roomId: room.id,
          status: "ACTIVE",
          currentBid: room.minBasePrice || 50,
        },
      });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (action === "unassign") {
      const existingAuctionPlayer = await prisma.auctionPlayer.findFirst({
        where: { auctionId: auction.id, playerId },
        include: { winningTeam: true },
      });

      if (existingAuctionPlayer && existingAuctionPlayer.winningTeamId) {
        const refundAmount = existingAuctionPlayer.finalPrice || 0;
        if (refundAmount > 0) {
          await prisma.team.update({
            where: { id: existingAuctionPlayer.winningTeamId },
            data: {
              remainingPurse: {
                increment: refundAmount,
              },
            },
          });
        }

        await prisma.auctionPlayer.update({
          where: { id: existingAuctionPlayer.id },
          data: {
            winningTeamId: null,
            status: "UNSOLD",
            finalPrice: null,
            soldAt: null,
          },
        });

        await broadcastAuctionEvent(roomCode, "PLAYER_UNASSIGNED", {
          playerId,
          roomCode,
        });

        return NextResponse.json({
          success: true,
          message: `Player "${player.name}" unassigned from franchise.`,
        });
      }

      return NextResponse.json({ error: "Player is not currently assigned" }, { status: 400 });
    }

    // Assign to Team
    if (!teamId) {
      return NextResponse.json({ error: "Target Franchise Team ID is required" }, { status: 400 });
    }

    const targetTeam = room.teams.find((t) => t.id === teamId);
    if (!targetTeam) {
      return NextResponse.json({ error: "Target Franchise not found in room" }, { status: 404 });
    }

    const price = Number(finalPrice) || 0;

    // Check if team has enough purse if price > 0
    if (price > 0 && targetTeam.remainingPurse < price) {
      return NextResponse.json(
        { error: `Franchise only has ₹${targetTeam.remainingPurse} remaining in purse budget.` },
        { status: 400 }
      );
    }

    // Find or create AuctionPlayer
    let auctionPlayer = await prisma.auctionPlayer.findFirst({
      where: { auctionId: auction.id, playerId },
    });

    const previousTeamId = auctionPlayer?.winningTeamId;
    const previousPrice = auctionPlayer?.finalPrice || 0;

    // If previously assigned to another team, refund previous team
    if (previousTeamId && previousTeamId !== targetTeam.id && previousPrice > 0) {
      await prisma.team.update({
        where: { id: previousTeamId },
        data: { remainingPurse: { increment: previousPrice } },
      });
    }

    if (!auctionPlayer) {
      auctionPlayer = await prisma.auctionPlayer.create({
        data: {
          auctionId: auction.id,
          playerId: player.id,
          status: "SOLD",
          basePrice: room.minBasePrice || 50,
          finalPrice: price,
          winningTeamId: targetTeam.id,
          soldAt: new Date(),
        },
      });
    } else {
      auctionPlayer = await prisma.auctionPlayer.update({
        where: { id: auctionPlayer.id },
        data: {
          status: "SOLD",
          finalPrice: price,
          winningTeamId: targetTeam.id,
          soldAt: new Date(),
        },
      });
    }

    // Deduct price from target team purse if price > 0
    if (price > 0) {
      await prisma.team.update({
        where: { id: targetTeam.id },
        data: {
          remainingPurse: { decrement: price },
        },
      });
    }

    // Record Event
    await prisma.auctionEvent.create({
      data: {
        roomId: room.id,
        auctionId: auction.id,
        eventType: "PLAYER_ASSIGNED",
        message: `${player.name} assigned to ${targetTeam.name} for ₹${price}.`,
        payload: {
          playerId: player.id,
          playerName: player.name,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          price,
        },
        createdById: user.id,
      },
    });

    // Broadcast Realtime Event
    await broadcastAuctionEvent(roomCode, "PLAYER_ASSIGNED", {
      playerId: player.id,
      playerName: player.name,
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      price,
    });

    return NextResponse.json({
      success: true,
      message: `Player "${player.name}" assigned to ${targetTeam.name} successfully!`,
      auctionPlayer,
    });
  } catch (error: unknown) {
    console.error("Player assignment error:", error);
    const message = error instanceof Error ? error.message : "Failed to assign player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
