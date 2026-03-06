# QA Report: AgentPub Task Marketplace E2E User Journey

**Date:** 2026-03-06
**Verdict:** FAIL (BLOCKED by critical database bug)
**Branch:** weaver/T1772797063997-qa-agentpub

---

## Summary

All three scenarios are **blocked** by a critical bug in `src/lib/db.ts`. The `PrismaPg` adapter constructor receives a raw DATABASE_URL string, but `@prisma/adapter-pg` v7.4.2 expects a `pg.Pool` or `pg.PoolConfig` object. Every database operation fails with:

```
TypeError: Cannot use 'in' operator to search for 'password' in postgresql://...
```

UI pages render correctly (static HTML/React), but any data fetching or mutation fails with HTTP 500.

---

## Critical Bug

**Severity:** BLOCKER
**File:** `src/lib/db.ts:5-6`
**Description:** `PrismaPg` constructor called with raw URL string instead of `pg.Pool` or `pg.PoolConfig`

```ts
// Current (broken):
const adapter = new PrismaPg(process.env.DATABASE_URL!);

// Expected (fix):
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// Or:
// import pg from "pg";
// const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
// const adapter = new PrismaPg(pool);
```

**Reproduce:**
1. Set `DATABASE_URL` in `.env`
2. Run `npm run dev`
3. Visit any API endpoint (e.g., `GET /api/tasks`)
4. Server returns HTTP 500 with the TypeError above

---

## Scenario Results

### Scenario 1: Post Task and Receive Bids

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Open /tasks | Task market list page | Page renders with "Task Market" heading, search, filters, "No tasks found" | ✅ UI renders |
| Click Post Task | Navigate to /tasks/new | Link present, navigates to /tasks/new | ✅ |
| Fill form fields | Form with title, desc, budget, category, skills | All fields present: Title, Description, Category, Verification Level, Skill Tags, Min/Max Budget, Deadline | ✅ UI renders |
| Submit form | Task created, redirect to detail | HTTP 500 — DB connection fails | ❌ BLOCKED |
| Verify in /tasks list | New task appears with OPEN status | Cannot verify — API returns 500 | ❌ BLOCKED |
| DB validation | Task record with status=OPEN | No records created | ❌ BLOCKED |

**Screenshot:** `qa-evidence/01-tasks-page.png`, `qa-evidence/02-post-task-form.png`

### Scenario 2: Bid and Accept Flow

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Open /tasks/{id} | Task detail page | Cannot test — no tasks exist (DB broken) | ❌ BLOCKED |
| Place a Bid | Bid form submission | Cannot test | ❌ BLOCKED |
| Accept Bid | Task status → IN_PROGRESS | Cannot test | ❌ BLOCKED |
| DB validation | Bid record, Escrow HELD | Cannot test | ❌ BLOCKED |

### Scenario 3: Resource Market Browsing

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Open /resources | Resource market grid | Page renders with "Resource Market" heading, search, category/pricing filters, "No resources found" | ✅ UI renders |
| Search/filter | Filtered results | Cannot test — API returns 500 | ❌ BLOCKED |
| Click resource card | Detail page | Cannot test — no resources exist | ❌ BLOCKED |
| DB validation | Data matches Resource table | Cannot validate | ❌ BLOCKED |

**Screenshot:** `qa-evidence/03-resources-page.png`

---

## UI-Only Observations (Positive)

The following pages render correctly without database access:

1. **Task Market** (`/tasks`): Heading, Post Task link, search box, category dropdown (7 options), status filter (5 options)
2. **Post Task** (`/tasks/new`): Complete form with all required fields, proper validation attributes
3. **Resource Market** (`/resources`): Heading, List Resource link, search, category filter (6 options), pricing filter (4 options)
4. **Register** (`/register`): Human/Agent radio, name, email, password fields, Create Account button
5. **Navigation**: Consistent nav bar with AgentPub, Tasks, Resources, Sign In, Register links

---

## Additional Issues

1. **React warning** on `/tasks/new`: `Use the defaultValue or value props on <select> instead of setting selected on <option>.` (file: `src/app/tasks/new/page.tsx:113`)

---

## Evidence

- `qa-evidence/01-tasks-page.png` — Task market listing page
- `qa-evidence/02-post-task-form.png` — Post task form
- `qa-evidence/03-resources-page.png` — Resource market page
- `qa-evidence/04-register-page.png` — Registration page

---

## Required Fix

Fix `src/lib/db.ts` to pass a `pg.PoolConfig` object to `PrismaPg` instead of a raw URL string. After fixing, all three scenarios need to be re-tested end-to-end.
