import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

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

testIfDb("widget template revisions create/update/restore", async () => {
  const template = await createWidgetTemplate({
    name: `Template-${randomUUID()}`,
    description: "Revision test",
    category: "Content",
    blocks: [],
    settings: {
      layout: {
        wrapper: {
          container: "full",
          padding: { top: "none", bottom: "none" },
          background: { color: "#ffffff", image: null },
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

  let revisions = await listWidgetTemplateRevisions(template.id);
  expect(revisions).toHaveLength(1);
  expect(revisions[0]?.version).toBe(1);

  await updateWidgetTemplate(template.id, {
    name: "Template Updated",
    settings: {
      layout: {
        wrapper: {
          container: "default",
          maxWidth: "5xl",
          padding: { top: "md", bottom: "md" },
          background: { color: "#e2e8f0", image: null },
        },
        sections: {
          gap: "sm",
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

  revisions = await listWidgetTemplateRevisions(template.id);
  expect(revisions).toHaveLength(2);

  const first = revisions.find((revision) => revision.version === 1);
  expect(first).toBeTruthy();

  if (!first) return;

  await restoreWidgetTemplateRevision(first.id);

  const restored = await getWidgetTemplate(template.id);
  expect(restored?.name).toBe(first.name);
  expect(restored?.settings.layout.wrapper.background.color).toBe("#ffffff");

  revisions = await listWidgetTemplateRevisions(template.id);
  expect(revisions).toHaveLength(3);
});
