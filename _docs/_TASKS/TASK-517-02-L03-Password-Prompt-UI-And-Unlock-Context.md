# TASK-517-02-L03: Password-Prompt UI + Unlock-Context (fill 517-01-L03 seams)

# FileName: TASK-517-02-L03-Password-Prompt-UI-And-Unlock-Context.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-02
**Priority:** High
**Category:** Public Runtime / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Fills the two seams 517-01-L03 defined in `publicSite.tsx`:
(a) `buildEntryUnlockContext(cookies)` → a real `{ hasValidUnlockFor(entryId) }` backed by
`verifyEntryUnlockToken` (517-02-L01) reading the per-entry cookie; and
(b) `renderEntryPasswordPromptResult(entry, options, returnPath)` → a real 200
password-prompt HTML page whose form POSTs to `POST /entries/:id/unlock` (517-02-L02),
built via a NEW small string renderer `renderPublicPasswordPromptHtml(...)` added next to
`renderPublicEntryDetailHtml` in `core/site/renderPublicEntry.tsx` (the file that already
owns the `renderToString` detail-render shell). The locked entry body is NEVER rendered —
only the prompt. Does NOT re-edit the gate insertion (517-01-L03 owns that); this leaf only
replaces the two placeholder implementations in `publicSite.tsx` + adds the one prompt
renderer in `renderPublicEntry.tsx`.

## Grounded anchors

- Seams defined by 517-01-L03: `buildEntryUnlockContext(cookies)` (placeholder →
  `hasValidUnlockFor: () => false`) and `renderEntryPasswordPromptResult(entry, options,
  returnPath)` (**3-arg** placeholder → `null`, ignoring `returnPath`). 517-01-L03 lands this
  signature 3-arg from the start (the gate-insertion call site already passes `options?.returnPath`,
  and `renderEntryDetailHtml` already carries the `returnPath?` option), so this leaf swaps ONLY the
  placeholder BODIES for real implementations — never the signature and never the call site
  (Hard Invariant #5). This leaf swaps both for real implementations.
- Cookie name scheme `entry_unlock_<hashEntryCookieId(entryId)>`. `hashEntryCookieId` is
  imported READ-ONLY from 517-02-L01's `core/services/content/entryUnlockToken.ts` (its
  SINGLE owner/definition) — the SAME import the WRITE side (517-02-L02) uses, so the read
  name here byte-matches the written name (no silent unlock failure). Parse cookies via
  `parseCookies(req.headers.get("cookie"))` (`httpServer.ts:78` / `publicFormsApi.ts:46`) —
  already parsed once in `handlePublicRequest` per 517-01-L03.
- Verify: `verifyEntryUnlockToken(entryId, token)` (517-02-L01, boolean, never throws).
- The prompt page reuses the EXISTING render machinery: `resolvePublicStyles()`
  (`publicSite.tsx:207`, used by the detail render at `:1236`) for theme (light/dark) + a
  NEW small string renderer `renderPublicPasswordPromptHtml(...)` added next to
  `renderPublicEntryDetailHtml` in `core/site/renderPublicEntry.tsx` (same `renderDocument`
  shell, `renderToString` from `react-dom/server` @ `renderPublicEntry.tsx:3/236-237` —
  publicSite.tsx does NOT import `renderToStaticMarkup` and has NO `PublicShell` component).
- Return type: `renderEntryDetailHtml` returns `PublicHtmlRenderResult | string | null`
  (`publicSite.tsx:1226`, object type @ `:664` with `cacheable: boolean`). The prompt result
  returns the OBJECT form with `cacheable: false` (gated → never cached; 517-03 also
  exempts the cache read).
- Return path: the current detail path is passed IN from 517-01-L03's content-route call
  site (derived from the matched route/slug already in scope) and emitted as the hidden
  `returnPath` field; 517-02-L02's `unlockSchema` DECLARES `returnPath` so the strict
  validator accepts it, and `resolveSafeEntryReturnPath` validates it same-origin. There is
  no `currentEntryDetailPath()` helper — do not invent one.

## Implementation pseudocode

```ts
// publicSite.tsx (517-02 fills these; single named seams from 517-01-L03)

// hashEntryCookieId + verifyEntryUnlockToken both imported from 517-02-L01's
// entryUnlockToken.ts (single owner) — the SAME hashEntryCookieId 517-02-L02 writes with,
// guaranteeing the READ name here == the WRITTEN name.
function buildEntryUnlockContext(cookies: Record<string, string>) {
  return {
    hasValidUnlockFor(entryId: string): boolean {
      const token = cookies[`entry_unlock_${hashEntryCookieId(entryId)}`];
      return verifyEntryUnlockToken(entryId, token);        // boolean; cross-entry/tamper/expiry → false
    },
  };
}

async function renderEntryPasswordPromptResult(
  entry: { id: string; slug: string; title?: string | null },
  options?: RenderEntryDetailOptions,
  returnPath?: string,                       // the current detail path, passed in by 517-01-L03's call site
): Promise<PublicHtmlRenderResult> {
  // Reuse the SAME render machinery the file already uses for detail pages: resolve the
  // public styles and hand a small prompt <body> to `renderPublicEntryDetailHtml`'s sibling
  // string renderer in renderPublicEntry.tsx (react-dom/server `renderToString`, NOT
  // `renderToStaticMarkup` — that primitive is not used here and PublicShell does not exist).
  // Concretely: add a tiny `renderPublicPasswordPromptHtml({ title, inlineCss, cssHref,
  // devModuleScripts, actionUrl, returnPath, themeName })` next to `renderPublicEntryDetailHtml`
  // in core/site/renderPublicEntry.tsx (same `renderDocument(...)` shell → returns a string),
  // and call it here — mirroring the detail path at publicSite.tsx:1236-1237.
  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();  // :207
  const actionUrl = `/entries/${encodeURIComponent(entry.id)}/unlock`;
  // returnPath is the same-origin detail path (already in scope at the L03 call site from the
  // matched route/slug — NOT a nonexistent currentEntryDetailPath()); emitted as a hidden
  // field so 517-02-L02's unlockSchema (which DECLARES returnPath) accepts it and
  // resolveSafeEntryReturnPath validates it same-origin before the 302.
  const html = renderPublicPasswordPromptHtml({
    title: entry.title ?? "Protected content",
    inlineCss, cssHref, devModuleScripts,
    themeName: options?.themeName,
    actionUrl,
    returnPath: returnPath ?? "/",          // same-origin; validated by 517-02-L02
    // form fields: name="password" type="password" required maxLength=256 autoFocus;
    // hidden name="returnPath"; autoComplete="off"; NO entry body included (withheld).
  });
  // GATED — must never be shared-cached (517-03 also skips the cache READ for gated routes):
  return { html, cacheable: false };        // renderPublicPasswordPromptHtml already emits <!DOCTYPE ...>
}
```

**Design notes.** The prompt is a plain server-rendered `<form method="POST">` — no JS
required to submit (progressive-enhancement friendly, CSP-safe) — built with the file's
existing string-render path (`resolvePublicStyles` + a new `renderPublicPasswordPromptHtml`
in `renderPublicEntry.tsx`, `renderToString`), NOT `renderToStaticMarkup`/`PublicShell`
(neither exists in `publicSite.tsx`). The `password` input is never pre-filled and the form
uses `autoComplete="off"` / `type="password"`. The locked entry's actual body is NEVER
included in the prompt markup (withheld). `cacheable:false` prevents the prompt/body from
entering the shared HTML cache; 517-03 additionally bypasses the cache READ so a gated route
never serves a stale cached body across visitors. The `returnPath` hidden field carries the
current same-origin detail path (passed in from 517-01-L03's call site); it is a DECLARED
property of 517-02-L02's `unlockSchema` (so the strict `additionalProperties:false`
validator accepts the real form's `{ password, returnPath }` body — the two leaves agree on
this single field as the return-path source-of-truth) and is validated same-origin by
`resolveSafeEntryReturnPath` — never an open redirect.

## Security Contract (restatement — route-touching)

- **Visibility:** public GET render (prompt page) — no auth; the body stays withheld.
- **Body withholding:** the locked entry's content is NEVER in the prompt HTML; only the
  form + neutral copy.
- **Cookie consumption:** `hasValidUnlockFor` verifies the per-entry HMAC cookie
  (constant-time, TTL, entry-bound) before the gate allows the body; a tampered / expired /
  cross-entry cookie → false → prompt stays.
- **Cache:** prompt/gated result is `cacheable:false` (never shared-cached); read-side
  exemption is 517-03.
- **No hash exposure:** the prompt path reads only `hasPassword`/`visibility` +the cookie —
  never the hash.

## Regression-test shape

- Behavioral assertions in the 517-02-L04 Bun flow suite (locked → prompt page served with
  the `<form action="/entries/:id/unlock">` and NO entry body; unlocked cookie → body
  served). `buildEntryUnlockContext`'s cookie parsing + `verifyEntryUnlockToken` wiring is
  exercised there via real `Set-Cookie` → subsequent request.
- **Lane:** Bun (`tests/integration/runtime/*` — the 517-02-L04 flow suite; there is NO
  `tests/integration/site/` dir).

## Hard Invariants

1. Locked password entry serves the 200 prompt page; the entry BODY is withheld.
2. `buildEntryUnlockContext` uses `verifyEntryUnlockToken` (entry-bound, constant-time,
   TTL) on the per-entry cookie; tamper/expiry/cross-entry → locked.
3. Prompt form POSTs to `/entries/:id/unlock` (no JS required); `password` input not
   pre-filled; `returnPath` is same-origin only.
4. Prompt result is `cacheable:false`; never shared-cached.
5. Fills ONLY the two 517-01-L03 seams; does not re-edit the gate insertion.
