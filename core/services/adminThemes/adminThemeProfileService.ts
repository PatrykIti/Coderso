import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { adminThemeProfiles, adminThemeTemplates } from "../../db/schema";

export type AdminThemeProfile = typeof adminThemeProfiles.$inferSelect;

export type AdminThemeProfileCreateInput = {
  name: string;
  description?: string | null;
  templateId: string;
  isActive?: boolean;
};

export type AdminThemeProfileUpdateInput = {
  name?: string;
  description?: string | null;
  templateId?: string;
};

export async function listAdminThemeProfiles(): Promise<AdminThemeProfile[]> {
  return db
    .select()
    .from(adminThemeProfiles)
    .orderBy(adminThemeProfiles.createdAt);
}

export async function getAdminThemeProfile(id: string) {
  const [row] = await db
    .select()
    .from(adminThemeProfiles)
    .where(eq(adminThemeProfiles.id, id));

  return row ?? null;
}

async function assertTemplateExists(templateId: string) {
  const [template] = await db
    .select({ id: adminThemeTemplates.id })
    .from(adminThemeTemplates)
    .where(eq(adminThemeTemplates.id, templateId));
  if (!template) throw new Error("admin_theme_template_not_found");
}

export async function createAdminThemeProfile(
  input: AdminThemeProfileCreateInput
) {
  if (!input.name?.trim()) {
    throw new Error("admin_theme_profile_invalid");
  }

  await assertTemplateExists(input.templateId);

  const now = new Date();

  if (input.isActive) {
    return db.transaction(async (tx) => {
      await tx
        .update(adminThemeProfiles)
        .set({ isActive: false, updatedAt: now });
      const [row] = await tx
        .insert(adminThemeProfiles)
        .values({
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          templateId: input.templateId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return row;
    });
  }

  const [row] = await db
    .insert(adminThemeProfiles)
    .values({
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      templateId: input.templateId,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function updateAdminThemeProfile(
  id: string,
  input: AdminThemeProfileUpdateInput
) {
  const update: Partial<typeof adminThemeProfiles.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("admin_theme_profile_invalid");
    }
    update.name = input.name.trim();
  }

  if (input.description !== undefined) {
    update.description = input.description?.trim() ?? null;
  }

  if (input.templateId !== undefined) {
    await assertTemplateExists(input.templateId);
    update.templateId = input.templateId;
  }

  const [row] = await db
    .update(adminThemeProfiles)
    .set(update)
    .where(eq(adminThemeProfiles.id, id))
    .returning();

  return row ?? null;
}

export async function activateAdminThemeProfile(profileId: string) {
  const [profile] = await db
    .select()
    .from(adminThemeProfiles)
    .where(eq(adminThemeProfiles.id, profileId));
  if (!profile) throw new Error("admin_theme_profile_not_found");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(adminThemeProfiles)
      .set({ isActive: false, updatedAt: now });
    await tx
      .update(adminThemeProfiles)
      .set({ isActive: true, updatedAt: now })
      .where(eq(adminThemeProfiles.id, profileId));
  });
}

export async function getActiveAdminThemeProfile() {
  const [row] = await db
    .select()
    .from(adminThemeProfiles)
    .where(eq(adminThemeProfiles.isActive, true));
  return row ?? null;
}
