import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { adminThemeTemplates } from "../../db/schema";
import type { AdminThemeTokens } from "./tokenTypes";
import { assertAdminThemeTokens } from "./tokenValidation";

export type AdminThemeTemplate = typeof adminThemeTemplates.$inferSelect & {
  tokens: AdminThemeTokens;
};

export type AdminThemeTemplateCreateInput = {
  name: string;
  description?: string | null;
  tokens: AdminThemeTokens;
};

export type AdminThemeTemplateUpdateInput = {
  name?: string;
  description?: string | null;
  tokens?: AdminThemeTokens;
};

export async function listAdminThemeTemplates(): Promise<AdminThemeTemplate[]> {
  const rows = await db
    .select()
    .from(adminThemeTemplates)
    .orderBy(adminThemeTemplates.createdAt);

  return rows.map((row) => ({ ...row, tokens: row.tokens as AdminThemeTokens }));
}

export async function getAdminThemeTemplate(id: string) {
  const [row] = await db
    .select()
    .from(adminThemeTemplates)
    .where(eq(adminThemeTemplates.id, id));

  if (!row) return null;
  return { ...row, tokens: row.tokens as AdminThemeTokens };
}

export async function createAdminThemeTemplate(
  input: AdminThemeTemplateCreateInput
) {
  if (!input.name?.trim()) {
    throw new Error("admin_theme_template_invalid");
  }

  assertAdminThemeTokens(input.tokens);
  const now = new Date();

  const [row] = await db
    .insert(adminThemeTemplates)
    .values({
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      tokens: input.tokens,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { ...row, tokens: row.tokens as AdminThemeTokens };
}

export async function updateAdminThemeTemplate(
  id: string,
  input: AdminThemeTemplateUpdateInput
) {
  const update: Partial<typeof adminThemeTemplates.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("admin_theme_template_invalid");
    }
    update.name = input.name.trim();
  }

  if (input.description !== undefined) {
    update.description = input.description?.trim() ?? null;
  }

  if (input.tokens !== undefined) {
    assertAdminThemeTokens(input.tokens);
    update.tokens = input.tokens;
  }

  const [row] = await db
    .update(adminThemeTemplates)
    .set(update)
    .where(eq(adminThemeTemplates.id, id))
    .returning();

  if (!row) return null;
  return { ...row, tokens: row.tokens as AdminThemeTokens };
}

export async function deleteAdminThemeTemplate(id: string) {
  const [row] = await db
    .delete(adminThemeTemplates)
    .where(eq(adminThemeTemplates.id, id))
    .returning();

  if (!row) return null;
  return { ...row, tokens: row.tokens as AdminThemeTokens };
}
