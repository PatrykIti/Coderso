# TASK-486-01-L03: `/api/popups` Public Route Handler + publicSite Wiring
# FileName: TASK-486-01-L03-Public-Popups-Route-And-Wiring.md

**Parent Subtask:** TASK-486-01
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01-L01, TASK-486-01-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Expose `GET /api/popups?path=<pathname>` to anonymous visitors via a
  dedicated public handler `handlePublicPopupsApi`, dispatched from
  `handlePublicRequest` exactly like `handlePublicBookingApi` /
  `handlePublicFormsApi`. It validates the query, derives audience from the
  session, calls `resolvePublicPopups`, and returns `{ items: PublicPopup[] }`.
- **Owning module(s) to create-or-extend:**
  - Create `core/server/publicPopupsApi.ts` (`handlePublicPopupsApi(req, ctx)
    => Response | null`).
  - Edit `core/server/publicSite.tsx` `handlePublicRequest` to dispatch it
    (before the generic `public_read` block, alongside booking/forms).
- **Source-of-truth docs:** `_docs/CMS_API.md` (add public endpoint),
  `_docs/SECURITY_SPEC.md` (`public_read` + no-PII), `_docs/ARCHITECTURE.md`.
- **Out of scope:** client engine (TASK-486-02), render/injection (TASK-486-03).
  This leaf does NOT add a write endpoint.

---

## Security Contract

- **Endpoint visibility:** **public** — `GET /api/popups` (NOT under
  `/admin/api/*`; served by `handlePublicRequest`). The internal admin routes
  (`/popups*`, `popups:read`/`popups:write`) are untouched.
- **Auth model:** **anonymous read**. Session is attached only to derive
  audience (`isLoggedIn`); absence of a session is valid (treated as
  `logged_out`).
- **RBAC:** **none** (deliberately public). Do NOT call `requirePermission`.
  Drafts/archived are excluded at the resolver query, so anonymous read cannot
  reach unpublished content.
- **CSRF:** n/a (safe idempotent GET, no state change).
- **Rate-limit bucket:** `public_read` via `checkRateLimit("public_read", { ip,
  userAgent }, security.rateLimit)` — same bucket/shape as
  `GET /api/booking/slots` and `/api/search`.
- **Validation:** `popupPublicQuerySchema` (owned in `popupSchemas.ts`, L01),
  `additionalProperties: false`. Reject unknown query params → 400
  `validation_error`. `path` length-bounded (≤500).
- **Anti-abuse:** rate-limit only (no nonce/HMAC/CAPTCHA — read-only,
  idempotent, no PII, no write). **Forward guard:** any future
  impression/dismissal POST MUST add nonce+HMAC via
  `core/services/forms/submissionNonce.ts` /
  `core/services/booking/bookingSubmissionNonce.ts` + optional reCAPTCHA per
  `_docs/SECURITY_SPEC.md`, on the `public_write` bucket.
- **Secret/PII handling:** response is `toPublicPopup`-projected only; no
  `name`/`status`/`targeting`/timestamps, no session identifiers, nothing
  logged. The visitor-supplied `path` is never reflected unescaped into HTML
  (JSON only).

> **Shared boundary `core/server/publicSite.tsx`** is also extended by TASK-483/486/491/493 — additive injection only; reuse the existing forms/booking public-write nonce evaluator, do not invent a competing one-off nonce.

---

## Implementation Pseudocode

```ts
// core/server/publicPopupsApi.ts
import { resolvePublicPopups } from "../services/popups/popupService";
import { popupPublicQuerySchema } from "./validation/popupSchemas";
import { validate } from "./validation/schemaValidator";
import { checkRateLimit } from "./middleware/rateLimit";
import { attachUserFromSession } from "./middleware/auth";
import { ApiError, toErrorResponse } from "./errorHandler";
import { mapPopupError } from "./routes/popupsRoutes";   // re-use domain mapping
import type { SecuritySettings } from "../services/settings/securitySettings";

const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { "Content-Type": "application/json" } });

// Parse the Cookie header into a record so attachUserFromSession can read the
// session token. Mirror the existing `parseCookies` in publicBookingApi.ts:239 /
// publicFormsApi.ts:36 (do not invent a new one).
const parseCookies = (header: string | null): Record<string, string> => {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const entry of header.split(";")) {
    const chunk = entry.trim();
    const i = chunk.indexOf("=");
    if (i <= 0) continue;
    cookies[chunk.slice(0, i).trim()] = decodeURIComponent(chunk.slice(i + 1).trim());
  }
  return cookies;
};

export type PublicPopupsApiContext = {
  url: URL; ip?: string; userAgent?: string; security: SecuritySettings;
};

export async function handlePublicPopupsApi(
  req: Request, ctx: PublicPopupsApiContext
): Promise<Response | null> {
  if (ctx.url.pathname !== "/api/popups") return null;
  if (req.method !== "GET") return null;       // 405-ish ⇒ let pipeline 404

  try {
    checkRateLimit("public_read", { ip: ctx.ip, userAgent: ctx.userAgent }, ctx.security.rateLimit);

    const query = { path: ctx.url.searchParams.get("path") ?? "" };
    validate(popupPublicQuerySchema, query);   // reject-unknown, bounded

    // audience resolved server-side; client cannot assert it.
    // Parse the Cookie header into routeCtx.cookies BEFORE attaching the
    // session: attachUserFromSession reads `ctx.cookies?.[SESSION_COOKIE_NAME]`
    // (core/server/middleware/auth.ts:19). Without populated cookies the token
    // is undefined, `user` stays unset, and `isLoggedIn` silently collapses to
    // false — breaking the logged_in/logged_out audience. Mirror booking/forms.
    const routeCtx: any = {
      headers: {},
      cookies: parseCookies(req.headers.get("cookie")),
    };
    req.headers.forEach((v, k) => (routeCtx.headers[k] = v));
    await attachUserFromSession(routeCtx);
    const isLoggedIn = Boolean(routeCtx.user);

    const items = await resolvePublicPopups({ path: query.path, isLoggedIn });
    return json({ items });
  } catch (error) {
    if (error instanceof ApiError) return json(toErrorResponse(error), error.status);
    const mapped = mapPopupError(error);
    if (mapped) return json(toErrorResponse(mapped), mapped.status);
    // validation errors from `validate` ⇒ 400
    return json({ error: { code: "validation_error", message: "Invalid popup request" } }, 400);
  }
}
```

```ts
// core/server/publicSite.tsx  (inside handlePublicRequest, before the
// generic public_read block — mirror booking/forms dispatch)
const popupsApiResponse = await handlePublicPopupsApi(req, { url, ip, userAgent, security });
if (popupsApiResponse) return popupsApiResponse;
```

**Data flow:** dispatch match → rate-limit → validate query → attach session →
derive audience → `resolvePublicPopups` → JSON. Handler stays orchestration-only;
all targeting/projection lives in the service/contract modules.

**Error handling:** machine-readable domain codes (`popup_*`) mapped via the
re-used `mapPopupError` at the boundary; `ApiError` passes through
`toErrorResponse`; schema failures → 400 `validation_error`. Never leak stack or
raw row data.

**Regression-test shape (Bun):** see TASK-486-04-L01 — registration/visibility,
anonymous 200, rate-limit, audience-by-session, published-only, no-PII payload,
reject-unknown query, `405/404` on non-GET.

---

## Testing Requirements

- **Bun** (`tests/integration/routes/popups-public.test.ts`,
  `tests/security/popups-public.test.ts`): served through the real public
  request path; verifies anonymous read, rate-limit bucket, session-derived
  audience, no-PII payload, and that admin `/popups` RBAC is unchanged.
- Gates: `bun run lint`, `bun run typecheck`, `bun test`.
