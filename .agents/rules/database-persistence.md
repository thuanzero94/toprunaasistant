# Database-First Persistence & Cross-Session Synchronization Rule

> **Mandatory Rule:** All domain entities (Events, Categories, Challenge Tiers, Participations, BIBs, Race-Kit Orders, Activities, Splits, Users) MUST be persisted directly to PostgreSQL via Prisma. In-memory data structures are strictly an algorithmic acceleration cache, NEVER the sole storage of truth.

---

## 1. The Single Source of Truth (SSOT) Principle

1. **PostgreSQL (`packages/database`) is the sole authoritative store of truth:**
   - Any state mutation (create, update, delete) MUST write-through directly to PostgreSQL via Prisma.
   - File caches (such as `data/toprun-engine-state.json` or `.strava-activities-cache.json`) serve solely as a local recovery fallback, never as primary storage.

2. **Write-Through Mutation Requirement:**
   - **Events & Rule Config:** Every event created (`createEvent`), updated (`updateEvent`), or deleted (`deleteEvent`) must be written to `prisma.event`, `prisma.eventCategory`, `prisma.eventChallengeTier`, and `prisma.eventTeam`.
   - **Tournament Registrations & Custom BIBs:** When an athlete registers (`registerForEvent`) or modifies their BIB (`updateParticipationBib`), the update must immediately persist to `prisma.eventParticipation` and `prisma.raceKitOrder`.
   - **Tracklogs & Splits:** Strava synced activities (`syncLiveStravaActivities`), GPX uploads (`uploadGpxXml`), and simulated runs (`simulateStravaSync`) must be saved to `prisma.activity` and `prisma.activitySplit`.
   - **Admin Moderation & Fulfillment:** Approving/rejecting tracklogs (`moderateActivity`), toggling visibility (`toggleActivityVisibility`), and updating shipping tracking numbers (`updateRaceKitOrder`) must update `prisma.activity` and `prisma.raceKitOrder`.

---

## 2. Hydration & Bootstrap Lifecycle

1. **Lifecycle Hook Enforcement:**
   - Any engine or background service that holds runtime calculation caches MUST implement the NestJS `OnModuleInit` interface (e.g., `TopRunEngineService implements OnModuleInit`).
2. **OnModuleInit Execution:**
   - `onModuleInit()` must call `syncAndHydrateWithDatabase()`.
   - On server start or container boot, the service loads existing records from PostgreSQL via Prisma (`prisma.event.findMany`, `prisma.activity.findMany`, `prisma.eventParticipation.findMany`, `prisma.user.findMany`).
   - If a fresh database has 0 records, the engine migrates/seeds initial baseline records once to PostgreSQL so that the database is immediately populated and consistent across all nodes.

---

## 3. Cross-Session & Multi-User Identity Parity

1. **User Identity Consistency:**
   - Never rely on isolated or hardcoded in-memory user lists.
   - When a runner registers via `POST /auth/register` or logs in with Google, the record in `prisma.user` is the single identity anchor.
   - The engine cache (`this.users`) must synchronize with `prisma.user.findMany()`, ensuring all newly registered athletes immediately appear on tournament leaderboards and search queries across all sessions.
2. **Cluster & Multi-Container Safety:**
   - Because all mutations write to PostgreSQL, multiple instances running behind a reverse proxy (e.g. Nginx / AWS ALB / Docker Swarm) always read and persist the same synchronized data.

