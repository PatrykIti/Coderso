import { expect } from "bun:test";
import { randomUUID } from "node:crypto";

import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { getSiteCacheStats } from "../../../core/site/cache/siteCache";
import {
  createActor,
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  requestPublicPath,
  setTestSetting,
  testIfDbWithOptions,
  trackContentEntry,
  trackContentType,
} from "../runtime/pages-runtime-test-support";

/**
 * TASK-486-03-L02 — public HTML carries exactly one popup runtime script
 * immediately before `</body>` (page + entry detail paths), the script is
 * syntactically valid, and the injection is cache-stable (the static script
 * must appear identically on a cached second request).
 */

const POPUP_MARKER = 'data-coderso-runtime-script="popups"';

const countOccurrences = (html: string, needle: string) => html.split(needle).length - 1;

const popupScriptTag = (html: string) => {
  const index = html.indexOf(`<script ${POPUP_MARKER}`);
  return index >= 0 ? html.slice(index, html.indexOf("</script>", index) + "</script>".length) : "";
};

const assertScriptBodyParses = (html: string) => {
  const script = popupScriptTag(html);
  expect(script.length).toBeGreaterThan(0);
  const body = script.replace(/^<script[^>]*>/, "").replace(/<\/script>\s*$/, "");
  expect(() => {
    // eslint-disable-next-line no-new-func
    new Function(body);
  }).not.toThrow();
};

testIfDbWithOptions(
  "public page HTML carries exactly one popup runtime script before </body>",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const { slug } = await createPublishedPageWithDraft();

    const response = await requestPublicPath(slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(countOccurrences(html, POPUP_MARKER)).toBe(1);
    const scriptIndex = html.indexOf(`<script ${POPUP_MARKER}`);
    const bodyIndex = html.lastIndexOf("</body>");
    expect(scriptIndex).toBeGreaterThan(0);
    expect(bodyIndex).toBeGreaterThan(scriptIndex);
    // Script sits immediately before the final </body> (only whitespace between).
    expect(html.slice(scriptIndex, bodyIndex).trimEnd().endsWith("</script>")).toBe(true);
    assertScriptBodyParses(html);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public entry detail HTML carries exactly one popup runtime script before </body>",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Popup Runtime ${token}`,
      slug: `popup-runtime-${token}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", title: "Headline", xFieldType: "text" },
        },
      },
    });
    trackContentType(contentType.id);

    const entry = await createEntry(contentType.id, {
      title: `Popup entry ${token}`,
      slug: `popup-entry-${token}`,
      authorId: actor.id,
      data: { headline: `Popup entry ${token}` },
    });
    if (!entry) throw new Error("missing_popup_runtime_entry");
    trackContentEntry(entry.id);
    await updateEntryMetadata(entry.id, { status: "published" }, actor.id);

    const listPath = `/popup-list-${token}`;
    const detailPath = `${listPath}/:slug`;
    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath,
        detailPath,
        enabled: true,
      },
    ]);

    const response = await requestPublicPath(`${listPath}/${entry.slug}`);
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(countOccurrences(html, POPUP_MARKER)).toBe(1);
    const scriptIndex = html.indexOf(`<script ${POPUP_MARKER}`);
    const bodyIndex = html.lastIndexOf("</body>");
    expect(scriptIndex).toBeGreaterThan(0);
    expect(bodyIndex).toBeGreaterThan(scriptIndex);
    expect(html.slice(scriptIndex, bodyIndex).trimEnd().endsWith("</script>")).toBe(true);
    assertScriptBodyParses(html);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "the popup runtime script is cache-stable on a cached second request",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const { slug } = await createPublishedPageWithDraft();

    const first = await requestPublicPath(slug);
    expect(first.status).toBe(200);
    const firstHtml = await first.text();
    expect(countOccurrences(firstHtml, POPUP_MARKER)).toBe(1);
    expect(getSiteCacheStats().size).toBe(1);

    const second = await requestPublicPath(slug);
    expect(second.status).toBe(200);
    const secondHtml = await second.text();
    // The cached response re-injects the same static script (byte-identical).
    expect(secondHtml).toBe(firstHtml);
    expect(countOccurrences(secondHtml, POPUP_MARKER)).toBe(1);
    assertScriptBodyParses(secondHtml);
  },
  { timeout: dbRuntimeTimeout }
);
