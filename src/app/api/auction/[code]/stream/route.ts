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

  // Send initial connection event
  const initMsg = `event: connected\ndata: ${JSON.stringify({ roomCode, time: Date.now() })}\n\n`;
  await writer.write(encoder.encode(initMsg));

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

  // Keep-alive heartbeat every 15s to keep connections open
  const keepAliveInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`: ping\n\n`));
    } catch {
      clearInterval(keepAliveInterval);
    }
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(keepAliveInterval);
    auctionEmitter.off(channelName, onEvent);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

