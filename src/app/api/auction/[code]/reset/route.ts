import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireAuctioneer } from "@/lib/auth";
import { broadcastAuctionEvent } from "@/lib/supabase/realtime";
import { resetAuctionEntirelyInMemory, clearAuctionMemoryState, setAuctionMemoryState } from "@/lib/auctionStore";

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
        auctions: { take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await requireAuctioneer(room.id, user.id);

    const body = await req.json().catch(() => ({}));
    const { mode } = body;
    // mode: "reset_live" (reset all lots & purses, restart in LIVE arena)
    // mode: "reset_waiting" (reset all lots & purses, return room to WAITING room)
    // mode: "close_completed" (close arena, mark COMPLETED, redirect to results)

    const auction = room.auctions[0];

    if (mode === "close_completed") {
      if (auction) {
        await prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: "CONCLUDED",
            endedAt: new Date(),
            currentAuctionPlayerId: null,
            timerEndsAt: null,
          },
        });
      }

      await prisma.auctionRoom.update({
        where: { id: room.id },
        data: { status: "COMPLETED" },
      });

      clearAuctionMemoryState(roomCode);

      await prisma.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: auction?.id || null,
          eventType: "ROOM_STATUS_CHANGED",
          message: "Auction arena closed by Auctioneer.",
          payload: { status: "COMPLETED" },
          createdById: user.id,
        },
      });

      await broadcastAuctionEvent(roomCode, "ROOM_STATUS_CHANGED", {
        status: "COMPLETED",
        roomCode,
        roomId: room.id,
        redirectUrl: `/room/${roomCode}/results`,
      });

      return NextResponse.json({
        success: true,
        message: "Arena closed. Results ready.",
        status: "COMPLETED",
        redirectUrl: `/room/${roomCode}/results`,
      });
    }

    if (mode === "re-auction-unsold") {
      let targetAuction = auction;
      if (!targetAuction) {
        targetAuction = await prisma.auction.create({
          data: {
            roomId: room.id,
            status: "ACTIVE",
            startedAt: new Date(),
            currentBid: room.minBasePrice || 50,
          },
        });
      }

      // 1. Move all UNSOLD auction players back to UPCOMING
      const updatedLots = await prisma.auctionPlayer.updateMany({
        where: {
          auctionId: targetAuction.id,
          status: "UNSOLD",
        },
        data: {
          status: "UPCOMING",
          finalPrice: null,
          winningTeamId: null,
          soldAt: null,
        },
      });

      // 2. Also check if there are any room players not yet in auctionPlayer roster
      const existingRoster = await prisma.auctionPlayer.findMany({
        where: { auctionId: targetAuction.id },
        select: { playerId: true },
      });
      const existingPlayerIds = new Set(existingRoster.map((r) => r.playerId));
      const roomPlayers = await prisma.player.findMany({
        where: { roomId: room.id },
      });
      const missingPlayers = roomPlayers.filter((p) => !existingPlayerIds.has(p.id));
      if (missingPlayers.length > 0) {
        let lotCounter = existingRoster.length + 1;
        await prisma.auctionPlayer.createMany({
          data: missingPlayers.map((player) => ({
            auctionId: targetAuction.id,
            playerId: player.id,
            status: "UPCOMING",
            basePrice: room.minBasePrice || 50,
            lotNumber: lotCounter++,
          })),
        });
      }

      // 3. Update auction record
      await prisma.auction.update({
        where: { id: targetAuction.id },
        data: {
          status: "ACTIVE",
          currentAuctionPlayerId: null,
          currentBid: room.minBasePrice || 50,
          currentHighestBidderId: null,
          timerEndsAt: null,
          startedAt: targetAuction.startedAt || new Date(),
          endedAt: null,
        },
      });

      // 4. Update room status to LIVE
      await prisma.auctionRoom.update({
        where: { id: room.id },
        data: { status: "LIVE" },
      });

      // 5. Reset memory store for live room
      setAuctionMemoryState(roomCode, {
        roomCode,
        status: "LIVE",
        currentAuctionPlayerId: null,
        currentAuctionPlayer: null,
        currentBid: room.minBasePrice || 50,
        currentHighestBidderId: null,
        currentHighestBidder: null,
        timerEndsAt: null,
        timerSeconds: room.timerDuration || 30,
        latestBids: [],
        lastSoldCelebration: null,
      });

      // 6. Record auction event
      await prisma.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: targetAuction.id,
          eventType: "RE_AUCTION_STARTED",
          message: `Re-auction round initiated by Auctioneer. Unsold players returned to the bidding block.`,
          payload: { unsoldReopenedCount: updatedLots.count },
          createdById: user.id,
        },
      });

      // 7. Broadcast realtime events to bring everyone to Live Arena
      await broadcastAuctionEvent(roomCode, "AUCTION_LAUNCHED", {
        roomCode,
        roomId: room.id,
        reAuction: true,
      });

      await broadcastAuctionEvent(roomCode, "ROOM_STATUS_CHANGED", {
        status: "LIVE",
        roomCode,
        roomId: room.id,
        redirectUrl: `/room/${roomCode}/live`,
      });

      return NextResponse.json({
        success: true,
        message: `Re-auction initiated! Unsold players returned to live bidding pool.`,
        status: "LIVE",
        redirectUrl: `/room/${roomCode}/live`,
      });
    }

    const targetStatus = mode === "reset_waiting" ? "WAITING" : "LIVE";

    if (auction) {
      // 1. Delete all bids
      await prisma.bid.deleteMany({
        where: { auctionId: auction.id },
      });

      // 2. Reset all auction players back to UPCOMING
      await prisma.auctionPlayer.updateMany({
        where: { auctionId: auction.id },
        data: {
          status: "UPCOMING",
          finalPrice: null,
          soldAt: null,
          winningTeamId: null,
        },
      });

      // 3. Reset auction record
      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          status: targetStatus === "LIVE" ? "ACTIVE" : "SCHEDULED",
          currentAuctionPlayerId: null,
          currentBid: room.minBasePrice || 50,
          currentHighestBidderId: null,
          timerEndsAt: null,
          startedAt: targetStatus === "LIVE" ? new Date() : null,
          endedAt: null,
        },
      });
    }

    // 4. Reset team purses to starting purse
    await prisma.team.updateMany({
      where: { roomId: room.id },
      data: {
        remainingPurse: room.startingPurse || 5000,
      },
    });

    // 5. Update room status
    await prisma.auctionRoom.update({
      where: { id: room.id },
      data: { status: targetStatus },
    });

    // 6. Reset in-memory store
    resetAuctionEntirelyInMemory(roomCode, targetStatus);

    // 7. Record event
    await prisma.auctionEvent.create({
      data: {
        roomId: room.id,
        auctionId: auction?.id || null,
        eventType: "AUCTION_RESET",
        message: `Auction has been reset by Auctioneer (${targetStatus}).`,
        payload: { targetStatus },
        createdById: user.id,
      },
    });

    // 8. Broadcast Realtime Events
    await broadcastAuctionEvent(roomCode, "AUCTION_RESET", {
      status: targetStatus,
      roomCode,
      roomId: room.id,
      targetUrl: targetStatus === "WAITING" ? `/room/${roomCode}/waiting` : `/room/${roomCode}/live`,
    });

    await broadcastAuctionEvent(roomCode, "ROOM_STATUS_CHANGED", {
      status: targetStatus,
      roomCode,
      roomId: room.id,
      redirectUrl: targetStatus === "WAITING" ? `/room/${roomCode}/waiting` : undefined,
    });

    return NextResponse.json({
      success: true,
      message:
        targetStatus === "WAITING"
          ? "Auction reset and returned to waiting room."
          : "Auction reset! Ready to start afresh.",
      status: targetStatus,
      redirectUrl: targetStatus === "WAITING" ? `/room/${roomCode}/waiting` : `/room/${roomCode}/live`,
    });
  } catch (error: unknown) {
    console.error("Auction reset error:", error);
    const message = error instanceof Error ? error.message : "Failed to reset auction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

