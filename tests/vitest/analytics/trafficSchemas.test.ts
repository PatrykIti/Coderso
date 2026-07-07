import { describe, expect, test } from "vitest";

import {
  classifySource,
  normalizeTrafficEvent,
  normalizeTrafficPath,
  TRAFFIC_EVENT_MAX_PATH,
} from "../../../core/services/analytics/trafficSchemas";
import type { TrafficDeviceClass } from "../../../core/services/analytics/trafficTypes";

const ctx = {
  uaDeviceClass: "desktop" as TrafficDeviceClass,
  selfHosts: new Set<string>(),
};

describe("normalizeTrafficPath", () => {
  test("strips query and hash and clamps path", () => {
    expect(normalizeTrafficPath("/blog/post?utm=x#h")).toBe("/blog/post");
  });

  test("tolerates absolute URLs and returns pathname only", () => {
    expect(normalizeTrafficPath("https://site.tld/a/b?x=1")).toBe("/a/b");
  });

  test("defaults empty pathname to root", () => {
    expect(normalizeTrafficPath("https://site.tld")).toBe("/");
  });

  test("clamps to the max length", () => {
    const long = "/" + "a".repeat(TRAFFIC_EVENT_MAX_PATH + 100);
    expect(normalizeTrafficPath(long).length).toBe(TRAFFIC_EVENT_MAX_PATH);
  });
});

describe("normalizeTrafficEvent", () => {
  test("rejects unknown fields", () => {
    expect(() => normalizeTrafficEvent({ type: "pageview", path: "/", evil: 1 }, ctx)).toThrow(
      "analytics_beacon_invalid"
    );
  });

  test("rejects screen dimensions (not part of the minimal payload)", () => {
    expect(() =>
      normalizeTrafficEvent({ type: "pageview", path: "/", screenW: 1920 }, ctx)
    ).toThrow("analytics_beacon_invalid");
  });

  test("rejects non-object input", () => {
    expect(() => normalizeTrafficEvent("nope", ctx)).toThrow("analytics_beacon_invalid");
    expect(() => normalizeTrafficEvent(null, ctx)).toThrow("analytics_beacon_invalid");
    expect(() => normalizeTrafficEvent([], ctx)).toThrow("analytics_beacon_invalid");
  });

  test("rejects non-string path", () => {
    expect(() => normalizeTrafficEvent({ type: "pageview", path: 5 }, ctx)).toThrow(
      "analytics_beacon_invalid"
    );
  });

  test("normalizes path, referrer host, and lang; ignores client device", () => {
    const e = normalizeTrafficEvent(
      {
        type: "pageview",
        path: "/blog/post?q=1#top",
        referrer: "https://news.google.com/x",
        lang: "  en-US  ",
      },
      { uaDeviceClass: "mobile", selfHosts: new Set() }
    );
    expect(e).toEqual({
      type: "pageview",
      path: "/blog/post",
      referrerHost: "news.google.com",
      sourceKind: "search",
      deviceClass: "mobile",
      lang: "en-US",
    });
  });

  test("empty/invalid referrer yields direct with null host", () => {
    const e = normalizeTrafficEvent({ type: "pageview", path: "/", referrer: "" }, ctx);
    expect(e.referrerHost).toBeNull();
    expect(e.sourceKind).toBe("direct");
  });

  test("host-only referrer (as the client emits) round-trips to host + sourceKind", () => {
    // The tracking snippet sends a bare host, not a full URL — safeHost must
    // tolerate it or all source/referrer attribution collapses to "direct".
    const search = normalizeTrafficEvent(
      { type: "pageview", path: "/", referrer: "news.google.com" },
      ctx
    );
    expect(search.referrerHost).toBe("news.google.com");
    expect(search.sourceKind).toBe("search");

    const social = normalizeTrafficEvent(
      { type: "pageview", path: "/", referrer: "facebook.com" },
      ctx
    );
    expect(social.referrerHost).toBe("facebook.com");
    expect(social.sourceKind).toBe("social");

    const referral = normalizeTrafficEvent(
      { type: "pageview", path: "/", referrer: "example.org" },
      ctx
    );
    expect(referral.referrerHost).toBe("example.org");
    expect(referral.sourceKind).toBe("referral");
  });

  test("self-referrer classifies as internal", () => {
    const e = normalizeTrafficEvent(
      { type: "pageview", path: "/", referrer: "https://site.tld/a" },
      { ...ctx, selfHosts: new Set(["site.tld"]) }
    );
    expect(e.sourceKind).toBe("internal");
  });

  test("missing lang yields null", () => {
    const e = normalizeTrafficEvent({ type: "pageview", path: "/" }, ctx);
    expect(e.lang).toBeNull();
  });
});

describe("classifySource host matching", () => {
  test("is exact/dot-suffix, never substring", () => {
    expect(classifySource("wix.com", new Set())).toBe("referral"); // contains "x.com"
    expect(classifySource("googlesyndication.com", new Set())).toBe("referral"); // contains "google"
    expect(classifySource("x.com", new Set())).toBe("social");
    expect(classifySource("news.google.com", new Set())).toBe("search"); // dot-suffix match
  });

  test("null referrer is direct", () => {
    expect(classifySource(null, new Set())).toBe("direct");
  });

  test("known social and search hosts", () => {
    expect(classifySource("facebook.com", new Set())).toBe("social");
    expect(classifySource("bing.com", new Set())).toBe("search");
    expect(classifySource("t.co", new Set())).toBe("social");
  });

  test("unknown host is referral", () => {
    expect(classifySource("example.org", new Set())).toBe("referral");
  });
});
