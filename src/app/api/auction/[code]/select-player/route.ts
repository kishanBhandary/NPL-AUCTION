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
        players: {
          select: {
            id: true,
            roomId: true,
            name: true,
            photoUrl: true,
            position: true,
          },
        },
        auctions: { where: { status: "ACTIVE" }, take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await requireAuctioneer(room.id, user.id);

    let auction = room.auctions[0];
    if (!auction) {
      // Auto-initialize active auction if starting directly from live room
      auction = await prisma.auction.create({
        data: {
          roomId: room.id,
          status: "ACTIVE",
          startedAt: new Date(),
          currentBid: room.minBasePrice || 50,
        },
      });

      await prisma.auctionRoom.update({
        where: { id: room.id },
        data: { status: "LIVE" },
      });

      // Populate AuctionPlayer roster for all room players
      const existingRoster = await prisma.auctionPlayer.findMany({
        where: { auctionId: auction.id },
        select: { playerId: true },
      });
      const existingPlayerIds = new Set(existingRoster.map((r) => r.playerId));
      const missingPlayers = room.players.filter((p) => !existingPlayerIds.has(p.id));

      if (missingPlayers.length > 0) {
        let lotCounter = 1;
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
    }

    // Check if there is already an active lot in bidding
    if (auction.currentAuctionPlayerId) {
      const activeLot = await prisma.auctionPlayer.findUnique({
        where: { id: auction.currentAuctionPlayerId },
      });
      if (activeLot && activeLot.status === "IN_AUCTION") {
        return NextResponse.json({
          error: "A player is currently on the auction block. Mark as Sold or Unsold before calling a new player.",
        }, { status: 400 });
      }
    }

    // Find all upcoming players
    const upcomingPlayers = await prisma.auctionPlayer.findMany({
      where: {
        auctionId: auction.id,
        status: "UPCOMING",
      },
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
    });

    let poolToChooseFrom = upcomingPlayers;

    if (poolToChooseFrom.length === 0) {
      // Check if there are unsold players that can be brought back for round 2
      const unsoldPlayers = await prisma.auctionPlayer.findMany({
        where: {
          auctionId: auction.id,
          status: "UNSOLD",
        },
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
      });

      if (unsoldPlayers.length > 0) {
        // Recycle unsold players back into upcoming pool
        await prisma.auctionPlayer.updateMany({
          where: {
            auctionId: auction.id,
            status: "UNSOLD",
          },
          data: {
            status: "UPCOMING",
          },
        });
        poolToChooseFrom = unsoldPlayers;
      } else {
        return NextResponse.json({ error: "All players have been auctioned! The auction pool is complete." }, { status: 400 });
      }
    }

    // Pick random eligible player
    const randomIndex = Math.floor(Math.random() * poolToChooseFrom.length);
    const selectedAuctionPlayer = poolToChooseFrom[randomIndex];

    // Update lot and auction in transaction
    const [updatedLot, updatedAuction] = await prisma.$transaction([
      prisma.auctionPlayer.update({
        where: { id: selectedAuctionPlayer.id },
        data: {
          status: "IN_AUCTION",
        },
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
      }),
      prisma.auction.update({
        where: { id: auction.id },
        data: {
          currentAuctionPlayerId: selectedAuctionPlayer.id,
          currentBid: selectedAuctionPlayer.basePrice,
          currentHighestBidderId: null,
          timerEndsAt: null, // Paused until auctioneer starts timer
        },
        include: {
          currentHighestBidder: true,
        },
      }),
      prisma.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: auction.id,
          eventType: "PLAYER_CALLED",
          message: `Lot #${selectedAuctionPlayer.lotNumber || "-"}: ${selectedAuctionPlayer.player.name} (${selectedAuctionPlayer.player.position}) is now on the block! Base price: ${selectedAuctionPlayer.basePrice}.`,
          payload: {
            auctionPlayerId: selectedAuctionPlayer.id,
            playerName: selectedAuctionPlayer.player.name,
            position: selectedAuctionPlayer.player.position,
            basePrice: selectedAuctionPlayer.basePrice,
          },
          createdById: user.id,
        },
      }),
    ]);

    // Broadcast Realtime Event
    await broadcastAuctionEvent(roomCode, "PLAYER_CALLED", {
      auctionPlayer: updatedLot,
      currentBid: updatedAuction.currentBid,
      highestBidder: null,
      timerEndsAt: null,
    });

    return NextResponse.json({
      success: true,
      auctionPlayer: updatedLot,
      currentBid: updatedAuction.currentBid,
    });
  } catch (error: unknown) {
    console.error("Select player error:", error);
    const message = error instanceof Error ? error.message : "Failed to select player";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

