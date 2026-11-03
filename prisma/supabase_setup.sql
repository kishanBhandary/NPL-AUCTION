-- ==============================================================================
-- SUPABASE REALTIME & ROW LEVEL SECURITY (RLS) SETUP
-- Volleyball Live Auction Management System
-- ==============================================================================

-- 1. Enable Full Replica Identity so Supabase Realtime broadcasts complete row payloads on UPDATE/DELETE
ALTER TABLE IF EXISTS "auction_rooms" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "room_memberships" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "teams" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "players" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "auctions" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "auction_players" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "bids" REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS "auction_events" REPLICA IDENTITY FULL;

-- 2. Add Tables to Supabase Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "auction_rooms", "room_memberships", "teams", "players", "auctions", "auction_players", "bids", "auction_events";
  END IF;
END $$;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auction_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auctions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auction_players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bids" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auction_events" ENABLE ROW LEVEL SECURITY;

-- 4. RLS Read Policies (Participants and viewers can read room context)
CREATE POLICY "Allow public/authenticated read for users"
  ON "users" FOR SELECT
  USING (true);

CREATE POLICY "Allow public/authenticated read for auction_rooms"
  ON "auction_rooms" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for room_memberships"
  ON "room_memberships" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for teams"
  ON "teams" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for players"
  ON "players" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for auctions"
  ON "auctions" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for auction_players"
  ON "auction_players" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for bids"
  ON "bids" FOR SELECT
  USING (true);

CREATE POLICY "Allow read for auction_events"
  ON "auction_events" FOR SELECT
  USING (true);

-- 5. Service Role Bypass
-- Note: Next.js API server routes interact with the database using the Prisma client / server connection string,
-- which operates with service privileges to enforce atomic concurrency locks and business constraints.

