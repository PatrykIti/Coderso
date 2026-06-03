import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { formActionRuns, formFields, forms, formSubmissions } from "../../db/schema";
import { invalidateLinkedDetailPageRouteCaches } from "../../site/cache/siteCache";
import { normalizeSubmissionAccess, type SubmissionAccessMode } from "./submissionAccess";
import {
  deriveFormSlug,
  normalizeFormFields,
  type FormFieldInput,
  type NormalizedFormField,
} from "./validation";
import { normalizeFormSettings } from "./formSettings";
import { normalizeFormStatus, type FormStatus } from "./formStatus";
import { normalizeFormSuccessRedirectUrl } from "./formRedirects";

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

export async function listForms() {
  return db.select().from(forms).orderBy(desc(forms.updatedAt));
}

export async function getForm(id: string) {
  const [row] = await db.select().from(forms).where(eq(forms.id, id));
  return row ?? null;
}

export async function countFormSubmissions(formId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId));
  return Number(row?.count ?? 0);
}

export async function countFormActionRuns(formId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(formActionRuns)
    .where(eq(formActionRuns.formId, formId));
  return Number(row?.count ?? 0);
}

export async function createForm(input: FormCreateInput) {
  const name = normalizeName(input.name);
  if (!name) throw new Error("form_name_required");
  const slug = deriveFormSlug(name, input.slug ?? null);
  const status = normalizeFormStatus(input.status, "draft");
  const description = normalizeDescription(input.description);
  const successMessage = normalizeSuccessMessage(input.successMessage);
  const successRedirectUrl = normalizeFormSuccessRedirectUrl(input.successRedirectUrl);
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
    const existing = await db.select({ id: forms.id }).from(forms).where(eq(forms.slug, slug));
    if (existing.length > 0 && existing[0]?.id !== id) {
      throw new Error("form_slug_exists");
    }
    update.slug = slug;
  }

  if (input.status !== undefined) {
    update.status = normalizeFormStatus(input.status, "draft");
  }

  if (input.description !== undefined) {
    update.description = normalizeDescription(input.description);
  }

  if (input.successMessage !== undefined) {
    update.successMessage = normalizeSuccessMessage(input.successMessage);
  }

  if (input.successRedirectUrl !== undefined) {
    update.successRedirectUrl = normalizeFormSuccessRedirectUrl(input.successRedirectUrl);
  }

  if (input.submissionAccess !== undefined) {
    update.submissionAccess = normalizeSubmissionAccess(input.submissionAccess, "public");
  }

  if (input.settings !== undefined) {
    update.settings = normalizeFormSettings(input.settings);
  }

  const [row] = await db.update(forms).set(update).where(eq(forms.id, id)).returning();

  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }

  return row ?? null;
}

export async function deleteForm(id: string) {
  const existing = await getForm(id);
  if (!existing) return null;
  const [submissionCount, actionRunCount] = await Promise.all([
    countFormSubmissions(id),
    countFormActionRuns(id),
  ]);
  if (submissionCount > 0 || actionRunCount > 0) {
    throw new Error("form_delete_restricted");
  }
  const [row] = await db.delete(forms).where(eq(forms.id, id)).returning();
  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }
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
    if (normalized.length === 0) return [] as (typeof formFields.$inferSelect)[];
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
  await invalidateLinkedDetailPageRouteCaches();

  return inserted as (typeof formFields.$inferSelect)[];
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
