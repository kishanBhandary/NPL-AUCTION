import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SessionUser, UserRole } from "@/types";

const SESSION_COOKIE = "vb_session_token";

// In-memory cache for user sessions to eliminate redundant remote DB roundtrips
interface CachedSession {
  user: SessionUser;
  expiresAt: number;
}

const globalForAuth = globalThis as unknown as {
  sessionCache?: Map<string, CachedSession>;
};

if (!globalForAuth.sessionCache) {
  globalForAuth.sessionCache = new Map<string, CachedSession>();
}

const sessionCache = globalForAuth.sessionCache;

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    // Decode token: stores userId or json representation
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (!decoded?.id) return null;

    // Return from fast memory cache if still fresh (< 20 seconds)
    const cached = sessionCache.get(decoded.id);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.user;
    }

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

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      avatarUrl: user.avatarUrl,
      teamId: user.teams[0]?.id || null,
      roomId: user.teams[0]?.roomId || null,
    };

    // Cache for 20 seconds
    sessionCache.set(decoded.id, {
      user: sessionUser,
      expiresAt: Date.now() + 20_000,
    });

    return sessionUser;
  } catch {
    return null;
  }
}

export async function setSessionUser(user: { id: string; email: string; name: string; role: string }) {
  const cookieStore = await cookies();
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role })).toString("base64");
  
  // Invalidate any stale cache entry
  sessionCache.delete(user.id);

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
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      if (decoded?.id) {
        sessionCache.delete(decoded.id);
      }
    } catch {}
  }
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

