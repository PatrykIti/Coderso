// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";

import { renderPublicPageHtml } from "../../../core/site/renderPublicPage";
import { buildTrackingScript } from "../../../core/services/analytics/trackingSnippet";

// Bun-free render-layer coverage for TASK-483-03-L02: renderDocument appends the
// analytics snippet before `</body>` on LIVE renders only, never on previews.
// The DB-backed settings gate + nonce minting is exercised by the Bun lane; here
// we assert the render-layer injection contract with the snippet pre-built (the
// enabled/disabled decision is modeled by passing the script or null, exactly as
// publicSite.tsx's buildLiveAnalyticsScriptHtml does).

const COLLECT_PATH = "/_analytics/collect";

const renderTestPage = (opts: { analyticsEnabled: boolean; isPreview?: boolean }): string => {
  const analyticsScriptHtml = opts.analyticsEnabled
    ? buildTrackingScript({ nonce: "test-nonce-123", collectPath: COLLECT_PATH })
    : null;
  return renderPublicPageHtml({
    title: "Home",
    blocks: [],
    isPreview: opts.isPreview,
    analyticsScriptHtml,
  });
};

describe("public analytics snippet injection (TASK-483-03-L02)", () => {
  test("enabled: page HTML contains the beacon script with a nonce", () => {
    const html = renderTestPage({ analyticsEnabled: true });
    expect(html).toContain(COLLECT_PATH);
    expect(html).toContain("sendBeacon");
    expect(html).toContain("test-nonce-123");
    // appended inside the body, before the closing tag
    expect(html).toContain("</script></body></html>");
  });

  test("disabled: no analytics script injected", () => {
    const html = renderTestPage({ analyticsEnabled: false });
    expect(html).not.toContain(COLLECT_PATH);
    expect(html).not.toContain("sendBeacon");
  });

  test("preview: no analytics script injected even when enabled", () => {
    const html = renderTestPage({ analyticsEnabled: true, isPreview: true });
    expect(html).not.toContain(COLLECT_PATH);
    expect(html).not.toContain("sendBeacon");
    expect(html).not.toContain("test-nonce-123");
  });
});
