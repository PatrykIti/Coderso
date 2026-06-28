# TASK-486-03-L02: Runtime Script Assembly + publicSite Injection
# FileName: TASK-486-03-L02-Runtime-Script-Injection.md

**Parent Subtask:** TASK-486-03
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-02-L01/L02/L03, TASK-486-03-L01, TASK-486-01-L03
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Assemble the engine (TASK-486-02) + render (TASK-486-03-L01) into a
  single browser IIFE string via `buildPopupRuntimeScript()`, then inject it
  before the final `</body>` of every public HTML response. The script
  bootstraps a real `window`/`document`-backed env, builds `createPopupRuntime`,
  and calls `start()` on `DOMContentLoaded`.
- **Owning module(s) to create-or-extend:**
  - Create `core/server/popupRuntimeScript.ts` exporting
    `buildPopupRuntimeScript(): string` and `injectPopupRuntime(html: string):
    string`.
  - Edit `core/server/publicSite.tsx` `handlePublicRequest` to wrap the
    page/entry/template/preview HTML responses with `injectPopupRuntime(...)`.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (public-runtime delivery),
  browser-runtime precedent `core/widgets/core/listingRuntimeScript.ts` (a
  `String.raw` IIFE) and `core/widgets/runtimeScripts.tsx`.
- **Out of scope:** the endpoint (TASK-486-01-L03), the engine/render logic
  (already implemented and imported here).

---

## Security Contract

- **Endpoint visibility:** n/a (no new route). The injected script only calls
  the already-public `GET /api/popups`.
- **Auth model:** anonymous (same-origin fetch, no credentials added).
- **RBAC / CSRF:** n/a (read-only).
- **Rate-limit bucket:** n/a here (the fetch hits `public_read` in
  TASK-486-01-L03).
- **Validation:** the script sends only `path =
  encodeURIComponent(location.pathname)`; no other input is reflected.
- **Anti-abuse:** n/a (read-only). Forward guard unchanged (any future write →
  nonce+HMAC+`public_write`).
- **Secret/PII handling:** the script is **static and identical for every page**
  (it carries no per-page or per-user data — popups are fetched at runtime), so
  it is **safe to inject into cached HTML**. No secret, token, or session value
  is ever inlined. CSP note: the script is inline; if a strict CSP/nonce is
  later enforced on the public site, thread the existing page nonce through
  `injectPopupRuntime` (call out in ARCHITECTURE).

---

## Implementation Pseudocode

```ts
// core/server/popupRuntimeScript.ts
import { watchTrigger } from "../services/popups/runtime/triggerWatchers";
import { shouldShowPopup, recordPopupShown } from "../services/popups/runtime/frequencyGate";
import { createPopupRuntime } from "../services/popups/runtime/popupRuntime";
import { renderPopup, isSafeHref } from "../services/popups/runtime/renderPopup";

// Each imported fn is dependency-free ⇒ serialize via .toString() into the IIFE.
const SERIALIZED = [scrollDepthPercent, watchTrigger, shouldShowPopup,
  recordPopupShown, isSafeHref, renderPopup, createPopupRuntime]
  .map((fn) => fn.toString()).join("\n");

let cached: string | null = null;
export function buildPopupRuntimeScript(): string {
  if (cached) return cached;
  cached = `<script data-coderso-runtime-script="popups" type="text/javascript">
(function(){
  if (typeof window === "undefined" || window.__codersoPopupRuntime) return;
  window.__codersoPopupRuntime = true;
  ${SERIALIZED}
  var sessionId = (function(){ try {
    var k="nl.popup.sid", v=sessionStorage.getItem(k);
    if(!v){ v=String(Date.now())+Math.random(); sessionStorage.setItem(k,v);} return v;
  } catch(e){ return "nosession"; } })();
  var triggerEnv = { now: Date.now, setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    scrollMetrics: function(){ return { y: window.scrollY,
      viewport: window.innerHeight, full: document.documentElement.scrollHeight }; },
    matches: function(el, sel){ return !!(el && el.matches && el.matches(sel)); } };
  var frequencyEnv = { now: Date.now, sessionId: sessionId,
    getRecord: function(id){ try { var s=sessionStorage.getItem("nl.popup."+id)
      || localStorage.getItem("nl.popup."+id); return s?JSON.parse(s):null; } catch(e){ return null; } },
    setRecord: function(id, rec){ try { var s=JSON.stringify(rec);
      sessionStorage.setItem("nl.popup."+id, s); localStorage.setItem("nl.popup."+id, s);
    } catch(e){} } };
  var runtime = createPopupRuntime({
    currentPath: function(){ return location.pathname; },
    fetchPopups: function(path){ return fetch("/api/popups?path=" +
      encodeURIComponent(path), { credentials: "same-origin" })
      .then(function(r){ return r.ok ? r.json() : { items: [] }; })
      .then(function(j){ return (j && j.items) || []; }); },
    triggerEnv: triggerEnv, frequencyEnv: frequencyEnv,
    render: function(popup){ renderPopup(popup, { document: document }); } });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function(){ runtime.start(); });
  else runtime.start();
})();
</script>`;
  return cached;
}

export function injectPopupRuntime(html: string): string {
  if (!html.includes("</body>")) return html + buildPopupRuntimeScript();
  const i = html.lastIndexOf("</body>");
  return html.slice(0, i) + buildPopupRuntimeScript() + html.slice(i);
}
```

```ts
// core/server/publicSite.tsx — wrap the public HTML responses
// e.g. where a page/entry/template HTML string becomes a Response:
return new Response(injectPopupRuntime(result.html), { headers: { ... } });
```

**Data flow:** server builds the IIFE once (memoized) → injected before
`</body>` on each public HTML response (after cache read/write, since static) →
browser runs it on load → fetch `/api/popups?path` → engine arms → render.

**Error handling:** `injectPopupRuntime` falls back to append if `</body>` is
absent; the IIFE guards `typeof window`, a re-entry flag, and swallows all
storage/fetch failures (engine already does). A blocked fetch ⇒ no popups, page
unaffected.

**Constraint (serialization):** all imported runtime fns MUST stay
dependency-free (no closures over module imports) so `.toString()` produces
valid standalone source. Enforce with a Vitest guard that `buildPopupRuntimeScript()`
output contains each function name and parses (e.g. `new Function(stripTags(...))`).

**Regression-test shape (Bun):** served public page/entry HTML contains exactly
one `data-coderso-runtime-script="popups"` `<script>` immediately before
`</body>`; the same injection appears on a cached second request; the script
string is syntactically valid.

---

## Testing Requirements

- **Bun** (`tests/integration/routes/popups-runtime-injection.test.ts`): drive a
  real public request through `handlePublicRequest` / Bun.serve, assert the
  injected script is present (page + entry paths) and cache-stable.
- A small **Vitest** parse-guard for `buildPopupRuntimeScript()`
  (`tests/vitest/popups/runtime-script-build.test.ts`).
- Gates: `bun run lint`, `bun run typecheck`, `bun test`, `bun run test:vitest`.
