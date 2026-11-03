# VOLLEYBID LIVE: VOLLEYBALL LIVE AUCTION MANAGEMENT SYSTEM

A production-ready, full-stack real-time Volleyball Player Auction Management Platform built from scratch with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase Authentication & Realtime**, **Supabase PostgreSQL**, **Prisma ORM**, and **Cloudinary** media storage.

---

## 🏐 System Overview

VolleyBid Live empowers volleyball leagues, tournament organizers, and sports clubs to execute high-stakes live auctions. It supports multi-device synchronized bidding, strict financial solvency checks, real-time audio-visual cues, and tournament squad rosters.

---

## 📁 1. Project Folder Structure

```
auction/
├── prisma/
│   ├── schema.prisma                       # Complete database models & relations
│   ├── seed.ts                             # Automated tournament & roster seeder
│   ├── supabase_setup.sql                  # Supabase Realtime publication & RLS script
│   └── migrations/
│       └── 20261102000000_init/
│           └── migration.sql               # Pure PostgreSQL initial DDL migration
├── src/
│   ├── app/
│   │   ├── globals.css                     # Dark arena theme, glows, animations
│   │   ├── layout.tsx                      # Root layout & sports styling
│   │   ├── page.tsx                        # Live landing page with code entry
│   │   ├── auth/
│   │   │   ├── login/page.tsx              # Role-aware login
│   │   │   └── register/page.tsx           # Auctioneer registration
│   │   ├── room/
│   │   │   ├── create/page.tsx             # Tournament room creator
│   │   │   └── [code]/
│   │   │       ├── join/page.tsx           # Team owner franchise registration
│   │   │       ├── waiting/page.tsx        # Realtime waiting room & launch pad
│   │   │       ├── live/page.tsx           # Center live auction arena
│   │   │       ├── players/page.tsx        # Player registration & talent roster
│   │   │       └── results/page.tsx        # Official final results dashboard
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── register/route.ts
│   │       │   └── me/route.ts
│   │       ├── rooms/
│   │       │   ├── route.ts                # Create & list rooms
│   │       │   └── [code]/
│   │       │       ├── route.ts            # Fetch room details
│   │       │       ├── status/route.ts     # Launch auction & state machine
│   │       │       ├── join/route.ts       # Franchise registration
│   │       │       ├── ready/route.ts      # Toggle franchise readiness
│   │       │       └── results/route.ts    # Comprehensive results summary
│   │       ├── players/
│   │       │   └── route.ts                # Register player & list roster
│   │       ├── upload/
│   │       │   └── route.ts                # Cloudinary image uploader
│   │       └── auction/
│   │           └── [code]/
│   │               ├── state/route.ts      # Live auction state snapshot
│   │               ├── select-player/route.ts # Random player podium call
│   │               ├── start-bidding/route.ts # Timer countdown start
│   │               ├── bid/route.ts        # ACID concurrent bid transaction
│   │               ├── sold/route.ts       # Gavel strike, purse deduction, squad update
│   │               ├── unsold/route.ts     # Mark player unsold
│   │               └── reset-timer/route.ts# Reset/extend timer
│   ├── components/
│   │   ├── Navbar.tsx                      # Top bar with room indicator & user badge
│   │   ├── PlayerCard.tsx                  # Center player showcase & athletic stats
│   │   ├── TeamCard.tsx                    # Franchise card with purse progress
│   │   ├── LiveTimer.tsx                   # Circular audio-visual countdown clock
│   │   ├── BidControls.tsx                 # Fast +₹10k/+₹25k/+₹50k bidding buttons
│   │   ├── BidHistory.tsx                  # Live bid stream ticker
│   │   ├── WaitingRoomRoster.tsx           # Franchise readiness grid & launch action
│   │   ├── ConfettiBlast.tsx               # Celebratory fireworks on SOLD
│   │   └── SoundEffects.tsx                # Web Audio synthesizer for gavels & beeps
│   ├── lib/
│   │   ├── prisma.ts                       # Singleton Prisma client
│   │   ├── auth.ts                         # Role authorization & session tokens
│   │   ├── cloudinary.ts                   # Cloudinary upload client
│   │   ├── utils.ts                        # Currency format, room codes, position badges
│   │   └── supabase/
│   │       ├── client.ts                   # Supabase browser client
│   │       └── realtime.ts                 # Realtime broadcaster
│   └── types/
│       └── index.ts                        # Complete TypeScript interfaces & DTOs
├── .env.example                            # Environment variables documentation
└── next.config.ts                          # Next.js & Turbopack configuration
```

---

## ⚡ 2. Complete Workflow

### 1. Auctioneer Authentication
- Register as an Auctioneer (`/auth/register`) or sign in (`/auth/login`).
- Session stored in HTTP-only secure cookie, giving access to auction orchestration controls.

### 2. Create Auction Room
- Auctioneers create a tournament room (`/room/create`).
- Configure starting purse (e.g. ₹1,00,00,000), minimum base price (e.g. ₹50,000), default bid increment (e.g. ₹10,000), bid timer (e.g. 30s), and squad caps (min 6, max 14).
- Generates a unique room code (e.g., `VB-PREMIER`).

### 3. Team Owner Registration
- Team owners join via the direct room URL (`/room/[code]/join`) or enter the room code.
- Provide Team Name, Team Crest (uploaded to Cloudinary), Owner Name, Email, and Team Color.
- Each team is bound to the room with the full configured starting purse.

### 4. Player Registration
- Access the player management tab (`/room/[code]/players`).
- Register players with Photo (Cloudinary), Volleyball Position (**Attacker**, **Setter**, **Libero**, **Defender**, **All-Rounder**), Base Price, Jersey #, and Athletic Metrics (**Spike Reach**, **Block Reach**).
- Includes an **"Auto-Seed Volleyball Stars"** button for instantaneous demo testing.

### 5. Waiting Room
- Accessible at `/room/[code]/waiting`.
- Real-time updates as franchises join.
- Team owners toggle readiness (`Mark as Ready`).
- Displays live team count, ready count, and registered player count.

### 6. Launch Auction
- The Auctioneer clicks **"Launch Live Auction"**.
- The server validates that players are registered, updates the room status to `LIVE`, and activates the auction roster.
- Broadcasts `AUCTION_LAUNCHED` via Supabase Realtime so **every connected participant's browser navigates simultaneously to `/room/[code]/live`**.

### 7. Live Auction Arena
- Professional dark stadium dashboard.
- Left sidebar: All participating franchises with real-time remaining purse meters and squad capacities.
- Center stage: Spotlight Player Card with high-res photo, position badge, athletic reach stats, and current highest bid.
- Live circular countdown clock with color transitions and audio warnings.
- Right sidebar: Live bid stream showing every bid in chronological order.

### 8. Random Player Selection
- The Auctioneer clicks **"Call Random Player"**.
- The server selects an unauctioned player (`UPCOMING`), sets their status to `IN_AUCTION`, resets current bid to base price, and broadcasts `PLAYER_CALLED` to all screens.

### 9. Bidding
- The Auctioneer hits **"Start Bidding Timer"**.
- Team Owners submit bids via quick increment buttons (`+₹10,000`, `+₹25,000`, `+₹50,000`, `+₹1,00,000`) or custom amounts.
- **Server Validations**:
  - Re-evaluates current bid within an ACID transaction to prevent race conditions.
  - Rejects bids exceeding the franchise's remaining purse.
  - Enforces minimum purse reserve to satisfy the minimum squad requirement (`minSquadSize * minBasePrice`).
  - Rejects a franchise bidding against itself if already the highest bidder.
  - Automatically resets the countdown timer on every valid bid.
  - Broadcasts `BID_PLACED` to all connected screens with audio chime.

### 10. Sold / Unsold
- **SOLD**:
  - The Auctioneer clicks **"SOLD (Gavel)"**.
  - Server assigns the player to the winning franchise squad, decrements the winning bid from the franchise purse, marks the bid winning, and records the sale in the history log.
  - Plays the gavel strike audio cue and fires a multi-color celebratory confetti explosion across the screen.
- **UNSOLD**:
  - If no bids are placed, the Auctioneer clicks **"UNSOLD"**.
  - Player status transitions to `UNSOLD` and the auction block clears for the next lot.

### 11. Final Auction Results
- Detailed post-auction dashboard (`/room/[code]/results`).
- Complete squads for each franchise, prices paid, purse spent vs. remaining.
- Top auction signings leaderboard.
- Breakdown by position and full auction event timeline.

---

## 🗄️ 3. Database Schema (Prisma)

The system includes 9 relational models:
1. `User`: Role-based authentication (`AUCTIONEER`, `TEAM_OWNER`, `VIEWER`).
2. `AuctionRoom`: Tournament room with configurations (purse, increments, timers, squad limits).
3. `RoomMembership`: Association between users and rooms with readiness tracking.
4. `Team`: Franchises with `totalPurse` and `remainingPurse`.
5. `Player`: Master volleyball athlete profile with volleyball positions and reach stats.
6. `Auction`: Live auction session state (`currentBid`, `currentHighestBidderId`, `timerEndsAt`).
7. `AuctionPlayer`: Lot roster item with statuses (`UPCOMING`, `IN_AUCTION`, `SOLD`, `UNSOLD`).
8. `Bid`: Every placed bid with timestamp and winning flag.
9. `AuctionEvent`: Audit log of all live events.

---

## ⚙️ 4. Environment Variables (`.env`)

Copy `.env.example` to `.env`:

```bash
# Supabase PostgreSQL connection pooling URL
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct URL for migrations (Port 5432)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase Auth & Realtime
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cloudinary Storage
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🚀 5. Database Setup & Seeding

1. **Push Prisma Schema to Supabase**:
   ```bash
   npx prisma db push
   ```

2. **Enable Supabase Realtime & RLS**:
   In the Supabase SQL Editor, run `prisma/supabase_setup.sql` to enable replication and realtime publication on the tables:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE "auction_rooms", "room_memberships", "teams", "players", "auctions", "auction_players", "bids", "auction_events";
   ```

3. **Seed Sample Tournament Data**:
   ```bash
   npx tsx prisma/seed.ts
   ```
   *Creates the room `VB-PREMIER`, 4 franchises, and 6 pro volleyball stars (Yuji Nishida, Micah Christenson, Wilfredo Leon, Robertlandy Simon, etc.).*

---

## 🧪 6. Testing Instructions

### Scenario A: Testing with the Pre-Seeded Tournament
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser.
3. In the "Enter Room Code" input, enter `VB-PREMIER` and click **Join**.
4. You will see the waiting room with 4 ready franchises (`Thunder Spikers`, `Phoenix Blockers`, `Viper Aces`, `Apex Smashers`) and 6 star players.
5. Sign in as Auctioneer (`auctioneer@volleyball.com`) via `/auth/login`.
6. Click **Launch Live Auction** in the waiting room.
7. Click **Call Random Player** on the podium.
8. Click **Start Bidding Timer**.
9. In a second browser window / incognito window, open `http://localhost:3000/room/VB-PREMIER/join` to register a team or bid from an existing team.
10. Place bids and observe real-time updates, countdown resets, audio cues, and the celebratory confetti when clicking **SOLD (Gavel)**!

### Scenario B: Creating a Fresh Tournament from Scratch
1. Navigate to `/auth/register` to register your Auctioneer name and email.
2. Click **Create Auction Room** (`/room/create`), set starting purse and timer rules.
3. Navigate to **Roster & Players** (`/room/[code]/players`), click **Auto-Seed Volleyball Stars** or register custom players with photo uploads.
4. Share the invite link with franchise owners (`/room/[code]/join`).
5. Open multiple browser tabs (one Auctioneer, multiple Team Owners).
6. Toggle team readiness and launch the live draft!

---

## 🚢 7. Deployment Instructions

### Vercel / Cloud Run
1. Push the code to your GitHub repository.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Root Directory to `auction` (or root if relocated).
4. Add the environment variables from your `.env`:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Click **Deploy**. The build will run `next build` with Turbopack and deploy with zero warnings.
# NPL-AUCTION
