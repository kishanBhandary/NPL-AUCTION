import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role = "AUCTIONEER" } = body;

    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Password is mandatory (at least 4 characters)" }, { status: 400 });
    }

    // If email is not explicitly provided, create an automatic email from username
    const trimmedEmail = email && email.trim()
      ? email.toLowerCase().trim()
      : `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "")}@npl.com`;

    // Check existing user by email or name
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          { name: { equals: trimmedName, mode: "insensitive" } },
        ],
      },
    });

    const hashedPassword = hashPassword(password);

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          password: hashedPassword,
          role: role === "TEAM_OWNER" ? "TEAM_OWNER" : "AUCTIONEER",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: trimmedName,
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
