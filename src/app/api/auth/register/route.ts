import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role = "AUCTIONEER" } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Password is mandatory (at least 4 characters)" }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Check existing user
    let user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    const hashedPassword = hashPassword(password);

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: trimmedEmail,
          password: hashedPassword,
          role: role === "TEAM_OWNER" ? "TEAM_OWNER" : "AUCTIONEER",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name.trim(),
          password: hashedPassword,
        },
      });
    }

    await setSessionUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("Auth register error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
