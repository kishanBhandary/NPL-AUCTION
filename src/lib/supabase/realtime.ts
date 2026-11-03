import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverSupabase: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  if (!serverSupabase) {
    serverSupabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverSupabase;
}

export async function broadcastAuctionEvent(roomCode: string, eventName: string, payload: Record<string, unknown>) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return;

    const channel = supabase.channel(`auction_${roomCode}`);
    await channel.send({
      type: "broadcast",
      event: eventName,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Realtime broadcast error:", err);
  }
}

