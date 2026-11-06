import { EventEmitter } from "events";

// Global singleton event emitter across hot-reloads and requests
const globalForAuction = globalThis as unknown as {
  auctionEmitter?: EventEmitter;
};

export const auctionEmitter = globalForAuction.auctionEmitter || new EventEmitter();
auctionEmitter.setMaxListeners(500);
globalForAuction.auctionEmitter = auctionEmitter;

export interface AuctionRealtimePayload {
  roomCode: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function emitLocalAuctionEvent(
  roomCode: string,
  event: string,
  data: Record<string, unknown>
) {
  const payload: AuctionRealtimePayload = {
    roomCode: roomCode.toUpperCase().trim(),
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  auctionEmitter.emit(`room:${payload.roomCode}`, payload);
}

