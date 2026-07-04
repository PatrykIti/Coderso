# TASK-483-03-L01: Tracking Snippet Asset And Payload Builder
# FileName: TASK-483-03-L01-Tracking-Snippet-Asset-And-Payload-Builder.md

**Parent Subtask:** TASK-483-03
**Priority:** High
**Category:** Tools / Analytics / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-483-02-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Produce the minimal browser tracking script and the typed builder
  that constructs the beacon payload. The script honors Do-Not-Track / consent,
  collects only a tiny payload, and uses `navigator.sendBeacon`.
- **Owning module(s) to create:**
  `core/services/analytics/trackingSnippet.ts` — `buildTrackingScript({ nonce, collectPath })`
  returns the inline/served JS string; `buildClientPayload(location, doc)` (the
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
- **Secret/PII handling:** the client must NOT collect IP (it cannot), full
  referrer when cross-origin policy hides it, cookies, or any user identifier.
  Only `path`, host-only `referrer`, screen size, and `navigator.language`.
  Client-side DNT/GPC check short-circuits before any network call.

## Implementation Pseudocode

```ts
export function buildClientPayload(loc: { pathname: string }, ref: string | null,
  screen: { width: number; height: number }, lang: string | null) {
  return {
    type: "pageview" as const,
    path: loc.pathname,                    // server strips query anyway
    referrer: ref ? new URL(ref).host : null,  // host only; never full URL
    screenW: screen.width, screenH: screen.height,
    lang: lang ? lang.slice(0, 35) : null,
  };
}

export function buildTrackingScript(opts: { nonce: string; collectPath: string }): string {
  // Serialized as a compact IIFE. nonce/collectPath are JSON-escaped.
  return `(function(){try{
    var dnt = navigator.doNotTrack==="1" || window.doNotTrack==="1" || navigator.globalPrivacyControl===true;
    if(dnt) return;
    var p = { type:"pageview", path: location.pathname,
      referrer: document.referrer ? (new URL(document.referrer)).host : null,
      screenW: screen.width, screenH: screen.height,
      lang: navigator.language ? navigator.language.slice(0,35) : null };
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
  const p = buildClientPayload({ pathname: "/x" }, "https://ref.tld/y?z=1",
    { width: 1280, height: 800 }, "en-US");
  expect(p.referrer).toBe("ref.tld");
  expect(JSON.stringify(p)).not.toMatch(/cookie/i);
});
test("script honors DNT and embeds nonce", () => {
  const s = buildTrackingScript({ nonce: "N", collectPath: "/_analytics/collect" });
  expect(s).toContain("doNotTrack");
  expect(s).toContain('"N"');
  expect(s).toContain("sendBeacon");
});
```

## Testing Requirements

- **Vitest** only (Bun-free): payload shape (host-only referrer, no PII/cookies)
  and script string (DNT guard, nonce embed, sendBeacon, try/catch).
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
