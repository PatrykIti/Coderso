import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { widgetTemplates } from "../../../core/db/schema";
import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
} from "../../../core/services/widgets/widgetTemplateService";

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

testIfDb("create/update/list/delete widget templates", async () => {
  const template = await createWidgetTemplate({
    name: `Template-${randomUUID()}`,
    description: "Reusable hero layout",
    category: "content",
    blocks: [],
  });

  createdTemplateId = template.id;
  expect(template.name).toContain("Template-");

  const updated = await updateWidgetTemplate(template.id, {
    name: "Template Updated",
    status: "published",
  });

  expect(updated?.name).toBe("Template Updated");
  expect(updated?.status).toBe("published");

  const list = await listWidgetTemplates();
  expect(list.some((item) => item.id === template.id)).toBe(true);

  const deleted = await deleteWidgetTemplate(template.id);
  expect(deleted?.id).toBe(template.id);
  createdTemplateId = undefined;
});
