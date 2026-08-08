import { asc, eq } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { formActionRuns, formActions, formFields, forms, formSubmissions } from "../../db/schema";
import { invalidateLinkedDetailPageRouteCaches } from "../../site/cache/siteCache";
import { classifyForbiddenValue, isSensitiveFieldKey } from "../kits/fullSitePackage/valueSecurity";
import { normalizeFormActionsForWrite, type NormalizedFormAction } from "./formActionsContract";
import { setFormActionsTx } from "./formActionsService";
import { normalizeFormSuccessRedirectUrl } from "./formRedirects";
import { normalizeFormSettings } from "./formSettings";
import { normalizeFormStatus, type FormStatus } from "./formStatus";
import { normalizeSubmissionAccess, type SubmissionAccessMode } from "./submissionAccess";
import {
  deriveFormSlug,
  normalizeFormFields,
  snapshotFormFieldsWriteShape,
  type NormalizedFormField,
} from "./validation";

export type FormAggregateNativeDesired = Readonly<{
  name: string;
  slug: string;
  status: FormStatus;
  description: string | null;
  successMessage: string | null;
  successRedirectUrl: string | null;
  submissionAccess: SubmissionAccessMode;
  settings: ReturnType<typeof normalizeFormSettings>;
  fields: readonly NormalizedFormField[];
  actions: readonly NormalizedFormAction[];
}>;

export type FormAggregateNativeSnapshot = Readonly<{
  id: string;
  desired: FormAggregateNativeDesired;
}>;

export type FormAggregateAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: FormAggregateNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: FormAggregateNativeDesired;
      expectedCurrent: FormAggregateNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: FormAggregateNativeSnapshot;
      actorId: string;
    }>;

export type FormAggregateAtomicMutationResult = Readonly<{
  id: string;
  snapshot: FormAggregateNativeSnapshot | null;
}>;

type FormAggregateTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const FORM_DESIRED_KEYS = new Set([
  "name",
  "slug",
  "status",
  "description",
  "successMessage",
  "successRedirectUrl",
  "submissionAccess",
  "settings",
  "fields",
  "actions",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeOptionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("form_invalid");
  return value.trim() || null;
};

export const normalizeFormAggregateNativeDesired = (input: unknown): FormAggregateNativeDesired => {
  if (!isRecord(input) || Object.keys(input).some((key) => !FORM_DESIRED_KEYS.has(key))) {
    throw new Error("form_invalid");
  }
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    typeof input.slug !== "string" ||
    !Array.isArray(input.fields) ||
    !Array.isArray(input.actions)
  ) {
    throw new Error("form_invalid");
  }
  const name = input.name.trim();
  const fields = normalizeFormFields(snapshotFormFieldsWriteShape(input.fields)).sort(
    (left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id)
  );
  const fieldOrders = new Set(fields.map((field) => field.orderIndex));
  if (fieldOrders.size !== fields.length) throw new Error("form_invalid");
  const actions = normalizeFormActionsForWrite(input.actions, { requireStableIds: true });
  assertFormActionsSafeForDurableSnapshot(actions);
  return Object.freeze({
    name,
    slug: deriveFormSlug(name, input.slug),
    status: normalizeFormStatus(input.status, "draft"),
    description: normalizeOptionalText(input.description),
    successMessage: normalizeOptionalText(input.successMessage),
    successRedirectUrl: normalizeFormSuccessRedirectUrl(input.successRedirectUrl),
    submissionAccess: normalizeSubmissionAccess(input.submissionAccess, "public"),
    settings: normalizeFormSettings(input.settings),
    fields: Object.freeze(fields),
    actions: Object.freeze(actions),
  });
};

const assertStringSafe = (value: string): void => {
  if (classifyForbiddenValue(value, { explicitBinaryCarrier: false })) {
    throw new Error("site_package_invalid");
  }
};

const inspectActionValue = (value: unknown): void => {
  if (typeof value === "string") {
    assertStringSafe(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) inspectActionValue(child);
    return;
  }
  if (!isRecord(value)) return;
  for (const child of Object.values(value)) inspectActionValue(child);
};

export const assertFormActionsSafeForDurableSnapshot = (
  actions: readonly NormalizedFormAction[]
): void => {
  for (const action of actions) {
    if (action.type === "webhook") {
      const headers =
        isRecord(action.config) && isRecord(Reflect.get(action.config, "headers"))
          ? Reflect.get(action.config, "headers")
          : null;
      if (!headers) throw new Error("site_package_invalid");
      for (const [name, value] of Object.entries(headers)) {
        if (isSensitiveFieldKey(name) || typeof value !== "string") {
          throw new Error("site_package_invalid");
        }
        assertStringSafe(value);
      }
    }
    inspectActionValue(action.condition);
    inspectActionValue(action.config);
    assertStringSafe(action.label);
  }
};

const rowsToSnapshot = (
  form: typeof forms.$inferSelect,
  fields: readonly (typeof formFields.$inferSelect)[],
  actions: readonly (typeof formActions.$inferSelect)[]
): FormAggregateNativeSnapshot => {
  const desired = normalizeFormAggregateNativeDesired({
    name: form.name,
    slug: form.slug,
    status: form.status,
    description: form.description,
    successMessage: form.successMessage,
    successRedirectUrl: form.successRedirectUrl,
    submissionAccess: form.submissionAccess,
    settings: form.settings,
    fields: fields.map((field) => ({
      id: field.id,
      type: field.type,
      label: field.label,
      name: field.name,
      required: field.required,
      settings: field.settings,
      orderIndex: field.orderIndex,
    })),
    actions: actions.map((action) => ({
      id: action.id,
      type: action.type,
      label: action.label,
      enabled: action.enabled,
      continueOnError: action.continueOnError,
      condition: action.condition,
      config: action.config,
      orderIndex: action.orderIndex,
    })),
  });
  return { id: form.id, desired };
};

const readFormAggregateTx = async (
  tx: FormAggregateTransaction,
  id: string,
  lock: boolean
): Promise<FormAggregateNativeSnapshot | null> => {
  const baseSelect = tx.select().from(forms).where(eq(forms.id, id));
  const [form] = lock ? await baseSelect.for("update") : await baseSelect;
  if (!form) return null;
  const fieldSelect = tx
    .select()
    .from(formFields)
    .where(eq(formFields.formId, id))
    .orderBy(asc(formFields.orderIndex), asc(formFields.id));
  const fields = lock ? await fieldSelect.for("update") : await fieldSelect;
  const actionSelect = tx
    .select()
    .from(formActions)
    .where(eq(formActions.formId, id))
    .orderBy(asc(formActions.orderIndex), asc(formActions.id));
  const actions = lock ? await actionSelect.for("update") : await actionSelect;
  return rowsToSnapshot(form, fields, actions);
};

const assertSlugAvailableTx = async (
  tx: FormAggregateTransaction,
  slug: string,
  excludeId?: string
): Promise<void> => {
  const rows = await tx.select({ id: forms.id }).from(forms).where(eq(forms.slug, slug));
  if (rows.some((row) => row.id !== excludeId)) throw new Error("form_slug_exists");
};

const writeFieldsTx = async (
  tx: FormAggregateTransaction,
  formId: string,
  fields: readonly NormalizedFormField[]
): Promise<void> => {
  await tx.delete(formFields).where(eq(formFields.formId, formId));
  if (fields.length === 0) return;
  const now = new Date();
  await tx.insert(formFields).values(
    fields.map((field) => ({
      id: field.id,
      formId,
      type: field.type,
      label: field.label,
      name: field.name,
      required: field.required,
      settings: field.settings,
      orderIndex: field.orderIndex,
      createdAt: now,
      updatedAt: now,
    }))
  );
};

const writeFormBaseTx = async (
  tx: FormAggregateTransaction,
  id: string,
  desired: FormAggregateNativeDesired,
  operation: "create" | "replace"
): Promise<void> => {
  const values = {
    name: desired.name,
    slug: desired.slug,
    status: desired.status,
    description: desired.description,
    successMessage: desired.successMessage,
    successRedirectUrl: desired.successRedirectUrl,
    submissionAccess: desired.submissionAccess,
    settings: desired.settings,
    updatedAt: new Date(),
  };
  if (operation === "create") {
    await tx.insert(forms).values({ id, ...values, createdAt: new Date() });
  } else {
    const [row] = await tx
      .update(forms)
      .set(values)
      .where(eq(forms.id, id))
      .returning({ id: forms.id });
    if (!row) throw new Error("site_package_state_changed");
  }
};

export const captureFormAggregateNativeSnapshot = async (
  id: string
): Promise<FormAggregateNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    return readFormAggregateTx(tx, id, false);
  });

export async function mutateFormAggregateAtomic(
  input: FormAggregateAtomicMutation
): Promise<FormAggregateAtomicMutationResult> {
  let invalidate = false;
  const result = await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    if (input.operation === "create") {
      const desired = normalizeFormAggregateNativeDesired(input.desired);
      await assertSlugAvailableTx(tx, desired.slug);
      await writeFormBaseTx(tx, input.id, desired, "create");
      await writeFieldsTx(tx, input.id, desired.fields);
      await setFormActionsTx(tx, input.id, desired.actions, { requireStableIds: true });
      const snapshot = await readFormAggregateTx(tx, input.id, false);
      if (!snapshot) throw new Error("form_write_failed");
      return { id: input.id, snapshot };
    }

    const current = await readFormAggregateTx(tx, input.id, true);
    if (
      !current ||
      input.expectedCurrent.id !== input.id ||
      !isDeepStrictEqual(current, input.expectedCurrent)
    ) {
      throw new Error("site_package_state_changed");
    }
    invalidate = true;
    if (input.operation === "delete") {
      const [submission] = await tx
        .select({ id: formSubmissions.id })
        .from(formSubmissions)
        .where(eq(formSubmissions.formId, input.id))
        .limit(1)
        .for("update");
      const [actionRun] = await tx
        .select({ id: formActionRuns.id })
        .from(formActionRuns)
        .where(eq(formActionRuns.formId, input.id))
        .limit(1)
        .for("update");
      if (submission || actionRun) throw new Error("site_package_state_changed");
      const [deleted] = await tx
        .delete(forms)
        .where(eq(forms.id, input.id))
        .returning({ id: forms.id });
      if (!deleted) throw new Error("site_package_state_changed");
      return { id: input.id, snapshot: null };
    }

    const desired = normalizeFormAggregateNativeDesired(input.desired);
    await assertSlugAvailableTx(tx, desired.slug, input.id);
    await writeFormBaseTx(tx, input.id, desired, "replace");
    await writeFieldsTx(tx, input.id, desired.fields);
    await setFormActionsTx(tx, input.id, desired.actions, { requireStableIds: true });
    const snapshot = await readFormAggregateTx(tx, input.id, false);
    if (!snapshot) throw new Error("site_package_state_changed");
    return { id: input.id, snapshot };
  });
  if (invalidate) await invalidateLinkedDetailPageRouteCaches();
  return result;
}
