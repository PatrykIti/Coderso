import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { widgetTemplateRevisions, widgetTemplates } from "../../../core/db/schema";
import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  duplicateWidgetTemplate,
  getWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
} from "../../../core/services/widgets/widgetTemplateService";
import { restoreWidgetTemplateRevision } from "../../../core/services/widgets/widgetTemplateRevisionService";
import { canConnect, hasWidgetTemplateRevisionsTable } from "../../utils/db";

const hasDb =
  Boolean(process.env.DATABASE_URL) &&
  (await canConnect()) &&
  (await hasWidgetTemplateRevisionsTable());
const testIfDb = hasDb ? test : test.skip;

const cleanup = async (templateId?: string) => {
  if (!templateId) return;
  await db.delete(widgetTemplates).where(eq(widgetTemplates.id, templateId));
};

const createdTemplateIds: string[] = [];

afterAll(async () => {
  for (const templateId of createdTemplateIds) {
    await cleanup(templateId);
  }
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

  createdTemplateIds.push(template.id);
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
  createdTemplateIds.splice(createdTemplateIds.indexOf(template.id), 1);
});

testIfDb(
  "duplicate widget template creates a draft copy and name guard rejects collisions",
  async () => {
    const name = `Template-${randomUUID()}`;
    const template = await createWidgetTemplate({
      name,
      description: "Reusable copy source",
      category: "Content",
      status: "published",
      blocks: [
        {
          id: "block-1",
          type: "hero",
          data: {},
          layout: {
            container: "default",
            padding: { top: "md", bottom: "md" },
            margin: { top: "none", bottom: "none" },
            background: { color: "transparent", image: null },
          },
          visibility: { devices: ["desktop"], enabled: true },
          editor: { mode: "wizard", wizardCompleted: true },
        },
      ],
    });
    createdTemplateIds.push(template.id);

    await expect(
      createWidgetTemplate({
        name: `  ${name.toUpperCase()}  `,
        category: "Content",
        blocks: [],
      })
    ).rejects.toThrow("widget_template_name_conflict");

    const duplicated = await duplicateWidgetTemplate(template.id);
    createdTemplateIds.push(duplicated.id);
    expect(duplicated.name).toBe(`Copy of ${name}`);
    expect(duplicated.status).toBe("draft");
    expect(duplicated.blocks).toHaveLength(1);
    expect(duplicated.blocks[0]).not.toBe(template.blocks[0]);

    await expect(updateWidgetTemplate(duplicated.id, { name })).rejects.toThrow(
      "widget_template_name_conflict"
    );
  }
);

testIfDb(
  "widget template service rejects invalid Template Section references before persistence",
  async () => {
    await expect(
      createWidgetTemplate({
        name: `Template-${randomUUID()}`,
        category: "Content",
        blocks: [
          {
            id: "template-section-invalid",
            type: "template-section",
            variant: "default",
            data: {
              templateId: "missing-template-31-05",
            },
          },
        ],
      })
    ).rejects.toThrow("widget_schema_invalid");
  }
);

testIfDb("widget template service keeps legacy reads tolerant but writes strict", async () => {
  const [template] = await db
    .insert(widgetTemplates)
    .values({
      name: `Legacy Template-${randomUUID()}`,
      category: "Content",
      status: "published",
      blocks: [
        {
          id: "legacy-template-section-invalid",
          type: "template-section",
          variant: "default",
          data: {
            templateId: "missing-template-31-05",
          },
        },
      ],
      settings: {},
    })
    .returning();
  createdTemplateIds.push(template!.id);

  const fetched = await getWidgetTemplate(template!.id);
  expect(fetched?.blocks[0]?.type).toBe("template-section");
  expect((fetched?.blocks[0]?.data as { templateId?: string } | undefined)?.templateId).toBe(
    "missing-template-31-05"
  );

  await expect(
    updateWidgetTemplate(template!.id, {
      blocks: fetched?.blocks ?? [],
    })
  ).rejects.toThrow("widget_schema_invalid");
});

testIfDb(
  "widget template revision restore rejects invalid Template Section references",
  async () => {
    const [template] = await db
      .insert(widgetTemplates)
      .values({
        name: `Revision Template-${randomUUID()}`,
        category: "Content",
        status: "published",
        blocks: [],
        settings: {},
      })
      .returning();
    createdTemplateIds.push(template!.id);

    const [revision] = await db
      .insert(widgetTemplateRevisions)
      .values({
        templateId: template!.id,
        version: 1,
        name: template!.name,
        description: null,
        category: "Content",
        status: "published",
        blocks: [
          {
            id: "revision-template-section-invalid",
            type: "template-section",
            variant: "default",
            data: {
              templateId: "missing-template-31-05",
            },
          },
        ],
        settings: {},
      })
      .returning();

    await expect(restoreWidgetTemplateRevision(revision!.id)).rejects.toThrow(
      "widget_schema_invalid"
    );
  }
);
