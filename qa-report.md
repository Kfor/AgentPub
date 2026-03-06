# QA Report: AgentPub E2E User Journey (Retest)

**Task:** T1772809171885
**Date:** 2026-03-06
**Verdict:** PASS
**Previous QA:** T1772797063997 (FAIL - PrismaPg adapter bug)
**Fix:** T1772798027247 (PrismaPg adapter fix - pass pg.PoolConfig instead of raw URL string)

---

## Environment

- Next.js 16.1.6 (Turbopack) on port 3001
- PostgreSQL local, database `agentpub`
- Prisma 7.4.2 with `@prisma/adapter-pg` (PrismaPg)
- PrismaPg adapter using `connectionString` in `PoolConfig` object (fixed pattern)

## Scenario 1: Post Task and Verify in Task Market

| Step | Action | Result |
|------|--------|--------|
| 1.1 | GET /tasks page | **200 OK** - page renders |
| 1.2 | GET /api/tasks (empty) | **200 OK** - `{"tasks":[],"pagination":{"total":0}}` |
| 1.3 | POST /api/auth/register (Alice) | **201** - user created |
| 1.4 | POST /api/tasks (with auth) | **201** - task created, status=OPEN |
| 1.5 | GET /api/tasks (verify listing) | **200 OK** - task appears with correct data |
| 1.6 | DB check: Task table | Row exists, status=OPEN, correct creatorId |

**Result: PASS**

## Scenario 2: Bid and Accept Bid Flow

| Step | Action | Result |
|------|--------|--------|
| 2.1 | GET /tasks/{id} page | **200 OK** - page renders |
| 2.2 | POST /api/auth/register (Bob) | **201** - bidder user created |
| 2.3 | POST /api/tasks/{id}/bids | **201** - bid created (amount=250, estimatedDays=5) |
| 2.4 | GET /api/tasks/{id}/bids | **200 OK** - bid appears with bidder reputation |
| 2.5 | PATCH /api/tasks/{id}/bids (accept) | **200 OK** - `{"success":true,"message":"Bid accepted, escrow created"}` |
| 2.6 | DB check: Task status | IN_PROGRESS, assigneeId set to Bob |
| 2.7 | DB check: TaskBid | accepted=true |
| 2.8 | DB check: Escrow | amount=250, status=HELD, platformFee=12.5 (5%) |

**Result: PASS**

## Scenario 3: Resource Market and User Registration

| Step | Action | Result |
|------|--------|--------|
| 3.1 | GET /resources page | **200 OK** - page renders |
| 3.2 | GET /api/resources (empty) | **200 OK** - empty list |
| 3.3 | POST /api/resources (create) | **201** - resource created (PER_CALL, AI/ML category) |
| 3.4 | GET /api/resources?q=GPT (search) | **200 OK** - filtered result returned |
| 3.5 | GET /api/resources?category=AI/ML (filter) | **200 OK** - 1 resource found |
| 3.6 | GET /register page | **200 OK** - page renders |
| 3.7 | POST /api/auth/register (Charlie) | **201** - new user created |
| 3.8 | DB check: User table | Charlie exists, email=charlie@test.com, userType=HUMAN |

**Result: PASS**

## Additional Verifications

| Check | Result |
|-------|--------|
| All frontend pages return 200 (/, /tasks, /tasks/new, /resources, /register, /login, /tasks/{id}) | PASS |
| Data persists in PostgreSQL across multiple API calls | PASS |
| PrismaPg adapter connects successfully (no P1003 errors with correct .env) | PASS |
| Escrow transaction atomicity (bid accept + task update + escrow create) | PASS |

## Notes

- The worktree required `npm install` and `.env` setup (no `node_modules` or `.env` inherited from main repo)
- Turbopack does not support symlinked `node_modules` pointing outside filesystem root
- All test data was cleaned up after verification
- The PrismaPg fix (PR #8) is confirmed working: `new PrismaPg({ connectionString: ... })` correctly initializes the adapter
