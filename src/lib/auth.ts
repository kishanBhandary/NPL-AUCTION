import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SessionUser, UserRole } from "@/types";

const SESSION_COOKIE = "vb_session_token";

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    // Decode token: stores userId or json representation
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (!decoded?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        teams: {
          select: { id: true, roomId: true },
          take: 1,
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      avatarUrl: user.avatarUrl,
      teamId: user.teams[0]?.id || null,
      roomId: user.teams[0]?.roomId || null,
    };
  } catch {
    return null;
  }
}

export async function setSessionUser(user: { id: string; email: string; name: string; role: string }) {
  const cookieStore = await cookies();
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role })).toString("base64");
  
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAuctioneer(roomId: string, userId: string) {
  const room = await prisma.auctionRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  });
  if (!room || room.ownerId !== userId) {
    throw new Error("Unauthorized: Only the auctioneer can perform this action");
  }
  return true;
}

export async function requireTeamOwner(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true, roomId: true },
  });
  if (!team || team.ownerId !== userId) {
    throw new Error("Unauthorized: Only the team owner can perform this action");
  }
  return team;
}

