// Front-end tracking snippet + payload builder (TASK-483-03-L01).
//
// `buildClientPayload` is the pure, DOM-free shape builder for the beacon
// payload; `buildTrackingScript` serializes the minimal inline IIFE that runs on
// the published site. Both are Bun-free (no db/client import) so Vitest can
// import them directly.
//
// The payload deliberately carries only `path`, host-only `referrer`, and
// `lang` — NO screen dimensions, cookies, or user identifiers (data
// minimization; the strict reject-unknown `trafficEventSchema` in
// trafficSchemas.ts, TASK-483-01-L01, would 400 any extra key). The server
// re-validates every beacon, so this builder is a convenience, never a trust
// boundary. The script honors Do-Not-Track / GPC client-side and short-circuits
// before any network call; it embeds the per-render HMAC beacon nonce
// (createBeaconNonce, TASK-483-02-L01) which is a signed, expiring, non-secret
// token.

import { TRAFFIC_EVENT_MAX_LANG } from "./trafficSchemas";

// NO screen dimensions: excluded from the payload contract by TASK-483-01-L01
// (strict reject-unknown — sending screenW/screenH would 400 every beacon).
export type ClientTrafficPayload = {
  type: "pageview";
  path: string;
  referrer: string | null;
  lang?: string;
};

export function buildClientPayload(
  loc: { pathname: string },
  ref: string | null,
  lang: string | null
): ClientTrafficPayload {
  const payload: ClientTrafficPayload = {
    type: "pageview",
    path: loc.pathname, // server strips query anyway
    // host only; never full URL. referrer: null IS schema-legal
    // (trafficEventSchema declares `referrer: { type: ["string", "null"] }`).
    referrer: ref ? new URL(ref).host : null,
  };
  // `lang` is declared `{ type: "string", maxLength: 35 }` (NOT nullable) in
  // TASK-483-01-L01's strict reject-unknown trafficEventSchema — OMIT the key
  // when navigator.language is falsy; never send an explicit null, or the
  // server-side strict validator can reject the beacon.
  if (lang) payload.lang = lang.slice(0, TRAFFIC_EVENT_MAX_LANG);
  return payload;
}

export function buildTrackingScript(opts: { nonce: string; collectPath: string }): string {
  // Serialized as a compact IIFE. nonce/collectPath are JSON-escaped.
  return `(function(){try{
    var dnt = navigator.doNotTrack==="1" || window.doNotTrack==="1" || navigator.globalPrivacyControl===true;
    if(dnt) return;
    var p = { type:"pageview", path: location.pathname,
      referrer: document.referrer ? (new URL(document.referrer)).host : null };
    if(navigator.language){ p.lang = navigator.language.slice(0,${TRAFFIC_EVENT_MAX_LANG}); }
    var body = JSON.stringify({ event: p, nonce: ${JSON.stringify(opts.nonce)} });
    var blob = new Blob([body], { type: "application/json" });
    if(navigator.sendBeacon){ navigator.sendBeacon(${JSON.stringify(opts.collectPath)}, blob); }
    else { fetch(${JSON.stringify(opts.collectPath)}, { method:"POST", body:body,
      headers:{ "Content-Type":"application/json" }, keepalive:true }); }
  }catch(e){}})();`;
}
