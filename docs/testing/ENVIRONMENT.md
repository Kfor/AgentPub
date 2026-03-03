# Test Environment Setup

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Chromium (for Playwright E2E tests)

## Database Setup

```bash
# Ensure PostgreSQL is running
brew services start postgresql@14

# Create database
createdb agentpub

# Run migrations
npx prisma migrate dev
```

## Environment Variables

Copy `.env.example` to `.env` and update `DATABASE_URL` with your local PostgreSQL connection string.

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL to your local Postgres, e.g.:
# DATABASE_URL="postgresql://youruser@localhost:5432/agentpub?schema=public"
```

## Running Tests

```bash
# Unit tests (Vitest)
npx vitest run

# E2E tests (Playwright)
npx playwright test

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Playwright Setup

```bash
npx playwright install chromium
```

## CDP (Coinbase) Integration Tests

Payment-related integration tests require valid Coinbase CDP credentials on Base Sepolia testnet.

```bash
# Required environment variables for payment integration tests:
CDP_API_KEY_ID="your-cdp-api-key-id"
CDP_API_KEY_SECRET="your-cdp-api-key-secret"
CDP_WALLET_SECRET="your-cdp-wallet-secret"
PLATFORM_WALLET_ADDRESS="0xYourPlatformSmartAccountAddress"
```

Get credentials at: https://portal.cdp.coinbase.com/access/api

Unit tests (vitest) mock the CDP SDK and do NOT require real credentials.

## Task Spider Integration Tests

Spider integration tests require Reddit API and Anthropic API credentials.

```bash
# Required for live spider tests:
REDDIT_CLIENT_ID="your-reddit-client-id"
REDDIT_CLIENT_SECRET="your-reddit-client-secret"
REDDIT_USER_AGENT="AgentPub Spider v1.0 (by /u/agentpub)"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

Get Reddit credentials at: https://www.reddit.com/prefs/apps (create a "script" app).

Unit tests (vitest) mock all external APIs and do NOT require real credentials.

## Known Issues

- **Git worktrees + Turbopack Google Fonts**: When running from a git worktree, Turbopack cannot resolve `next/font/google`. Use `next/font/local` with downloaded font files instead (see `public/fonts/`).
- **Prisma schema drift**: The migration files don't cover all schema fields (missing `disputes`, `notifications`, `dispute_evidence` tables and some columns). Use `npx prisma db push` instead of `npx prisma migrate deploy` to ensure the database matches the schema.
- **Client component imports**: Client components must NOT import from modules that transitively import Prisma/pg. Use `@/lib/reputation-utils` for pure helper functions in client components.

## Notes

- E2E tests auto-start the dev server via Playwright config
- Database must be running and migrated before E2E tests
- Payment unit tests mock CDP SDK; integration tests require real Base Sepolia credentials
- Spider unit tests mock Reddit API and Anthropic API; integration tests require real credentials
