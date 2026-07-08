# TASK-517-01-L01: Pure Entry-Visibility Gate Resolver

# FileName: TASK-517-01-L01-Visibility-Gate-Resolver.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-01
**Priority:** High
**Category:** Content / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates NEW `core/services/content/entryVisibilityGate.ts`: a pure,
dependency-free function `resolveEntryVisibilityGate(input)` that maps a visibility
context to a gate decision. NO DB, NO `Request`, NO cookies — every input is passed by the
caller (517-01-L03 assembles the inputs). This is the single decision point so the same
logic is testable in isolation and reused identically by the render path (517-01-L03) and
the unlock endpoint's post-success redirect target (517-02).

## Grounded anchors

- `content_entries.visibility` values `public | private | password` (`core/db/schema.ts:792`).
- The public loaders already expose `visibility: EntryVisibility` + a DERIVED
  `hasPassword: boolean` (`entryService.ts` `getEntry` `:618`, projection `:627-628` →
  map `:654-655`; `getEntryBySlug` `:690`). The resolver consumes ONLY these two + the
  caller-computed auth/unlock booleans — never the raw hash.
- Fail-closed precedent: enum decisions treat unknown values as the most restrictive
  branch (never a bare permissive default).

## Implementation pseudocode

```ts
// core/services/content/entryVisibilityGate.ts — pure, no imports beyond the type.
import type { EntryVisibility } from "./entryService"; // real declaration site: entryService.ts:28
// NOTE: there is NO ./entryTypes module (verified: core/services/content/entryTypes.ts does not
// exist). `EntryVisibility` is single-sourced at entryService.ts:28
// (`export type EntryVisibility = "public" | "private" | "password";`). Import from there — do
// NOT create entryTypes.ts. This introduces a light type-only coupling of the pure resolver back
// to entryService; if that coupling is ever undesirable, extract `EntryVisibility` into a new
// shared types module and re-export it from entryService — but do NOT invent the ungrounded
// ./entryTypes path.

export type EntryGateDecision =
  | { kind: "allow" }
  | { kind: "not-found" }
  | { kind: "prompt" };

export interface EntryVisibilityGateInput {
  visibility: EntryVisibility | string | null | undefined; // raw from loader; treat unknown as private
  hasPassword: boolean;          // derived boolean from the loader (never the hash)
  isAuthenticated: boolean;      // authenticated ADMIN/editor render context (bypasses gate).
                                 // MUST represent an ADMIN/editor session, NOT any active user —
                                 // see Hard Invariant #5 (the caller, 517-01-L03, is responsible
                                 // for only setting this true for an admin/editor session).
  hasValidUnlock: boolean;       // caller pre-verified the per-entry HMAC unlock cookie (517-02 util)
}

export function resolveEntryVisibilityGate(input: EntryVisibilityGateInput): EntryGateDecision {
  // 1) Authenticated preview/admin render ALWAYS bypasses (already authorized).
  if (input.isAuthenticated) return { kind: "allow" };

  switch (input.visibility) {
    case "public":
      return { kind: "allow" };
    case "private":
      return { kind: "not-found" };           // anon → uniform 404, no existence leak
    case "password":
      // A password entry with no hash set is a misconfiguration → fail closed to prompt
      // (never silently serve the body). A valid unlock cookie serves the body.
      return input.hasValidUnlock ? { kind: "allow" } : { kind: "prompt" };
    default:
      return { kind: "not-found" };            // FAIL-CLOSED: unknown/unresolved → most restrictive
  }
}
```

**Design notes.** The authenticated bypass is checked FIRST so an admin/preview never hits
a prompt or a 404 for their own private/password entries. `password` without
`hasValidUnlock` returns `prompt` (not `not-found`) so 517-02 can serve the discoverable
prompt page; `private` is ALWAYS `not-found` for anon. Unknown visibility → `not-found`
(fail-closed). `hasPassword` is carried for symmetry / future use (e.g. a `password`
visibility with `hasPassword===false` could be treated as misconfig) but the decision does
not require reading the hash.

## Regression-test shape

- **Lane:** Vitest `tests/vitest/content/entry-visibility-gate.test.ts` (NEW; pure
  TypeScript, no DB → Vitest per `_docs/TESTING_STRATEGY.md`; `tests/unit/*` stays reserved
  for Bun DB/service suites).
- Assert the full matrix:
  - `public` + anon → `allow`; `public` + authed → `allow`.
  - `private` + anon → `not-found`; `private` + authed → `allow` (bypass).
  - `password` + anon + `hasValidUnlock:false` → `prompt`; + `hasValidUnlock:true` →
    `allow`; + authed → `allow` (bypass regardless of unlock).
  - unknown/garbage visibility (`"secret"`, `null`, `undefined`, `""`) + anon →
    `not-found` (fail-closed).
  - authenticated ALWAYS `allow` for every visibility value.
- Pure function — no fixtures, no DB, no teardown.

## Hard Invariants

1. PURE — no DB, no `Request`, no cookies, no `Date.now()`; deterministic on its inputs.
2. Authenticated bypass is the FIRST branch.
3. Unknown/unresolved visibility → `not-found` (fail-closed; never `allow`).
4. Never reads or references the password HASH — only the derived `hasPassword` boolean +
   the caller-supplied `hasValidUnlock`.
5. The `isAuthenticated` bypass MUST represent an ADMIN/editor session, NOT any active-session
   user. `attachUserFromSession` (auth.ts:15-39, grounded) resolves `ctx.user` for ANY user with
   `status==='active'` and a valid `session` cookie — there is NO role/permission check. This pure
   resolver takes `isAuthenticated` as a boolean and cannot enforce the role itself; the caller
   (517-01-L03) MUST bound the bypass to an admin/editor session (or document + test-assert the
   invariant that `session` is admin-only). The bypass is only as safe as "no low-privilege /
   customer account is ever issued the same `session` cookie" — that invariant is stated + owned
   at the call site (517-01-L03 Hard Invariants). Do NOT set `isAuthenticated:true` for a bare
   "any logged-in user" without that role bound.
