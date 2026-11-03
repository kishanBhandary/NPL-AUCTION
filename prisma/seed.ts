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
