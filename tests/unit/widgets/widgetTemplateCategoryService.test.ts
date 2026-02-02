import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { getSetting, setSetting } from "../../../core/services/settings/settingsService";
import {
  createWidgetTemplateCategory,
  deleteWidgetTemplateCategory,
  updateWidgetTemplateCategory,
} from "../../../core/services/widgets/widgetTemplateCategoryService";
import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  getWidgetTemplate,
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

const originalCategories = hasDb
  ? await getSetting("widgets.templateCategories")
  : [];

let createdTemplateId: string | null = null;

afterAll(async () => {
  if (!hasDb) return;
  if (createdTemplateId) {
    await deleteWidgetTemplate(createdTemplateId);
  }
  await setSetting("widgets.templateCategories", originalCategories);
});

testIfDb("create/update/delete widget template categories", async () => {
  const name = `Footer-${randomUUID().slice(0, 6)}`;
  const created = await createWidgetTemplateCategory({ name });
  expect(created.name).toBe(name);

  const template = await createWidgetTemplate({
    name: `Template-${randomUUID()}`,
    description: null,
    category: created.name,
    blocks: [],
  });
  createdTemplateId = template.id;

  const updatedName = `${name}-Updated`;
  const updated = await updateWidgetTemplateCategory(created.id, {
    name: updatedName,
  });
  expect(updated?.name).toBe(updatedName);

  const updatedTemplate = await getWidgetTemplate(template.id);
  expect(updatedTemplate?.category).toBe(updatedName);

  const deleted = await deleteWidgetTemplateCategory(created.id);
  expect(deleted?.id).toBe(created.id);

  const afterDeleteTemplate = await getWidgetTemplate(template.id);
  expect(afterDeleteTemplate?.category).not.toBe(updatedName);
});
