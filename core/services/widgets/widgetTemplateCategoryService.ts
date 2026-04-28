import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { settings, widgetTemplates } from "../../db/schema";
import { getSetting } from "../settings/settingsService";

export type WidgetTemplateCategory = {
  id: string;
  name: string;
};

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const SETTINGS_KEY = "widgets.templateCategories";

const normalizeName = (value: string) => value.trim();

async function persistCategories(
  client: DbClient,
  categories: WidgetTemplateCategory[]
) {
  const now = new Date();
  const [row] = await client
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: categories, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: categories, updatedAt: now },
    })
    .returning();
  return row;
}

export async function listWidgetTemplateCategories(): Promise<
  WidgetTemplateCategory[]
> {
  const value = await getSetting(SETTINGS_KEY);
  return Array.isArray(value) ? (value as WidgetTemplateCategory[]) : [];
}

export async function createWidgetTemplateCategory(input: { name: string }) {
  const name = normalizeName(input.name ?? "");
  if (!name) throw new Error("widget_template_category_invalid");

  const categories = await listWidgetTemplateCategories();
  const exists = categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) throw new Error("widget_template_category_duplicate");

  const created = { id: randomUUID(), name };
  await persistCategories(db, [...categories, created]);
  return created;
}

export async function updateWidgetTemplateCategory(
  id: string,
  input: { name: string }
) {
  const name = normalizeName(input.name ?? "");
  if (!name) throw new Error("widget_template_category_invalid");

  const categories = await listWidgetTemplateCategories();
  const existing = categories.find((category) => category.id === id);
  if (!existing) return null;

  const duplicate = categories.some(
    (category) =>
      category.id !== id && category.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) throw new Error("widget_template_category_duplicate");

  if (existing.name === name) return existing;

  const next = categories.map((category) =>
    category.id === id ? { ...category, name } : category
  );
  await db.transaction(async (tx) => {
    await tx
      .update(widgetTemplates)
      .set({ category: name, updatedAt: new Date() })
      .where(eq(widgetTemplates.category, existing.name));
    await persistCategories(tx, next);
  });

  return { ...existing, name };
}

export async function deleteWidgetTemplateCategory(id: string) {
  const categories = await listWidgetTemplateCategories();
  const existing = categories.find((category) => category.id === id);
  if (!existing) return null;
  if (categories.length <= 1) {
    throw new Error("widget_template_category_last");
  }

  const fallback = categories.find((category) => category.id !== id);
  if (!fallback) {
    throw new Error("widget_template_category_last");
  }

  const next = categories.filter((category) => category.id !== id);
  await db.transaction(async (tx) => {
    await tx
      .update(widgetTemplates)
      .set({ category: fallback.name, updatedAt: new Date() })
      .where(eq(widgetTemplates.category, existing.name));
    await persistCategories(tx, next);
  });

  return existing;
}
