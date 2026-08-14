import {
  sameUtcDay,
  shouldShowPopup,
  recordPopupShown,
} from "../services/popups/runtime/frequencyGate";
import { scrollDepthPercent, watchTrigger } from "../services/popups/runtime/triggerWatchers";
import { createPopupRuntime } from "../services/popups/runtime/popupRuntime";
import { renderPopup, isSafeHref, SAFE } from "../services/popups/runtime/renderPopup";

/**
 * Popup runtime script assembly + public HTML injection (TASK-486-03-L02).
 *
 * Assembles the popup engine (TASK-486-02) and renderer (TASK-486-03-L01) into
 * a single static browser IIFE string, then injects it before `</body>` on
 * every public HTML response. The script is static and identical for every
 * page: it carries no per-page or per-user data (popups are fetched at runtime
 * from the public `GET /api/popups` endpoint), so it is safe to inject into
 * cached HTML. No secret, token, or session value is ever inlined.
 *
 * Serialization discipline (mirrors `core/widgets/core/listingRuntimeScript.ts`):
 * - Every emitted line is `const <name> = <src>;` so the IIFE binds names.
 * - `fn.toString()` on an arrow const yields an anonymous expression, so a
 *   bare join would emit `(m) => {...}` with no binding and throw
 *   ReferenceError. Every function's free variables are serialized too
 *   (`SAFE` inside `isSafeHref`, `sameUtcDay` inside `shouldShowPopup`,
 *   `scrollDepthPercent` inside `watchTrigger`, `isSafeHref` inside
 *   `renderPopup`, and the engine helpers inside `createPopupRuntime`).
 *
 * CSP note: the script is inline and the public site currently ships no
 * nonce-based CSP, so no nonce is threaded today. If a strict CSP/nonce is
 * later enforced, `buildHtmlResponse` must render a fresh per-response nonce
 * into both the CSP header and the script tag.
 */

// Named consts in dependency order; every free variable of a serialized
// function must appear as an emitted const (enforced by the Vitest guard in
// tests/vitest/popups/runtime-script-build.test.ts).
const SERIALIZED_SOURCE = [
  `const sameUtcDay = ${sameUtcDay.toString()};`,
  `const SAFE = ${SAFE.toString()};`,
  `const scrollDepthPercent = ${scrollDepthPercent.toString()};`,
  `const isSafeHref = ${isSafeHref.toString()};`,
  `const watchTrigger = ${watchTrigger.toString()};`,
  `const shouldShowPopup = ${shouldShowPopup.toString()};`,
  `const recordPopupShown = ${recordPopupShown.toString()};`,
  `const renderPopup = ${renderPopup.toString()};`,
  `const createPopupRuntime = ${createPopupRuntime.toString()};`,
].join("\n");

// SERIALIZED_NAMES drives the transform-normalization below and must stay in
// sync with the const lines above; the Vitest guard enforces that every
// serialized helper is emitted as its own bound const.
const SERIALIZED_NAMES = [
  "sameUtcDay",
  "SAFE",
  "scrollDepthPercent",
  "isSafeHref",
  "watchTrigger",
  "shouldShowPopup",
  "recordPopupShown",
  "renderPopup",
  "createPopupRuntime",
];

/**
 * Bundler-transform normalization. `fn.toString()` reflects the source as the
 * CURRENT transform rewrote it: Bun keeps module imports as plain names, but
 * Vite's SSR transform (the Vitest lane) rewrites them to bundler-internal
 * import objects (`__vite_ssr_import_N__.shouldShowPopup`). Those objects do
 * not exist in the browser, so the emitted IIFE must never contain them.
 *
 * This rewrites `__vite_ssr_import_N__.<serializedName>` back to the plain
 * bound name for exactly the consts the IIFE emits. `(0, fn)(args)` is
 * behaviorally identical to `fn(args)` for module-scope calls (the comma
 * operator forces `this === undefined`), so the artifact is byte-equivalent
 * in behavior under both transforms. Under Bun the pattern never occurs and
 * the normalize is a no-op.
 */
const normalizeViteSsrImports = (source: string): string => {
  const names = SERIALIZED_NAMES.join("|");
  return source.replace(new RegExp(`__vite_ssr_import_\\d+__\\.(${names})\\b`, "g"), "$1");
};

const SERIALIZED = normalizeViteSsrImports(SERIALIZED_SOURCE);

let cached: string | null = null;

/**
 * Builds (once, memoized) the full inline `<script>` element that bootstraps
 * the popup runtime in the browser. The IIFE guards `typeof window` and a
 * re-entry flag, builds the `window`/`document`-backed envs, constructs the
 * runtime, and calls `start()` on `DOMContentLoaded`. A blocked fetch, a
 * throwing storage, or a missing DOM degrades silently: the page never breaks.
 */
export function buildPopupRuntimeScript(): string {
  if (cached) return cached;
  cached = `<script data-coderso-runtime-script="popups" type="text/javascript">
(function(){
  if (typeof window === "undefined" || window.__codersoPopupRuntime) return;
  window.__codersoPopupRuntime = true;
  ${SERIALIZED}
  var sessionId = (function(){ try {
    var k="nl.popup.sid", v=sessionStorage.getItem(k);
    if(!v){ v="" + Date.now() + Math.random(); sessionStorage.setItem(k, v); }
    return v;
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
      || localStorage.getItem("nl.popup."+id); return s ? JSON.parse(s) : null; } catch(e){ return null; } },
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

/**
 * Injects the popup runtime script immediately before the final `</body>` of a
 * public HTML response. Falls back to appending when `</body>` is absent so a
 * partial/streamed document still receives the script (browser ignores a
 * script after the closing `</html>`). Pure, side-effect free, and memoized.
 */
export function injectPopupRuntime(html: string): string {
  if (!html.includes("</body>")) return html + buildPopupRuntimeScript();
  const i = html.lastIndexOf("</body>");
  return html.slice(0, i) + buildPopupRuntimeScript() + html.slice(i);
}
