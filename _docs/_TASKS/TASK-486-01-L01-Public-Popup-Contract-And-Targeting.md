# TASK-486-01-L01: Public Popup DTO + Targeting/Audience Matcher + Query Schema
# FileName: TASK-486-01-L01-Public-Popup-Contract-And-Targeting.md

**Parent Subtask:** TASK-486-01
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Define the PII-free **public popup DTO**, a pure **targeting +
  audience matcher**, and the **public query schema**, so the resolver (L02) and
  route (L03) have an authoritative, reusable contract. The matcher decides
  whether a popup applies to a `{ path, isLoggedIn }` request; the DTO projection
  drops every authoring-only field so nothing internal can leak to the client.
- **Owning module(s) to create-or-extend:**
  - Create `core/services/popups/popupPublicContract.ts` (DTO type +
    `toPublicPopup` projection + `matchPopupTargeting` + `matchPopupAudience` +
    `matchPopupRequest`).
  - Extend `core/server/validation/popupSchemas.ts` with
    `popupPublicQuerySchema` (re-exported from the service module's contract, not
    re-declared in routes).
- **Source-of-truth docs:** `_docs/CMS_API.md` (engagement section),
  `_docs/SECURITY_SPEC.md` (no-PII output contract), `_docs/ARCHITECTURE.md`
  (domain/UI boundary — pure contracts live in the service module).
- **Out of scope:** DB access (L02), HTTP/route concerns (L03), client engine
  (TASK-486-02). No new admin fields.

---

## Security Contract

- **Endpoint visibility:** n/a (pure domain module; consumed by the public
  route in L03).
- **Auth model:** n/a here — but the matcher MUST treat `isLoggedIn` as the
  **server-derived** audience signal; it never reads an attacker-supplied
  segment string.
- **RBAC:** n/a.
- **CSRF:** n/a (no writes).
- **Rate-limit bucket:** n/a (enforced at the route in L03 = `public_read`).
- **Validation:** `popupPublicQuerySchema` is owned here, `additionalProperties:
  false` (reject-unknown / `.strict`), and validates only `path` (string,
  bounded length). Audience is NOT a query field — it is resolved from the
  session in L03.
- **Anti-abuse:** n/a (read-only contract; no nonce needed for an idempotent
  GET). Documented forward guard: any future write reuses the forms/booking
  nonce+HMAC evaluators.
- **Secret/PII handling:** `toPublicPopup` is the single PII gate. It returns
  **only** render + client-decision fields: `id`, `slug`, `trigger`,
  `frequency`, `content`, `settings`. It **excludes** `name`, `status`,
  `targeting`, `createdAt`, `updatedAt`, `publishedAt` (targeting/audience are
  already resolved server-side and must not be shipped to the client). No popup
  data is logged.

---

## Implementation Pseudocode

```ts
// core/services/popups/popupPublicContract.ts
import type { Popup, PopupTrigger, PopupFrequency, PopupSettings }
  from "./popupTypes";

export type PublicPopupContent = {
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type PublicPopup = {
  id: string;
  slug: string;
  trigger: PopupTrigger;
  frequency: PopupFrequency;
  content: PublicPopupContent;   // templateId stripped
  settings: PopupSettings;
};

// PII gate: drop name/status/targeting/timestamps AND the internal
// `content.templateId` (admin render-template id, useless to the client and
// must not leak). Never spread `p.content` wholesale — the real PopupContent
// carries templateId.
export const toPublicPopup = (p: Popup): PublicPopup => ({
  id: p.id,
  slug: p.slug,
  trigger: p.trigger,
  frequency: p.frequency,
  content: {
    title: p.content.title,
    body: p.content.body,
    ctaLabel: p.content.ctaLabel,
    ctaHref: p.content.ctaHref,
  },
  settings: p.settings,
});

// Path matching: include = "match any" (empty include ⇒ all paths);
// exclude wins. Support trailing "/*" prefix globs + exact match.
const pathMatches = (pattern: string, path: string): boolean => {
  if (pattern.endsWith("/*")) return path === pattern.slice(0, -2) ||
    path.startsWith(pattern.slice(0, -1)); // "/blog/*" ⇒ "/blog" or "/blog/..."
  return pattern === path;
};

export const matchPopupTargeting = (
  targeting: Popup["targeting"], path: string
): boolean => {
  if (targeting.excludePaths.some((p) => pathMatches(p, path))) return false;
  if (targeting.includePaths.length === 0) return true;
  return targeting.includePaths.some((p) => pathMatches(p, path));
};

export const matchPopupAudience = (
  audience: Popup["targeting"]["audience"], isLoggedIn: boolean
): boolean =>
  audience === "all" ||
  (audience === "logged_in" && isLoggedIn) ||
  (audience === "logged_out" && !isLoggedIn);

export const matchPopupRequest = (
  popup: Popup, req: { path: string; isLoggedIn: boolean }
): boolean =>
  matchPopupTargeting(popup.targeting, req.path) &&
  matchPopupAudience(popup.targeting.audience, req.isLoggedIn);
```

```ts
// core/services/popups/popupPublicContract.ts — the schema is OWNED here
// (domain/service contract module per AGENTS.md); core/server/validation/
// popupSchemas.ts only re-exports it (`export { popupPublicQuerySchema } from
// "../../services/popups/popupPublicContract";`). Routes import via this
// popupSchemas re-export (see TASK-486-01-L03).
export const popupPublicQuerySchema = {
  type: "object",
  required: ["path"],
  properties: { path: { type: "string", minLength: 1, maxLength: 500 } },
  additionalProperties: false,
} as const;
```

**Data flow:** route validates `{ path }` → resolves `isLoggedIn` from session →
resolver loads published popups → `matchPopupRequest` filters → `toPublicPopup`
projects → JSON. Routes stay orchestration-only.

**Error handling:** matcher is total (returns boolean, never throws). Normalize
`path` defensively (string already validated by schema). No domain errors raised
here.

**Regression-test shape (Vitest):**

- `matchPopupTargeting`: empty include ⇒ all; exclude beats include; exact +
  `/*` prefix glob; non-matching path.
- `matchPopupAudience`: 3×2 truth table.
- `toPublicPopup`: asserts the returned object has **no** `name`/`status`/
  `targeting`/timestamp keys (PII gate); keys are exactly the 6 allowed.
- Schema: rejects unknown query keys and missing `path`.

---

## Testing Requirements

- **Vitest** (`tests/vitest/popups/public-contract.test.ts`): pure matcher truth
  tables + DTO key-set assertion + `popupPublicQuerySchema` reject-unknown.
- Gates: `bun run lint`, `bun --cwd core lint:types`, `bun run test:vitest`.
