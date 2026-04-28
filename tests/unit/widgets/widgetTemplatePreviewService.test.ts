import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { widgetTemplates } from "../../../core/db/schema";
import type { WidgetBlock } from "../../../core/widgets/types";
import {
  createWidgetTemplate,
} from "../../../core/services/widgets/widgetTemplateService";
import { getWidgetTemplatePreviewModel } from "../../../core/services/widgets/widgetTemplatePreviewService";
import {
  canConnect,
  hasWidgetTemplateRevisionsTable,
} from "../../utils/db";

const hasDb =
  Boolean(process.env.DATABASE_URL) &&
  (await canConnect()) &&
  (await hasWidgetTemplateRevisionsTable());
const testIfDb = hasDb ? test : test.skip;

const cleanup = async (templateId?: string) => {
  if (!templateId) return;
  await db.delete(widgetTemplates).where(eq(widgetTemplates.id, templateId));
};

let createdTemplateId: string | undefined;

afterAll(async () => {
  await cleanup(createdTemplateId);
});

testIfDb("getWidgetTemplatePreviewModel returns blocks for preview", async () => {
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
    settings: {
      layout: {
        wrapper: {
          container: "full",
          padding: { top: "none", bottom: "none" },
          background: {
            color: "#f1f5f9",
            image: null,
            media: { type: "none", source: "external", src: null },
          },
        },
        sections: {
          gap: "none",
          defaults: {
            container: "default",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "none" },
          },
        },
        applyDefaultsToNewBlocks: false,
      },
    },
  });

  createdTemplateId = template.id;

  const preview = await getWidgetTemplatePreviewModel(template.id);

  expect(preview.blocksCount).toBe(1);
  expect(preview.name).toBe(template.name);
  expect(preview.blocks.length).toBe(1);
  expect(preview.blocks[0]?.type).toBe("hero");
  expect(preview.settings.layout.wrapper.background.color).toBe("#f1f5f9");
});
