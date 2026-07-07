import { describe, expect, test } from "vitest";

import {
  buildClientPayload,
  buildTrackingScript,
} from "../../../core/services/analytics/trackingSnippet";
import { normalizeTrafficEvent } from "../../../core/services/analytics/trafficSchemas";

describe("trackingSnippet (TASK-483-03-L01)", () => {
  test("payload carries host-only referrer and no cookies/screen dims", () => {
    const p = buildClientPayload({ pathname: "/x" }, "https://ref.tld/y?z=1", "en-US");
    expect(p.type).toBe("pageview");
    expect(p.path).toBe("/x");
    expect(p.referrer).toBe("ref.tld");
    expect(p.lang).toBe("en-US");
    expect(JSON.stringify(p)).not.toMatch(/cookie/i);
    expect("screenW" in p).toBe(false); // excluded by the 01-L01 contract
    expect("screenH" in p).toBe(false);
  });

  test("payload keeps a null referrer (schema-legal) when none is supplied", () => {
    const p = buildClientPayload({ pathname: "/" }, null, "en");
    expect(p.referrer).toBeNull();
  });

  test("lang is clamped to the schema max length (35)", () => {
    const long = "x".repeat(80);
    const p = buildClientPayload({ pathname: "/" }, null, long);
    expect(p.lang).toBe("x".repeat(35));
  });

  test("null-lang payload omits the key and passes normalizeTrafficEvent", () => {
    const p = buildClientPayload({ pathname: "/x" }, null, null);
    expect("lang" in p).toBe(false); // never an explicit null
    // strict reject-unknown validator (TASK-483-01-L01) must accept it:
    const normalized = normalizeTrafficEvent(p, {
      uaDeviceClass: "desktop",
      selfHosts: new Set<string>(),
    });
    expect(normalized.lang).toBeNull();
    expect(normalized.path).toBe("/x");
    expect(normalized.referrerHost).toBeNull();
  });

  test("builder extracts the host from a full referrer URL", () => {
    const p = buildClientPayload({ pathname: "/blog/post" }, "https://news.google.com/y", "pl-PL");
    expect(p.referrer).toBe("news.google.com"); // host only, never the full URL
    expect(p.path).toBe("/blog/post");
    expect(p.lang).toBe("pl-PL");
  });

  test("a host-only referrer round-trips to referrerHost + sourceKind (cross-subtask contract)", () => {
    const p = buildClientPayload({ pathname: "/blog/post" }, "https://news.google.com/y", "pl-PL");
    const normalized = normalizeTrafficEvent(p, {
      uaDeviceClass: "mobile",
      selfHosts: new Set<string>(),
    });
    expect(normalized.path).toBe("/blog/post");
    expect(normalized.lang).toBe("pl-PL");
    // The client emits a host-only `referrer` ("news.google.com"); the 01-L01
    // server normalizer's `safeHost` tolerates a bare host, so it round-trips to
    // a non-null referrerHost and drives source classification. Without this the
    // sources/referrers dashboards would collapse to a single "direct" bucket.
    expect(normalized.referrerHost).toBe("news.google.com");
    expect(normalized.sourceKind).toBe("search");
  });

  test("script honors DNT/GPC, embeds nonce, and uses sendBeacon", () => {
    const s = buildTrackingScript({ nonce: "N", collectPath: "/_analytics/collect" });
    expect(s).toContain("doNotTrack");
    expect(s).toContain("globalPrivacyControl");
    expect(s).toContain('"N"');
    expect(s).toContain("sendBeacon");
    expect(s).toContain("/_analytics/collect");
    // wrapped in try/catch so it never throws into the host page:
    expect(s).toContain("try{");
    expect(s).toContain("catch(e){}");
  });

  test("script JSON-escapes the nonce and collect path (no injection break-out)", () => {
    const s = buildTrackingScript({
      nonce: 'a"</script>',
      collectPath: "/c",
    });
    // JSON.stringify escapes the quote so the string literal cannot be broken out of.
    expect(s).toContain('"a\\"</script>"');
  });
});
