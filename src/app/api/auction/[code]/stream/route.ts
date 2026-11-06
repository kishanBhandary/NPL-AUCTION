import { NextRequest } from "next/server";
import { auctionEmitter, AuctionRealtimePayload } from "@/lib/auctionEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const roomCode = code.toUpperCase().trim();

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event with anti-buffering padding to flush browser TCP immediately
  const padding = `:${" ".repeat(2048)}\n\n`;
  const initMsg = `event: connected\ndata: ${JSON.stringify({ roomCode, time: Date.now() })}\n\n`;
  await writer.write(encoder.encode(padding + initMsg));

  const onEvent = async (payload: AuctionRealtimePayload) => {
    try {
      const msg = `event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`;
      await writer.write(encoder.encode(msg));
    } catch {
      // Stream may have closed
    }
  };

  const channelName = `room:${roomCode}`;
  auctionEmitter.on(channelName, onEvent);

  // Keep-alive heartbeat every 2.5s (down from 15s) to guarantee zero stream stagnation
  const keepAliveInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`: ping\n\n`));
    } catch {
      clearInterval(keepAliveInterval);
    }
  }, 2500);

  req.signal.addEventListener("abort", () => {
    clearInterval(keepAliveInterval);
    auctionEmitter.off(channelName, onEvent);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
    },
  });
}

