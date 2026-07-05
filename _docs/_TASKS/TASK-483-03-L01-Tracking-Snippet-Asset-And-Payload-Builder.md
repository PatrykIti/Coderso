# TASK-483-03-L01: Tracking Snippet Asset And Payload Builder
# FileName: TASK-483-03-L01-Tracking-Snippet-Asset-And-Payload-Builder.md

**Parent Subtask:** TASK-483-03
**Priority:** High
**Category:** Tools / Analytics / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-483-02-L01
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Produce the minimal browser tracking script and the typed builder
  that constructs the beacon payload. The script honors Do-Not-Track / consent,
  collects only a tiny payload, and uses `navigator.sendBeacon`.
- **Owning module(s) to create:**
  `core/services/analytics/trackingSnippet.ts` — `buildTrackingScript({ nonce, collectPath })`
  returns the inline/served JS string; `buildClientPayload(loc, ref, lang)` (the
  pure shape builder, unit-testable without a DOM).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** injection into the page + delivery route (L02), the server
  endpoint (TASK-483-02).

## Security Contract

- **Endpoint visibility:** none here (asset builder); served in L02.
- **Auth model / RBAC / CSRF:** N/A (anonymous client script).
- **Rate-limit bucket:** N/A (client side).
- **Validation schema-owner module:** the payload must match
  `trafficEventSchema` (TASK-483-01-L01); the server re-validates regardless, so
  the client builder is a convenience, not a trust boundary.
- **Anti-abuse controls:** the script embeds the per-render HMAC nonce
  (TASK-483-02-L01) and sends it with each beacon; it must not embed any secret
  (the nonce is a signed, expiring, non-secret token).
- **Captcha/bot-protection exemption (binding on TASK-483-02-L02):** the
  analytics beacon action is EXEMPT from reCAPTCHA/`enforceBotProtection`. In
  this codebase the captcha token is NOT a header — it flows as a JSON body
  field `captchaToken` (e.g. `core/server/publicBookingApi.ts:78,170,382`;
  `core/server/routes/formsRoutes.ts:119,133,142-143,199`), extracted from the
  payload and passed to `enforceBotProtection` as `token`. The analytics beacon
  envelope (`{ event, nonce }`) carries no `captchaToken` field, while
  `enforceBotProtection` (`core/services/security/botProtection.ts`, enabled
  gate at line 43 `if (!settings.enabled) return`, token-required throw at
  lines 62-68 `if (!token) throw ApiError('bot_protection_required', …, 400)`)
  throws `bot_protection_required` whenever `settings.enabled` and no token —
  i.e. an admin enabling bot protection would 400 every legitimate beacon. The
  ingestion route (TASK-483-02-L02) must therefore NOT call
  `enforceBotProtection` for the beacon action; anti-abuse for this endpoint is
  HMAC nonce (`assertBeaconNonce`) + `public_write` rate limit + bot/DNT
  classification. 02-L02's suite must cover the bot-protection-enabled +
  beacon-without-token case (still `204`). 02-L02's Security Contract and
  pseudocode state the same binding decision (explicit no-`enforceBotProtection`
  call) — the two files are aligned.
- **Secret/PII handling:** the client must NOT collect IP (it cannot), full
  referrer when cross-origin policy hides it, cookies, or any user identifier.
  Only `path`, host-only `referrer`, and `navigator.language` — NO screen
  dimensions: `screenW`/`screenH` are excluded from the payload contract by
  TASK-483-01-L01 (data minimization; device class is UA-only per 02-L03), and
  the strict reject-unknown `trafficEventSchema` would 400 every beacon that
  sends them. Client-side DNT/GPC check short-circuits before any network call.

## Implementation Pseudocode

```ts
// NO screen dimensions: excluded from the payload contract by TASK-483-01-L01
// (strict reject-unknown — sending screenW/screenH would 400 every beacon).
export function buildClientPayload(loc: { pathname: string }, ref: string | null,
  lang: string | null) {
  const payload: {
    type: "pageview"; path: string; referrer: string | null; lang?: string;
  } = {
    type: "pageview" as const,
    path: loc.pathname,                    // server strips query anyway
    referrer: ref ? new URL(ref).host : null,  // host only; never full URL
      // referrer: null IS schema-legal (trafficEventSchema declares
      // `referrer: { type: ["string", "null"] }`).
  };
  // lang is declared `{ type: "string", maxLength: 35 }` (NOT nullable) in
  // TASK-483-01-L01's strict reject-unknown trafficEventSchema — OMIT the key
  // when navigator.language is falsy; never send an explicit null, or the
  // server-side strict validator can reject the beacon.
  if (lang) payload.lang = lang.slice(0, 35);
  return payload;
}

export function buildTrackingScript(opts: { nonce: string; collectPath: string }): string {
  // Serialized as a compact IIFE. nonce/collectPath are JSON-escaped.
  return `(function(){try{
    var dnt = navigator.doNotTrack==="1" || window.doNotTrack==="1" || navigator.globalPrivacyControl===true;
    if(dnt) return;
    var p = { type:"pageview", path: location.pathname,
      referrer: document.referrer ? (new URL(document.referrer)).host : null };
    if(navigator.language){ p.lang = navigator.language.slice(0,35); }  // omit when falsy (schema: lang is string-only)
    var body = JSON.stringify({ event: p, nonce: ${JSON.stringify(opts.nonce)} });
    var blob = new Blob([body], { type: "application/json" });
    if(navigator.sendBeacon){ navigator.sendBeacon(${JSON.stringify(opts.collectPath)}, blob); }
    else { fetch(${JSON.stringify(opts.collectPath)}, { method:"POST", body:body,
      headers:{ "Content-Type":"application/json" }, keepalive:true }); }
  }catch(e){}})();`;
}
```

Data flow: L02 calls `buildTrackingScript` with a fresh nonce per render and the
collect path constant, serves/injects it; on load the IIFE checks DNT/GPC, builds
the payload, and `sendBeacon`s it to TASK-483-02's `/_analytics/collect`.

Error handling: the script is wrapped in `try/catch` and never throws into the
host page; a failed send is silently ignored (analytics must never break the site).

Regression-test shape (Vitest, `tests/vitest/analytics/trackingSnippet.test.ts`):

```ts
test("payload carries host-only referrer and no cookies", () => {
  const p = buildClientPayload({ pathname: "/x" }, "https://ref.tld/y?z=1", "en-US");
  expect(p.referrer).toBe("ref.tld");
  expect(JSON.stringify(p)).not.toMatch(/cookie/i);
  expect("screenW" in p).toBe(false);  // excluded by the 01-L01 contract
});
test("script honors DNT and embeds nonce", () => {
  const s = buildTrackingScript({ nonce: "N", collectPath: "/_analytics/collect" });
  expect(s).toContain("doNotTrack");
  expect(s).toContain('"N"');
  expect(s).toContain("sendBeacon");
});
test("null-lang payload omits the key and passes normalizeTrafficEvent", () => {
  const p = buildClientPayload({ pathname: "/x" }, null, null);
  expect("lang" in p).toBe(false);   // never an explicit null
  // strict reject-unknown validator (TASK-483-01-L01) must accept it:
  const normalized = normalizeTrafficEvent(p, {
    uaDeviceClass: "desktop", selfHosts: new Set<string>(),
  });
  expect(normalized.lang).toBeNull();
});
```

## Testing Requirements

- **Vitest** only (Bun-free): payload shape (host-only referrer, no PII/cookies,
  lang key OMITTED when `navigator.language` is falsy + acceptance by the
  strict `normalizeTrafficEvent` validator) and script string (DNT guard, nonce
  embed, sendBeacon, try/catch).
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
