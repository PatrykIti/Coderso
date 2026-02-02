import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { widgetTemplates } from "../../db/schema";
import type { WidgetBlock } from "../../widgets/types";
import { listWidgetTemplateCategories } from "./widgetTemplateCategoryService";

export type WidgetTemplateStatus = "draft" | "published";

export type WidgetTemplateRecord = typeof widgetTemplates.$inferSelect & {
  blocks: WidgetBlock[];
};

export type WidgetTemplateCreateInput = {
  name: string;
  description?: string | null;
  category: string;
  status?: WidgetTemplateStatus;
  blocks?: WidgetBlock[] | null;
};

export type WidgetTemplateUpdateInput = {
  name?: string;
  description?: string | null;
  category?: string;
  status?: WidgetTemplateStatus;
  blocks?: WidgetBlock[] | null;
};

const allowedStatuses: WidgetTemplateStatus[] = ["draft", "published"];

async function resolveCategory(category: string) {
  const normalized = category.trim();
  if (!normalized) throw new Error("widget_template_category_invalid");
  const categories = await listWidgetTemplateCategories();
  const match = categories.find(
    (item) => item.name.toLowerCase() === normalized.toLowerCase()
  );
  if (!match) throw new Error("widget_template_category_invalid");
  return match.name;
}

function assertStatus(status: string) {
  if (!allowedStatuses.includes(status as WidgetTemplateStatus)) {
    throw new Error("widget_template_status_invalid");
  }
}

function normalizeBlocks(blocks?: WidgetBlock[] | null): WidgetBlock[] {
  return Array.isArray(blocks) ? blocks : [];
}

export async function listWidgetTemplates(): Promise<WidgetTemplateRecord[]> {
  const rows = await db
    .select()
    .from(widgetTemplates)
    .orderBy(desc(widgetTemplates.updatedAt));

  return rows.map((row) => ({ ...row, blocks: row.blocks as WidgetBlock[] }));
}

export async function getWidgetTemplate(id: string) {
  const [row] = await db
    .select()
    .from(widgetTemplates)
    .where(eq(widgetTemplates.id, id));

  if (!row) return null;
  return { ...row, blocks: row.blocks as WidgetBlock[] };
}

export async function createWidgetTemplate(input: WidgetTemplateCreateInput) {
  if (!input.name?.trim()) {
    throw new Error("widget_template_invalid");
  }

  const resolvedCategory = await resolveCategory(input.category);
  if (input.status) assertStatus(input.status);

  const now = new Date();
  const [row] = await db
    .insert(widgetTemplates)
    .values({
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      category: resolvedCategory,
      status: input.status ?? "draft",
      blocks: normalizeBlocks(input.blocks),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { ...row, blocks: row.blocks as WidgetBlock[] };
}

export async function updateWidgetTemplate(
  id: string,
  input: WidgetTemplateUpdateInput
) {
  const update: Partial<typeof widgetTemplates.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("widget_template_invalid");
    }
    update.name = input.name.trim();
  }

  if (input.description !== undefined) {
    update.description = input.description?.trim() ?? null;
  }

  if (input.category !== undefined) {
    update.category = await resolveCategory(input.category);
  }

  if (input.status !== undefined) {
    assertStatus(input.status);
    update.status = input.status;
  }

  if (input.blocks !== undefined) {
    update.blocks = normalizeBlocks(input.blocks);
  }

  const [row] = await db
    .update(widgetTemplates)
    .set(update)
    .where(eq(widgetTemplates.id, id))
    .returning();

  if (!row) return null;
  return { ...row, blocks: row.blocks as WidgetBlock[] };
}

export async function deleteWidgetTemplate(id: string) {
  const [row] = await db
    .delete(widgetTemplates)
    .where(eq(widgetTemplates.id, id))
    .returning();

  if (!row) return null;
  return { ...row, blocks: row.blocks as WidgetBlock[] };
}
