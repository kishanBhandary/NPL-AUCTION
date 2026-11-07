import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        players: {
          select: { id: true, name: true, photoUrl: true, position: true },
        },
        teams: {
          include: {
            owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
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
                bids: {
                  orderBy: { amount: "desc" },
                  take: 1,
                },
              },
              orderBy: { soldAt: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
        auctions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            auctionPlayers: {
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
            bids: {
              include: {
                team: { select: { id: true, name: true, code: true, color: true } },
                bidder: { select: { id: true, name: true } },
              },
              orderBy: { timestamp: "desc" },
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Auction room not found" }, { status: 404 });
    }

    const auction = room.auctions[0];
    const allRoster = auction?.auctionPlayers || [];

    const soldRoster = allRoster.filter((p) => p.status === "SOLD");
    const unsoldRoster = allRoster.filter((p) => p.status === "UNSOLD");
    const upcomingRoster = allRoster.filter((p) => p.status === "UPCOMING" || p.status === "IN_AUCTION");

    // Position breakdown
    const positionStats: Record<string, { total: number; sold: number; unsold: number; totalSpent: number }> = {
      ATTACKER: { total: 0, sold: 0, unsold: 0, totalSpent: 0 },
      SETTER: { total: 0, sold: 0, unsold: 0, totalSpent: 0 },
      LIBERO: { total: 0, sold: 0, unsold: 0, totalSpent: 0 },
      DEFENDER: { total: 0, sold: 0, unsold: 0, totalSpent: 0 },
      ALL_ROUNDER: { total: 0, sold: 0, unsold: 0, totalSpent: 0 },
    };

    allRoster.forEach((item) => {
      const pos = item.player.position;
      if (positionStats[pos]) {
        positionStats[pos].total += 1;
        if (item.status === "SOLD") {
          positionStats[pos].sold += 1;
          positionStats[pos].totalSpent += item.finalPrice || 0;
        } else if (item.status === "UNSOLD") {
          positionStats[pos].unsold += 1;
        }
      }
    });

    // Team summary
    const teamSummaries = room.teams.map((team) => {
      const spent = team.totalPurse - team.remainingPurse;
      return {
        id: team.id,
        name: team.name,
        code: team.code,
        logoUrl: team.logoUrl,
        color: team.color,
        owner: team.owner,
        totalPurse: team.totalPurse,
        remainingPurse: team.remainingPurse,
        totalSpent: spent,
        mainPlayerName: team.mainPlayerName,
        mainPlayerPosition: team.mainPlayerPosition,
        mainPlayerPhotoUrl: team.mainPlayerPhotoUrl,
        squadCount: team.squad.length + (team.mainPlayerName ? 1 : 0),
        squad: team.squad.map((s) => ({
          auctionPlayerId: s.id,
          playerId: s.player.id,
          name: s.player.name,
          photoUrl: s.player.photoUrl,
          position: s.player.position,
          basePrice: s.basePrice,
          finalPrice: s.finalPrice,
          soldAt: s.soldAt,
        })),
      };
    });

    // Unassigned / unsold players (pool players not in any team)
    const assignedPlayerIds = new Set(
      allRoster.filter((ap) => ap.winningTeamId).map((ap) => ap.playerId)
    );
    const unassignedPlayers = (room.players || [])
      .filter((p) => !assignedPlayerIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photoUrl,
        position: p.position,
      }));

    // Top buys
    const topBuys = [...soldRoster]
      .sort((a, b) => (b.finalPrice || 0) - (a.finalPrice || 0))
      .slice(0, 5);

    return NextResponse.json({
      room: {
        id: room.id,
        title: room.title,
        roomCode: room.roomCode,
        status: room.status,
        owner: room.owner,
        startingPurse: room.startingPurse,
        minBasePrice: room.minBasePrice,
        defaultBidIncrement: room.defaultBidIncrement,
      },
      stats: {
        totalPlayers: allRoster.length,
        soldCount: soldRoster.length,
        unsoldCount: unsoldRoster.length,
        upcomingCount: upcomingRoster.length,
        unassignedCount: unassignedPlayers.length,
        totalMoneySpent: soldRoster.reduce((sum, p) => sum + (p.finalPrice || 0), 0),
        totalPurseAllTeams: room.teams.reduce((sum, t) => sum + t.totalPurse, 0),
        totalRemainingPurseAllTeams: room.teams.reduce((sum, t) => sum + t.remainingPurse, 0),
        positionStats,
      },
      teamSummaries,
      unassignedPlayers,
      availableTeams: room.teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        remainingPurse: t.remainingPurse,
      })),
      topBuys,
      history: room.events,
    });
  } catch (error: unknown) {
    console.error("Results fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch auction results";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
