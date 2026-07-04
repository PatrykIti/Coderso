# TASK-486-04-L01: Public `/api/popups` Route + Security Bun Tests
# FileName: TASK-486-04-L01-Public-Route-Bun-Tests.md

**Parent Subtask:** TASK-486-04
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01 (all leaves), TASK-486-03-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** End-to-end Bun coverage for the public delivery path: anonymous
  read, server-side targeting/audience eval, published-only, no-PII payload,
  rate-limit bucket, reject-unknown query, and that the admin RBAC surface is
  untouched. This is the security/runtime gate for the feature.
- **Owning module(s) to create-or-extend:** create
  `tests/integration/routes/popups-public.test.ts` and
  `tests/security/popups-public.test.ts`. Reuse the harness/seed helpers from
  `tests/integration/routes/popupsRoutes.test.ts` and
  `tests/integration/routes/bookingRoutes.test.ts`.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`.
- **Out of scope:** Vitest engine/render assertions (TASK-486-04-L02), docs
  (TASK-486-04-L03).

---

## Security Contract

Test-only leaf. Asserts the TASK-486-01-L03 contract:

- **Visibility:** `GET /api/popups` reachable **without** auth; `/popups`
  (admin) still requires `popups:read`/`popups:write`.
- **Auth model:** anonymous; with a logged-in session, `logged_in`-audience
  popups appear and `logged_out`-audience ones do not (and vice versa) — proving
  audience is server-derived, not client-asserted.
- **RBAC:** none on the public route; admin routes unchanged.
- **Rate-limit:** `public_read` bucket enforced (exceeding the configured limit
  returns the rate-limit error).
- **Validation:** unknown query keys → 400 `validation_error`; missing `path`
  → 400.
- **PII:** response items contain ONLY `id`, `slug`, `trigger`, `frequency`,
  `content`, `settings` — assert `name`/`status`/`targeting`/timestamps are
  absent.

---

## Implementation Pseudocode

```ts
// tests/integration/routes/popups-public.test.ts (Bun)
describe("GET /api/popups (public)", () => {
  test("anonymous read returns only published + path-targeted popups", async () => {
    await seedPopup({ status: "published", slug: "home",
      targeting: { includePaths: ["/"], excludePaths: [], audience: "all" } });
    await seedPopup({ status: "draft", slug: "hidden", /* ... */ });
    const res = await handlePublicRequest(new Request("http://x/api/popups?path=/"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((p) => p.slug)).toEqual(["home"]);
    // PII gate
    expect(Object.keys(body.items[0]).sort())
      .toEqual(["content","frequency","id","settings","slug","trigger"]);
  });

  test("audience resolved from session, not query", async () => {
    await seedPopup({ status:"published", slug:"members",
      targeting:{ includePaths:["/"], excludePaths:[], audience:"logged_in" }});
    const anon = await (await handlePublicRequest(req("/api/popups?path=/"))).json();
    expect(anon.items).toHaveLength(0);
    const authed = await (await handlePublicRequest(reqWithSession("/api/popups?path=/"))).json();
    expect(authed.items.map((p) => p.slug)).toContain("members");
  });

  test("exclude path beats include", async () => { /* ... */ });
  test("unknown query key ⇒ 400 validation_error", async () => { /* ... */ });
  test("non-GET ⇒ not handled here (404/405 via pipeline)", async () => { /* ... */ });
});
```

```ts
// tests/security/popups-public.test.ts (Bun)
test("public_read rate-limit bucket applies", async () => { /* exceed limit ⇒ error */ });
test("draft/archived never returned even if targeting matches", async () => { /* ... */ });
test("admin /popups still requires RBAC (401/403 anon)", async () => { /* ... */ });
```

**Data flow:** seed DB → drive `handlePublicRequest` (or Bun.serve) → assert
status/body/headers. Use the existing rate-limit reset between tests
(`resetRateLimit`-style helper) to avoid cross-test bleed.

**Error handling under test:** assert machine-readable codes
(`validation_error`, rate-limit code) and HTTP statuses match the contract.

**Regression-test shape:** as above — published-only, targeting, audience,
PII-gate, rate-limit, RBAC isolation.

---

## Testing Requirements

- **Bun** (`tests/integration/routes/*`, `tests/security/*`). Reset rate-limit
  + DB between tests.
- Gates: `bun run lint`, `bun run typecheck`, `bun test`.
