import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { widgetTemplates } from "../../../core/db/schema";
import {
  createWidgetTemplate,
  getWidgetTemplate,
  updateWidgetTemplate,
} from "../../../core/services/widgets/widgetTemplateService";
import {
  listWidgetTemplateRevisions,
  restoreWidgetTemplateRevision,
} from "../../../core/services/widgets/widgetTemplateRevisionService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async (templateId?: string) => {
  if (!templateId) return;
  await db.delete(widgetTemplates).where(eq(widgetTemplates.id, templateId));
};

let createdTemplateId: string | undefined;

afterAll(async () => {
  await cleanup(createdTemplateId);
});

testIfDb("widget template revisions create/update/restore", async () => {
  const template = await createWidgetTemplate({
    name: `Template-${randomUUID()}`,
    description: "Revision test",
    category: "Content",
    blocks: [],
  });

  createdTemplateId = template.id;

  let revisions = await listWidgetTemplateRevisions(template.id);
  expect(revisions).toHaveLength(1);
  expect(revisions[0]?.version).toBe(1);

  await updateWidgetTemplate(template.id, { name: "Template Updated" });

  revisions = await listWidgetTemplateRevisions(template.id);
  expect(revisions).toHaveLength(2);

  const first = revisions.find((revision) => revision.version === 1);
  expect(first).toBeTruthy();

  if (!first) return;

  await restoreWidgetTemplateRevision(first.id);

  const restored = await getWidgetTemplate(template.id);
  expect(restored?.name).toBe(first.name);

  revisions = await listWidgetTemplateRevisions(template.id);
  expect(revisions).toHaveLength(3);
});
