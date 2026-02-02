import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { widgetTemplates } from "../../../core/db/schema";
import type { WidgetBlock } from "../../../core/widgets/types";
import {
  createWidgetTemplate,
} from "../../../core/services/widgets/widgetTemplateService";
import { renderWidgetTemplatePreview } from "../../../core/services/widgets/widgetTemplatePreviewService";

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

testIfDb("renderWidgetTemplatePreview returns html for blocks", async () => {
  const blocks: WidgetBlock[] = [
    {
      id: randomUUID(),
      type: "hero",
      variant: "centered",
      data: {},
    },
  ];

  const template = await createWidgetTemplate({
    name: `Template-${randomUUID()}`,
    description: "Preview test",
    category: "Content",
    blocks,
  });

  createdTemplateId = template.id;

  const preview = await renderWidgetTemplatePreview(template.id);

  expect(preview.blocksCount).toBe(1);
  expect(preview.html).toContain("Build faster with Nextless");
});
