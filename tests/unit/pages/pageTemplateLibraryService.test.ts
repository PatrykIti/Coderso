import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pageTemplates } from "../../../core/db/schema";
import {
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import { isPageTemplateError } from "../../../core/services/pages/pageTemplateLibrarySchema";
import {
  createPageTemplate,
  deletePageTemplate,
  duplicatePageTemplate,
  getPageTemplate,
  getPageTemplatePreviewModel,
  listPageTemplates,
  updatePageTemplate,
} from "../../../core/services/pages/pageTemplateLibraryService";
import { canConnect, hasTable } from "../../utils/db";

const hasDb =
  Boolean(process.env.DATABASE_URL) && (await canConnect()) && (await hasTable("page_templates"));
const testIfDb = hasDb ? test : test.skip;

const createdTemplateIds: string[] = [];

afterAll(async () => {
  for (const templateId of createdTemplateIds) {
    await db.delete(pageTemplates).where(eq(pageTemplates.id, templateId));
  }
});

const templateDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: false },
  sections: [createPageSectionV2("hero", { id: `sec_${randomUUID().slice(0, 12)}` })],
});

testIfDb("create/get/list/update/delete page templates with Page v2 documents", async () => {
  const uniqueName = `Page Template ${randomUUID()}`;
  const created = await createPageTemplate({
    name: uniqueName,
    description: "Reusable section stack",
    category: "marketing",
    document: templateDocument(),
  });
  createdTemplateIds.push(created.id);

  expect(created.slug).toContain("page-template-");
  expect(created.status).toBe("draft");
  expect(created.sectionsCount).toBe(1);
  expect(created.document.schemaVersion).toBe(2);

  const fetched = await getPageTemplate(created.id);
  expect(fetched?.name).toBe(uniqueName);
  expect(fetched?.document.sections).toHaveLength(1);

  const listed = await listPageTemplates();
  expect(listed.some((item) => item.id === created.id)).toBe(true);

  const updated = await updatePageTemplate(created.id, { status: "published" });
  expect(updated?.status).toBe("published");

  const deleted = await deletePageTemplate(created.id);
  expect(deleted?.id).toBe(created.id);
  expect(await getPageTemplate(created.id)).toBeNull();
});

testIfDb("rejects slug conflicts without silent suffixing", async () => {
  const slug = `pt-conflict-${randomUUID().slice(0, 8)}`;
  const first = await createPageTemplate({
    name: `Conflict ${randomUUID()}`,
    slug,
    document: templateDocument(),
  });
  createdTemplateIds.push(first.id);

  try {
    const second = await createPageTemplate({
      name: `Conflict ${randomUUID()}`,
      slug,
      document: templateDocument(),
    });
    createdTemplateIds.push(second.id);
    throw new Error("expected_slug_conflict");
  } catch (error) {
    expect(isPageTemplateError(error, "page_template_slug_conflict")).toBe(true);
  }
});

testIfDb("rejects legacy WidgetBlock[] payloads at the service boundary", async () => {
  try {
    const created = await createPageTemplate({
      name: `Legacy ${randomUUID()}`,
      document: { blocks: [{ id: "w1", type: "hero", data: {} }] },
    });
    createdTemplateIds.push(created.id);
    throw new Error("expected_boundary_rejection");
  } catch (error) {
    expect(isPageTemplateError(error, "page_template_legacy_widget_blocks_invalid")).toBe(true);
  }
});

testIfDb("duplicate creates a deterministic draft copy with -copy slug", async () => {
  const slug = `pt-dup-${randomUUID().slice(0, 8)}`;
  const source = await createPageTemplate({
    name: `Duplicate Source ${randomUUID().slice(0, 8)}`,
    slug,
    status: "published",
    document: templateDocument(),
  });
  createdTemplateIds.push(source.id);

  const copy = await duplicatePageTemplate(source.id);
  createdTemplateIds.push(copy.id);
  expect(copy.name).toBe(`${source.name} (copy)`);
  expect(copy.slug).toBe(`${slug}-copy`);
  expect(copy.status).toBe("draft");

  const copy2 = await duplicatePageTemplate(source.id);
  createdTemplateIds.push(copy2.id);
  expect(copy2.slug).toBe(`${slug}-copy-2`);
});

testIfDb("preview model fails closed for unreadable stored documents", async () => {
  const [row] = await db
    .insert(pageTemplates)
    .values({
      name: `Broken ${randomUUID()}`,
      slug: `pt-broken-${randomUUID().slice(0, 8)}`,
      status: "draft",
      document: { blocks: [] },
    })
    .returning();
  expect(row).toBeDefined();
  if (!row) return;
  createdTemplateIds.push(row.id);

  try {
    await getPageTemplatePreviewModel(row.id);
    throw new Error("expected_fail_closed");
  } catch (error) {
    expect(isPageTemplateError(error, "page_template_invalid")).toBe(true);
  }
});

testIfDb("preview model resolves readable documents", async () => {
  const created = await createPageTemplate({
    name: `Preview ${randomUUID()}`,
    document: templateDocument(),
  });
  createdTemplateIds.push(created.id);

  const model = await getPageTemplatePreviewModel(created.id);
  expect(model.id).toBe(created.id);
  expect(model.sectionsCount).toBe(1);
  expect(model.document.sections[0]?.type).toBe("hero");
});
