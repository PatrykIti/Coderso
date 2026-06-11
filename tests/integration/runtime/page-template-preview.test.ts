import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pageTemplates, previewTokens } from "../../../core/db/schema";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import { createPageTemplate } from "../../../core/services/pages/pageTemplateLibraryService";
import { createPreviewToken, hashPreviewToken } from "../../../core/services/pages/previewService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const trackedTemplateIds: string[] = [];
const trackedTokenHashes: string[] = [];

afterAll(async () => {
  for (const tokenHash of trackedTokenHashes) {
    await db.delete(previewTokens).where(eq(previewTokens.tokenHash, tokenHash));
  }
  for (const templateId of trackedTemplateIds) {
    await db.delete(pageTemplates).where(eq(pageTemplates.id, templateId));
  }
});

const markerText = `Page template preview marker ${randomUUID().slice(0, 8)}`;

const templateDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: false },
  sections: [
    createPageSectionV2("hero", {
      blocks: [
        createPageBlockV2("heading", {
          props: { text: markerText, level: "h2", align: "left" },
        }),
      ],
    }),
  ],
});

const issueToken = async (targetType: "page" | "page-template", targetId: string) => {
  const { token } = await createPreviewToken({ targetType, targetId, ttlMinutes: 5 });
  trackedTokenHashes.push(hashPreviewToken(token));
  return token;
};

const previewRequest = (search: string) =>
  handlePublicRequest(new Request(`http://localhost/preview?${search}`));

testIfDb("GET /preview?type=page-template renders the stored Page v2 document", async () => {
  resetRateLimitBuckets();
  const created = await createPageTemplate({
    name: `Preview Runtime ${randomUUID()}`,
    document: templateDocument(),
  });
  trackedTemplateIds.push(created.id);

  const token = await issueToken("page-template", created.id);
  const response = await previewRequest(`type=page-template&token=${token}`);
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain(markerText);
});

testIfDb(
  "target-type separation: a page token cannot render a template and vice versa",
  async () => {
    resetRateLimitBuckets();
    const created = await createPageTemplate({
      name: `Preview Separation ${randomUUID()}`,
      document: templateDocument(),
    });
    trackedTemplateIds.push(created.id);

    // Token stored for target type "page" must not satisfy type=page-template.
    const pageToken = await issueToken("page", created.id);
    const crossed = await previewRequest(`type=page-template&token=${pageToken}`);
    expect(crossed.status).toBe(404);

    // Token stored for target type "page-template" must not satisfy type=page.
    const templateToken = await issueToken("page-template", created.id);
    const crossedBack = await previewRequest(`type=page&token=${templateToken}`);
    expect(crossedBack.status).toBe(404);
  }
);

testIfDb("unreadable stored template documents fail closed with 404", async () => {
  resetRateLimitBuckets();
  const [row] = await db
    .insert(pageTemplates)
    .values({
      name: `Broken Runtime ${randomUUID()}`,
      slug: `pt-broken-runtime-${randomUUID().slice(0, 8)}`,
      status: "draft",
      document: { blocks: [{ id: "legacy", type: "hero", data: {} }] },
    })
    .returning();
  expect(row).toBeDefined();
  if (!row) return;
  trackedTemplateIds.push(row.id);

  const token = await issueToken("page-template", row.id);
  const response = await previewRequest(`type=page-template&token=${token}`);
  expect(response.status).toBe(404);
});

testIfDb("retired widget-template preview surface returns explicit 404", async () => {
  resetRateLimitBuckets();
  const response = await previewRequest(`type=widget-template&token=${randomUUID()}`);
  expect(response.status).toBe(404);
});
