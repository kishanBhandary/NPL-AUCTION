import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  console.log("Seeding Narayana Guru Premiere League (NPL)...");

  // 1. Create Auctioneer
  const auctioneer = await prisma.user.upsert({
    where: { email: "auctioneer@npl.com" },
    update: {},
    create: {
      name: "NPL Official Auctioneer",
      email: "auctioneer@npl.com",
      role: "AUCTIONEER",
    },
  });

  // 2. Create Narayana Guru Premiere League Room (Budget 5000, Base 50, Increment 50)
  const room = await prisma.auctionRoom.upsert({
    where: { roomCode: "NPL-2026" },
    update: {
      startingPurse: 5000,
      minBasePrice: 50,
      defaultBidIncrement: 50,
    },
    create: {
      title: "Narayana Guru Premiere League",
      description: "Official live player auction for Narayana Guru Premiere League 2026.",
      roomCode: "NPL-2026",
      ownerId: auctioneer.id,
      startingPurse: 5000, // ₹5,000 budget per franchise
      minBasePrice: 50,    // ₹50 base prize
      defaultBidIncrement: 50, // ₹50 bid increment
      timerDuration: 30,
      minSquadSize: 6,
      maxSquadSize: 14,
      status: "WAITING",
      memberships: {
        create: {
          userId: auctioneer.id,
          role: "AUCTIONEER",
          isReady: true,
        },
      },
      auctions: {
        create: {
          status: "SCHEDULED",
          timerSeconds: 30,
          currentBid: 50,
        },
      },
    },
    include: {
      auctions: true,
    },
  });

  // 3. Create NPL Franchises with ₹5,000 budget
  const teamsData = [
    { name: "NPL Royal Strikers", code: "NRS", owner: "owner1@npl.com", ownerName: "Rajesh Pillai", color: "#3B82F6" },
    { name: "Guru Smashers", code: "GSM", owner: "owner2@npl.com", ownerName: "Sujith Kumar", color: "#EF4444" },
    { name: "Malabar Warriors", code: "MBW", owner: "owner3@npl.com", ownerName: "Nidheesh Mohan", color: "#10B981" },
    { name: "Coastal Spikers", code: "CSP", owner: "owner4@npl.com", ownerName: "Vineeth Babu", color: "#F59E0B" },
  ];

  for (const t of teamsData) {
    const teamUser = await prisma.user.upsert({
      where: { email: t.owner },
      update: {},
      create: {
        name: t.ownerName,
        email: t.owner,
        role: "TEAM_OWNER",
      },
    });

    const existingTeam = await prisma.team.findFirst({
      where: { roomId: room.id, name: t.name },
    });

    if (!existingTeam) {
      await prisma.team.create({
        data: {
          roomId: room.id,
          ownerId: teamUser.id,
          name: t.name,
          code: t.code,
          color: t.color,
          totalPurse: 5000,
          remainingPurse: 5000,
          isReady: true,
        },
      });

      await prisma.roomMembership.upsert({
        where: { roomId_userId: { roomId: room.id, userId: teamUser.id } },
        update: {},
        create: {
          roomId: room.id,
          userId: teamUser.id,
          role: "TEAM_OWNER",
          isReady: true,
        },
      });
    } else {
      await prisma.team.update({
        where: { id: existingTeam.id },
        data: {
          totalPurse: 5000,
          remainingPurse: 5000,
        },
      });
    }
  }

  // 4. Create Players with ONLY name, photoUrl, position
  const playersData = [
    {
      name: "Sanju Varma",
      position: "ATTACKER" as const,
      photoUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Arjun Nair",
      position: "SETTER" as const,
      photoUrl: "https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Pranav Kumar",
      position: "LIBERO" as const,
      photoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Gokul Das",
      position: "DEFENDER" as const,
      photoUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Vivek Menon",
      position: "ALL_ROUNDER" as const,
      photoUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Rahul Chandran",
      position: "ATTACKER" as const,
      photoUrl: "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Kiran Prasad",
      position: "DEFENDER" as const,
      photoUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=80",
    },
    {
      name: "Anoop Raj",
      position: "SETTER" as const,
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    },
  ];

  const auction = room.auctions[0];

  for (let i = 0; i < playersData.length; i++) {
    const p = playersData[i];
    const existingPlayer = await prisma.player.findFirst({
      where: { roomId: room.id, name: p.name },
    });

    let player = existingPlayer;
    if (!player) {
      player = await prisma.player.create({
        data: {
          roomId: room.id,
          name: p.name,
          position: p.position,
          photoUrl: p.photoUrl,
        },
      });
    }

    if (auction) {
      const existingAuctionPlayer = await prisma.auctionPlayer.findUnique({
        where: { auctionId_playerId: { auctionId: auction.id, playerId: player.id } },
      });
      if (!existingAuctionPlayer) {
        await prisma.auctionPlayer.create({
          data: {
            auctionId: auction.id,
            playerId: player.id,
            status: "UPCOMING",
            basePrice: 50,
            lotNumber: i + 1,
          },
        });
      }
    }
  }

  console.log("Seeding complete! Narayana Guru Premiere League room code: NPL-2026");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
