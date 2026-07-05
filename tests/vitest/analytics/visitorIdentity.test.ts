import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  classifyBot,
  classifyDevice,
  computeVisitorHash,
  shouldHonorDnt,
} from "../../../core/services/analytics/visitorIdentity";
import { ApiError } from "../../../core/server/errorHandler";

describe("computeVisitorHash", () => {
  let previousSecret: string | undefined;

  beforeEach(() => {
    previousSecret = process.env.ANALYTICS_IP_HASH_SECRET;
    process.env.ANALYTICS_IP_HASH_SECRET = "ip_hash_test_secret";
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.ANALYTICS_IP_HASH_SECRET;
    else process.env.ANALYTICS_IP_HASH_SECRET = previousSecret;
  });

  test("is stable within a day and rotates across days, never leaking the raw IP", () => {
    const d1 = new Date("2026-06-28T10:00:00Z");
    const d2 = new Date("2026-06-29T10:00:00Z");
    const a = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now: d1 });
    const b = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now: d1 });
    const c = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now: d2 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain("1.2.3.4"); // raw IP never present
    expect(a).not.toContain("UA");
  });

  test("distinguishes different IPs and UAs within the same day", () => {
    const now = new Date("2026-06-28T10:00:00Z");
    const base = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now });
    expect(computeVisitorHash({ ip: "5.6.7.8", userAgent: "UA", now })).not.toBe(base);
    expect(computeVisitorHash({ ip: "1.2.3.4", userAgent: "Other", now })).not.toBe(base);
  });

  test("fails fast when the secret is missing", () => {
    delete process.env.ANALYTICS_IP_HASH_SECRET;
    try {
      computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA" });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("analytics_ip_hash_secret_missing");
      expect((error as ApiError).status).toBe(500);
    }
  });
});

describe("classifyBot", () => {
  test("treats a missing UA and known crawler patterns as bots", () => {
    expect(classifyBot(undefined)).toBe(true);
    expect(classifyBot("")).toBe(true);
    expect(classifyBot("Googlebot/2.1")).toBe(true);
    expect(classifyBot("curl/8.0")).toBe(true);
    expect(classifyBot("python-requests/2.31")).toBe(true);
    expect(classifyBot("HeadlessChrome/120")).toBe(true);
  });

  test("passes a normal browser UA", () => {
    expect(classifyBot("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537")).toBe(false);
  });
});

describe("classifyDevice", () => {
  test("classifies crawlers, mobile, tablet, desktop, and unknown", () => {
    expect(classifyDevice("Googlebot/2.1")).toBe("bot");
    expect(classifyDevice(undefined)).toBe("bot"); // no UA -> bot per classifyBot
    expect(classifyDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile")).toBe("mobile");
    expect(classifyDevice("Mozilla/5.0 (Linux; Android 14) Mobile")).toBe("mobile");
    expect(classifyDevice("Mozilla/5.0 (iPad; CPU OS 17_0) Safari")).toBe("tablet");
    expect(classifyDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537")).toBe("desktop");
  });
});

describe("shouldHonorDnt", () => {
  test("honors DNT and GPC signals only", () => {
    expect(shouldHonorDnt(new Headers({ dnt: "1" }))).toBe(true);
    expect(shouldHonorDnt(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(shouldHonorDnt(new Headers({ dnt: "0" }))).toBe(false);
    expect(shouldHonorDnt(new Headers())).toBe(false);
  });
});
