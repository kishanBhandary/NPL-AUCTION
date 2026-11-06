import { NextResponse } from "next/server";
import { getSessionUser, clearSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json(
      { user },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

