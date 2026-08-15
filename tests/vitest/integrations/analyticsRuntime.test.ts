import { describe, expect, it, vi } from "vitest";

import {
  buildGoogleAnalyticsHeadSnippet,
  GA_MEASUREMENT_ID_PATTERN,
  isValidGaMeasurementId,
  resolvePublicAnalyticsHead,
} from "../../../core/services/integrations/analyticsRuntime";

describe("GA_MEASUREMENT_ID_PATTERN", () => {
  it("accepts valid GA4 measurement ids", () => {
    expect(GA_MEASUREMENT_ID_PATTERN.test("G-ABC123")).toBe(true);
    expect(GA_MEASUREMENT_ID_PATTERN.test("G-1A2B3C4D")).toBe(true);
  });

  it("rejects invalid ids", () => {
    expect(GA_MEASUREMENT_ID_PATTERN.test("")).toBe(false);
    expect(GA_MEASUREMENT_ID_PATTERN.test("ga-123")).toBe(false);
    expect(GA_MEASUREMENT_ID_PATTERN.test("UA-1")).toBe(false);
    expect(GA_MEASUREMENT_ID_PATTERN.test("G-</script><script>alert(1)")).toBe(false);
    expect(GA_MEASUREMENT_ID_PATTERN.test("G-AB!")).toBe(false);
  });
});

describe("isValidGaMeasurementId", () => {
  it("accepts trimmed valid ids", () => {
    expect(isValidGaMeasurementId("  G-ABC123  ")).toBe(true);
  });

  it("rejects non-string and invalid values", () => {
    expect(isValidGaMeasurementId(null)).toBe(false);
    expect(isValidGaMeasurementId(undefined)).toBe(false);
    expect(isValidGaMeasurementId(123)).toBe(false);
    expect(isValidGaMeasurementId("")).toBe(false);
    expect(isValidGaMeasurementId("UA-12345")).toBe(false);
  });
});

describe("buildGoogleAnalyticsHeadSnippet", () => {
  it("builds the gtag.js script with the validated id", () => {
    const snippet = buildGoogleAnalyticsHeadSnippet("G-ABC123");
    expect(snippet).toContain('src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"');
    expect(snippet).toContain("gtag('config','G-ABC123')");
    expect(snippet).toContain("window.dataLayer=window.dataLayer||[]");
  });

  it("returns empty string for script-breaking payloads (fail closed)", () => {
    expect(buildGoogleAnalyticsHeadSnippet("</script><script>alert(1)")).toBe("");
    expect(buildGoogleAnalyticsHeadSnippet('"><script>alert(1)</script>')).toBe("");
  });

  it("returns empty string for malformed or empty ids", () => {
    expect(buildGoogleAnalyticsHeadSnippet("ga-123")).toBe("");
    expect(buildGoogleAnalyticsHeadSnippet("")).toBe("");
    expect(buildGoogleAnalyticsHeadSnippet("UA-1")).toBe("");
  });
});

describe("resolvePublicAnalyticsHead", () => {
  it("returns the snippet for a configured valid measurement id", async () => {
    const getIntegrationRuntimeConfig = vi.fn().mockResolvedValue({
      measurementId: "G-ABC123",
    });
    const snippet = await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig });
    expect(snippet).toBe(buildGoogleAnalyticsHeadSnippet("G-ABC123"));
    expect(getIntegrationRuntimeConfig).toHaveBeenCalledWith("google-analytics");
    expect(getIntegrationRuntimeConfig).toHaveBeenCalledTimes(1);
  });

  it("returns null when the config is missing or the id is invalid", async () => {
    const getIntegrationRuntimeConfig = vi.fn().mockResolvedValue({});
    expect(await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig })).toBeNull();

    getIntegrationRuntimeConfig.mockResolvedValue({ measurementId: "" });
    expect(await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig })).toBeNull();

    getIntegrationRuntimeConfig.mockResolvedValue({ measurementId: "UA-1" });
    expect(await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig })).toBeNull();

    getIntegrationRuntimeConfig.mockResolvedValue({ measurementId: null });
    expect(await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig })).toBeNull();

    getIntegrationRuntimeConfig.mockResolvedValue(null);
    expect(await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig })).toBeNull();
  });

  it("only ever reads the google-analytics integration", async () => {
    const getIntegrationRuntimeConfig = vi.fn().mockResolvedValue({
      measurementId: "G-ABC123",
    });
    await resolvePublicAnalyticsHead({ getIntegrationRuntimeConfig });
    const calledWith = getIntegrationRuntimeConfig.mock.calls.map((call) => call[0]);
    expect(calledWith).toEqual(["google-analytics"]);
  });
});
