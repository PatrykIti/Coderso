import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { widgetTemplates } from "../../../core/db/schema";
import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
} from "../../../core/services/widgets/widgetTemplateService";
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

testIfDb("create/update/list/delete widget templates", async () => {
  const template = await createWidgetTemplate({
    name: `Template-${randomUUID()}`,
    description: "Reusable hero layout",
    category: "Content",
    blocks: [],
    settings: {
      layout: {
        wrapper: {
          container: "full",
          padding: { top: "sm", bottom: "sm" },
          background: {
            color: "#f8fafc",
            image: null,
            media: { type: "none", source: "external", src: null },
          },
        },
        sections: {
          gap: "sm",
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
  expect(template.name).toContain("Template-");
  expect(template.settings.layout.wrapper.background.color).toBe("#f8fafc");

  const updated = await updateWidgetTemplate(template.id, {
    name: "Template Updated",
    status: "published",
    settings: {
      layout: {
        wrapper: {
          container: "default",
          maxWidth: "5xl",
          padding: { top: "md", bottom: "md" },
          background: {
            color: "#111827",
            image: null,
            media: { type: "none", source: "external", src: null },
          },
        },
        sections: {
          gap: "md",
          defaults: {
            container: "narrow",
            padding: { top: "sm", bottom: "sm" },
            margin: { top: "none", bottom: "none" },
          },
        },
        applyDefaultsToNewBlocks: false,
      },
    },
  });

  expect(updated?.name).toBe("Template Updated");
  expect(updated?.status).toBe("published");
  expect(updated?.settings.layout.wrapper.maxWidth).toBe("5xl");
  expect(updated?.settings.layout.wrapper.background.color).toBe("#111827");

  const list = await listWidgetTemplates();
  expect(list.some((item) => item.id === template.id)).toBe(true);

  const deleted = await deleteWidgetTemplate(template.id);
  expect(deleted?.id).toBe(template.id);
  createdTemplateId = undefined;
});
