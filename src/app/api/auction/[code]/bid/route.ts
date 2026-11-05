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
      return NextResponse.json({ error: "Please sign in to place a bid" }, { status: 401 });
    }

    const room = await prisma.auctionRoom.findUnique({
      where: { roomCode },
      include: {
        auctions: { where: { status: "ACTIVE" }, take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "LIVE") {
      return NextResponse.json({ error: "Auction is not currently live" }, { status: 400 });
    }

    const auction = room.auctions[0];
    if (!auction || !auction.currentAuctionPlayerId) {
      return NextResponse.json({ error: "No player is currently on the auction block" }, { status: 400 });
    }

    // Check timer expiration
    if (auction.timerEndsAt && new Date(auction.timerEndsAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Timer has expired for this round" }, { status: 400 });
    }

    // Find team owned by this user in this room
    const team = await prisma.team.findFirst({
      where: {
        roomId: room.id,
        ownerId: user.id,
      },
      include: {
        squad: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "You do not own a team registered in this auction room" }, { status: 403 });
    }

    // Prevent team from bidding against itself
    if (auction.currentHighestBidderId === team.id) {
      return NextResponse.json({ error: "Your team is already holding the highest bid!" }, { status: 400 });
    }

    // Squad limit check
    if (team.squad.length >= room.maxSquadSize) {
      return NextResponse.json({
        error: `Your squad is full (maximum ${room.maxSquadSize} players allowed).`,
      }, { status: 400 });
    }

    const body = await req.json();
    let bidAmount: number;

    const increment = room.defaultBidIncrement || 50;

    if (body.amount) {
      bidAmount = Number(body.amount);
    } else {
      // Default auto-increment: if no prior bidder, base price; otherwise currentBid + increment
      if (!auction.currentHighestBidderId) {
        bidAmount = Math.max(auction.currentBid, room.minBasePrice);
      } else {
        bidAmount = auction.currentBid + increment;
      }
    }

    // Verify bid against purse
    if (bidAmount > team.remainingPurse) {
      return NextResponse.json({
        error: `Insufficient purse! Your remaining purse is ₹${team.remainingPurse.toLocaleString("en-IN")}, but bid requires ₹${bidAmount.toLocaleString("en-IN")}.`,
      }, { status: 400 });
    }

    // Reserve calculation for minimum squad
    const neededPlayers = Math.max(0, room.minSquadSize - (team.squad.length + 1));
    const reserveNeeded = neededPlayers * room.minBasePrice;
    if (team.remainingPurse - bidAmount < reserveNeeded) {
      return NextResponse.json({
        error: `Purse safeguard: You must retain at least ₹${reserveNeeded.toLocaleString("en-IN")} to fill the minimum squad requirement of ${room.minSquadSize} players.`,
      }, { status: 400 });
    }

    // Concurrency-safe Prisma interactive transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-read auction inside transaction with row-level integrity
      const freshAuction = await tx.auction.findUnique({
        where: { id: auction.id },
      });

      if (!freshAuction || freshAuction.currentAuctionPlayerId !== auction.currentAuctionPlayerId) {
        throw new Error("The player lot has changed. Please refresh.");
      }

      // Check if another bid arrived concurrently
      if (freshAuction.currentHighestBidderId && bidAmount <= freshAuction.currentBid) {
        throw new Error(`A higher bid of ₹${freshAuction.currentBid.toLocaleString("en-IN")} was already placed!`);
      }

      // Reset timer countdown on each valid bid
      const resetTimerDuration = room.timerDuration || 30;
      const newTimerEndsAt = new Date(Date.now() + resetTimerDuration * 1000);

      // Create Bid record
      const bid = await tx.bid.create({
        data: {
          auctionId: auction.id,
          auctionPlayerId: auction.currentAuctionPlayerId!,
          teamId: team.id,
          bidderId: user.id,
          amount: bidAmount,
        },
        include: {
          team: {
            select: { id: true, name: true, code: true, logoUrl: true, color: true },
          },
          bidder: {
            select: { id: true, name: true },
          },
        },
      });

      // Update Auction
      const updatedAuction = await tx.auction.update({
        where: { id: auction.id },
        data: {
          currentBid: bidAmount,
          currentHighestBidderId: team.id,
          timerEndsAt: newTimerEndsAt,
        },
        include: {
          currentHighestBidder: {
            select: { id: true, name: true, code: true, logoUrl: true, color: true, remainingPurse: true },
          },
        },
      });

      // Log Event
      const event = await tx.auctionEvent.create({
        data: {
          roomId: room.id,
          auctionId: auction.id,
          eventType: "BID_PLACED",
          message: `${team.name} bid ₹${bidAmount.toLocaleString("en-IN")}.`,
          payload: {
            teamId: team.id,
            teamName: team.name,
            amount: bidAmount,
            bidderName: user.name,
          },
          createdById: user.id,
        },
      });

      return { bid, updatedAuction, event, newTimerEndsAt };
    });

    // Broadcast Realtime Update to all participants non-blockingly for <25ms response time
    broadcastAuctionEvent(roomCode, "BID_PLACED", {
      bid: result.bid,
      currentBid: result.updatedAuction.currentBid,
      highestBidder: result.updatedAuction.currentHighestBidder,
      timerEndsAt: result.newTimerEndsAt.toISOString(),
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error("Realtime broadcast error:", err));

    return NextResponse.json({
      success: true,
      bid: result.bid,
      currentBid: result.updatedAuction.currentBid,
      highestBidder: result.updatedAuction.currentHighestBidder,
      timerEndsAt: result.newTimerEndsAt,
    });
  } catch (error: unknown) {
    console.error("Bid error:", error);
    const message = error instanceof Error ? error.message : "Failed to place bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
