import { asc, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { formFields, forms } from "../../db/schema";
import {
  normalizeSubmissionAccess,
  type SubmissionAccessMode,
} from "./submissionAccess";
import {
  deriveFormSlug,
  normalizeFormFields,
  type FormFieldInput,
  type NormalizedFormField,
} from "./validation";
import { normalizeFormSettings } from "./formSettings";

export type FormStatus = "draft" | "published" | "archived";

export type FormCreateInput = {
  name: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: SubmissionAccessMode;
  settings?: unknown;
};

export type FormUpdateInput = {
  name?: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: SubmissionAccessMode;
  settings?: unknown;
};

const allowedStatuses = new Set<FormStatus>(["draft", "published", "archived"]);

const normalizeName = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeDescription = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("form_invalid");
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSuccessMessage = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("form_invalid");
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSuccessRedirectUrl = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("form_invalid");
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeStatus = (value: unknown, fallback: FormStatus) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && allowedStatuses.has(value as FormStatus)) {
    return value as FormStatus;
  }
  throw new Error("form_invalid");
};

export async function listForms() {
  return db.select().from(forms).orderBy(desc(forms.updatedAt));
}

export async function getForm(id: string) {
  const [row] = await db.select().from(forms).where(eq(forms.id, id));
  return row ?? null;
}

export async function createForm(input: FormCreateInput) {
  const name = normalizeName(input.name);
  if (!name) throw new Error("form_name_required");
  const slug = deriveFormSlug(name, input.slug ?? null);
  const status = normalizeStatus(input.status, "draft");
  const description = normalizeDescription(input.description);
  const successMessage = normalizeSuccessMessage(input.successMessage);
  const successRedirectUrl = normalizeSuccessRedirectUrl(input.successRedirectUrl);
  const submissionAccess = normalizeSubmissionAccess(input.submissionAccess, "public");
  const settings = normalizeFormSettings(input.settings);

  const existing = await db.select({ id: forms.id }).from(forms).where(eq(forms.slug, slug));
  if (existing.length > 0) throw new Error("form_slug_exists");

  const now = new Date();
  const [row] = await db
    .insert(forms)
    .values({
      name,
      slug,
      status,
      description,
      successMessage,
      successRedirectUrl,
      submissionAccess,
      settings,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row ?? null;
}

export async function updateForm(id: string, input: FormUpdateInput) {
  const update: Partial<typeof forms.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const name = normalizeName(input.name);
    if (!name) throw new Error("form_name_required");
    update.name = name;
  }

  if (input.slug !== undefined) {
    const baseName = update.name ?? (await getForm(id))?.name;
    if (!baseName) throw new Error("form_not_found");
    const slug = deriveFormSlug(baseName, input.slug);
    const existing = await db
      .select({ id: forms.id })
      .from(forms)
      .where(eq(forms.slug, slug));
    if (existing.length > 0 && existing[0]?.id !== id) {
      throw new Error("form_slug_exists");
    }
    update.slug = slug;
  }

  if (input.status !== undefined) {
    update.status = normalizeStatus(input.status, "draft");
  }

  if (input.description !== undefined) {
    update.description = normalizeDescription(input.description);
  }

  if (input.successMessage !== undefined) {
    update.successMessage = normalizeSuccessMessage(input.successMessage);
  }

  if (input.successRedirectUrl !== undefined) {
    update.successRedirectUrl = normalizeSuccessRedirectUrl(input.successRedirectUrl);
  }

  if (input.submissionAccess !== undefined) {
    update.submissionAccess = normalizeSubmissionAccess(input.submissionAccess, "public");
  }

  if (input.settings !== undefined) {
    update.settings = normalizeFormSettings(input.settings);
  }

  const [row] = await db
    .update(forms)
    .set(update)
    .where(eq(forms.id, id))
    .returning();

  return row ?? null;
}

export async function deleteForm(id: string) {
  const [row] = await db.delete(forms).where(eq(forms.id, id)).returning();
  return row ?? null;
}

export async function listFormFields(formId: string) {
  return db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.orderIndex));
}

export async function setFormFields(formId: string, fieldsInput: FormFieldInput[]) {
  const form = await getForm(formId);
  if (!form) throw new Error("form_not_found");

  const normalized = normalizeFormFields(fieldsInput);
  const now = new Date();

  const inserted = await db.transaction(async (tx) => {
    await tx.delete(formFields).where(eq(formFields.formId, formId));
    if (normalized.length === 0) return [] as typeof formFields.$inferSelect[];
    return tx
      .insert(formFields)
      .values(
        normalized.map((field) => ({
          formId,
          id: field.id,
          type: field.type,
          label: field.label,
          name: field.name,
          required: field.required,
          settings: field.settings,
          orderIndex: field.orderIndex,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
  });

  await db.update(forms).set({ updatedAt: now }).where(eq(forms.id, formId));

  return inserted as typeof formFields.$inferSelect[];
}

export function toFieldRecord(row: typeof formFields.$inferSelect): NormalizedFormField {
  return {
    id: row.id,
    type: row.type as NormalizedFormField["type"],
    label: row.label,
    name: row.name,
    required: row.required,
    orderIndex: row.orderIndex,
    settings: (row.settings ?? {}) as NormalizedFormField["settings"],
  };
}
