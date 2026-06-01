import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { widgetTemplates } from "../../db/schema";
import type { WidgetBlock } from "../../widgets/types";
import {
  normalizeWidgetTemplateBlocksForRead,
  normalizeWidgetTemplateBlocksForWrite,
} from "./widgetTemplateBlockContract";
import { listWidgetTemplateCategories } from "./widgetTemplateCategoryService";
import { createWidgetTemplateRevisionTx } from "./widgetTemplateRevisionService";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "./widgetTemplateSettings";

export type WidgetTemplateStatus = "draft" | "published";

export type WidgetTemplateRecord = typeof widgetTemplates.$inferSelect & {
  blocks: WidgetBlock[];
  settings: WidgetTemplateSettings;
};

export type WidgetTemplateCreateInput = {
  name: string;
  description?: string | null;
  category: string;
  status?: WidgetTemplateStatus;
  blocks?: WidgetBlock[] | null;
  settings?: WidgetTemplateSettings | null;
};

export type WidgetTemplateUpdateInput = {
  name?: string;
  description?: string | null;
  category?: string;
  status?: WidgetTemplateStatus;
  blocks?: WidgetBlock[] | null;
  settings?: WidgetTemplateSettings | null;
};

const allowedStatuses: WidgetTemplateStatus[] = ["draft", "published"];

async function resolveCategory(category: string) {
  const normalized = category.trim();
  if (!normalized) throw new Error("widget_template_category_invalid");
  const categories = await listWidgetTemplateCategories();
  const match = categories.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
  if (!match) throw new Error("widget_template_category_invalid");
  return match.name;
}

function assertStatus(status: string) {
  if (!allowedStatuses.includes(status as WidgetTemplateStatus)) {
    throw new Error("widget_template_status_invalid");
  }
}

function normalizeBlocks(blocks?: WidgetBlock[] | null): WidgetBlock[] {
  return normalizeWidgetTemplateBlocksForWrite(blocks);
}

function cloneBlocks(blocks?: WidgetBlock[] | null): WidgetBlock[] {
  return JSON.parse(JSON.stringify(normalizeBlocks(blocks))) as WidgetBlock[];
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

const mapWidgetTemplateRow = (row: typeof widgetTemplates.$inferSelect) => ({
  ...row,
  blocks: normalizeWidgetTemplateBlocksForRead(row.blocks as WidgetBlock[]),
  settings: normalizeWidgetTemplateSettings(row.settings),
});

export async function listWidgetTemplates(): Promise<WidgetTemplateRecord[]> {
  const rows = await db.select().from(widgetTemplates).orderBy(desc(widgetTemplates.updatedAt));

  return rows.map(mapWidgetTemplateRow);
}

export async function getWidgetTemplate(id: string) {
  const [row] = await db.select().from(widgetTemplates).where(eq(widgetTemplates.id, id));

  if (!row) return null;
  return mapWidgetTemplateRow(row);
}

async function assertTemplateNameAvailable(name: string, excludeId?: string) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new Error("widget_template_invalid");
  const templates = await listWidgetTemplates();
  const conflict = templates.find(
    (template) => template.id !== excludeId && normalizeName(template.name) === normalizedName
  );
  if (conflict) throw new Error("widget_template_name_conflict");
}

async function resolveDuplicateTemplateName(name: string) {
  const templates = await listWidgetTemplates();
  const existingNames = new Set(templates.map((template) => normalizeName(template.name)));
  const baseName = name.trim() || "Template";
  const firstCandidate = `Copy of ${baseName}`;
  if (!existingNames.has(normalizeName(firstCandidate))) return firstCandidate;
  for (let index = 2; index <= 100; index += 1) {
    const candidate = `${firstCandidate} ${index}`;
    if (!existingNames.has(normalizeName(candidate))) return candidate;
  }
  throw new Error("widget_template_name_conflict");
}

export async function createWidgetTemplate(
  input: WidgetTemplateCreateInput,
  userId?: string | null
) {
  if (!input.name?.trim()) {
    throw new Error("widget_template_invalid");
  }
  await assertTemplateNameAvailable(input.name);

  const resolvedCategory = await resolveCategory(input.category);
  if (input.status) assertStatus(input.status);

  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .insert(widgetTemplates)
      .values({
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        category: resolvedCategory,
        status: input.status ?? "draft",
        blocks: normalizeBlocks(input.blocks),
        settings: normalizeWidgetTemplateSettings(input.settings),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) throw new Error("widget_template_invalid");

    await createWidgetTemplateRevisionTx(
      tx,
      row.id,
      {
        name: row.name,
        description: row.description ?? null,
        category: row.category,
        status: row.status as WidgetTemplateStatus,
        blocks: normalizeBlocks(row.blocks as WidgetBlock[]),
        settings: normalizeWidgetTemplateSettings(row.settings),
      },
      userId
    );

    return mapWidgetTemplateRow(row);
  });
}

export async function updateWidgetTemplate(
  id: string,
  input: WidgetTemplateUpdateInput,
  userId?: string | null
) {
  const update: Partial<typeof widgetTemplates.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("widget_template_invalid");
    }
    await assertTemplateNameAvailable(input.name, id);
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

  if (input.settings !== undefined) {
    update.settings = normalizeWidgetTemplateSettings(input.settings);
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(widgetTemplates)
      .set(update)
      .where(eq(widgetTemplates.id, id))
      .returning();

    if (!row) return null;

    await createWidgetTemplateRevisionTx(
      tx,
      row.id,
      {
        name: row.name,
        description: row.description ?? null,
        category: row.category,
        status: row.status as WidgetTemplateStatus,
        blocks: normalizeBlocks(row.blocks as WidgetBlock[]),
        settings: normalizeWidgetTemplateSettings(row.settings),
      },
      userId
    );

    return mapWidgetTemplateRow(row);
  });
}

export async function duplicateWidgetTemplate(id: string, userId?: string | null) {
  const source = await getWidgetTemplate(id);
  if (!source) throw new Error("widget_template_not_found");
  const name = await resolveDuplicateTemplateName(source.name);
  return createWidgetTemplate(
    {
      name,
      description: source.description,
      category: source.category,
      status: "draft",
      blocks: cloneBlocks(source.blocks),
      settings: normalizeWidgetTemplateSettings(source.settings),
    },
    userId
  );
}

export async function deleteWidgetTemplate(id: string) {
  const [row] = await db.delete(widgetTemplates).where(eq(widgetTemplates.id, id)).returning();

  if (!row) return null;
  return mapWidgetTemplateRow(row);
}
