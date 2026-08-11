import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { formActionRuns, formFields, forms, formSubmissions } from "../../db/schema";
import { invalidateLinkedDetailPageRouteCaches } from "../../site/cache/siteCache";
import {
  normalizeSubmissionAccess,
  SUBMISSION_ACCESS_MODE_VALUES,
  type SubmissionAccessMode,
} from "./submissionAccess";
import {
  deriveFormSlug,
  normalizeFormFields,
  snapshotFormFieldsWriteShape,
  type FormFieldInput,
  type NormalizedFormField,
} from "./validation";
import { normalizeFormSettings } from "./formSettings";
import { isFormStatus, normalizeFormStatus, type FormStatus } from "./formStatus";
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

export type FormWriteState = Readonly<{
  status: FormStatus;
  submissionAccess: SubmissionAccessMode;
}>;

export async function getFormWriteState(id: string): Promise<FormWriteState | null> {
  const [row] = await db
    .select({
      status: forms.status,
      submissionAccess: forms.submissionAccess,
    })
    .from(forms)
    .where(eq(forms.id, id));

  if (
    !row ||
    !isFormStatus(row.status) ||
    !SUBMISSION_ACCESS_MODE_VALUES.some((mode) => mode === row.submissionAccess)
  ) {
    return null;
  }

  return Object.freeze({
    status: row.status,
    submissionAccess: row.submissionAccess as SubmissionAccessMode,
  });
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
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const name = normalizeName(input.name);
      if (!name) throw new Error("form_name_required");
      const slug = deriveFormSlug(name, input.slug ?? null);
      const status = normalizeFormStatus(input.status, "draft");
      const description = normalizeDescription(input.description);
      const successMessage = normalizeSuccessMessage(input.successMessage);
      const successRedirectUrl = normalizeFormSuccessRedirectUrl(input.successRedirectUrl);
      const submissionAccess = normalizeSubmissionAccess(input.submissionAccess, "public");
      const settings = normalizeFormSettings(input.settings);
      const existing = await tx.select({ id: forms.id }).from(forms).where(eq(forms.slug, slug));
      if (existing.length > 0) throw new Error("form_slug_exists");
      const now = new Date();
      const [row] = await tx
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
    },
    { isolationLevel: "read committed" }
  );
}

export async function updateForm(id: string, input: FormUpdateInput) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx.select().from(forms).where(eq(forms.id, id)).for("update");
      if (!existing) return null;
      const update: Partial<typeof forms.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) {
        const name = normalizeName(input.name);
        if (!name) throw new Error("form_name_required");
        update.name = name;
      }
      if (input.slug !== undefined) {
        const slug = deriveFormSlug(update.name ?? existing.name, input.slug);
        const conflict = await tx.select({ id: forms.id }).from(forms).where(eq(forms.slug, slug));
        if (conflict.some((candidate) => candidate.id !== id)) throw new Error("form_slug_exists");
        update.slug = slug;
      }
      if (input.status !== undefined) update.status = normalizeFormStatus(input.status, "draft");
      if (input.description !== undefined)
        update.description = normalizeDescription(input.description);
      if (input.successMessage !== undefined)
        update.successMessage = normalizeSuccessMessage(input.successMessage);
      if (input.successRedirectUrl !== undefined) {
        update.successRedirectUrl = normalizeFormSuccessRedirectUrl(input.successRedirectUrl);
      }
      if (input.submissionAccess !== undefined) {
        update.submissionAccess = normalizeSubmissionAccess(input.submissionAccess, "public");
      }
      if (input.settings !== undefined) update.settings = normalizeFormSettings(input.settings);
      const [updated] = await tx.update(forms).set(update).where(eq(forms.id, id)).returning();
      return updated ?? null;
    },
    { isolationLevel: "read committed" }
  );

  if (row) {
    await invalidateLinkedDetailPageRouteCaches();
  }

  return row ?? null;
}

export async function deleteForm(id: string) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.id, id))
        .for("update");
      if (!existing) return null;
      const [submissionCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(formSubmissions)
        .where(eq(formSubmissions.formId, id));
      const [actionRunCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(formActionRuns)
        .where(eq(formActionRuns.formId, id));
      if (Number(submissionCount?.count ?? 0) > 0 || Number(actionRunCount?.count ?? 0) > 0) {
        throw new Error("form_delete_restricted");
      }
      const [deleted] = await tx.delete(forms).where(eq(forms.id, id)).returning();
      return deleted ?? null;
    },
    { isolationLevel: "read committed" }
  );
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
  const fieldsSnapshot = snapshotFormFieldsWriteShape(fieldsInput);
  const inserted = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [form] = await tx
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.id, formId))
        .for("update");
      if (!form) throw new Error("form_not_found");
      const normalized = normalizeFormFields(fieldsSnapshot);
      const now = new Date();
      await tx.delete(formFields).where(eq(formFields.formId, formId));
      const rows =
        normalized.length === 0
          ? []
          : await tx
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
      await tx.update(forms).set({ updatedAt: now }).where(eq(forms.id, formId));
      return rows;
    },
    { isolationLevel: "read committed" }
  );
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
