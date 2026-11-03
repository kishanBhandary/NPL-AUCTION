import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setSessionUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.username || body.email || "").trim();
    const { password } = body;

    if (!identifier) {
      return NextResponse.json({ error: "Username or Email is required" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is mandatory" }, { status: 400 });
    }

    // Support login via either name/username OR email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier.toLowerCase(), mode: "insensitive" } },
          { name: { equals: identifier, mode: "insensitive" } },
        ],
      },
      include: {
        teams: {
          select: { id: true, roomId: true, name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "No account found with this username or email" }, { status: 404 });
    }

    // If user has a password stored, verify it
    if (user.password) {
      const isValid = verifyPassword(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    await setSessionUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("Auth login error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
