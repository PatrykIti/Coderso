import { normalizeContentTypeConfig } from "../../content/contentTypeConfig";
import { isDeepStrictEqual } from "node:util";
import { normalizeListingTemplateWriteInput } from "../../content/listingTemplateConfig";
import {
  captureListingQueryNativeSnapshot,
  createListingQuery,
  mutateListingQueryAtomic,
  updateListingQuery,
  type ListingQueryNativeDesired,
  type ListingQueryNativeSnapshot,
} from "../../content/listingQueriesService";
import {
  captureListingTemplateNativeSnapshot,
  createListingTemplate,
  mutateListingTemplateAtomic,
  updateListingTemplate,
  type ListingTemplateNativeDesired,
  type ListingTemplateNativeSnapshot,
} from "../../content/listingTemplatesService";
import { parseListingQueryCreateInput } from "../../content/queryBuilderService";
import {
  captureContentTypeNativeSnapshot,
  createContentType,
  mutateContentTypeAtomic,
  normalizeContentTypeName,
  normalizeContentTypeSlug,
  normalizeContentTypeStatus,
  updateContentType,
  type ContentTypeNativeDesired,
  type ContentTypeNativeSnapshot,
} from "../../content/typeService";
import { assertContentSchema } from "../../content/validation";
import { normalizeFormActionsForWrite } from "../../forms/formActionsContract";
import { listFormActions, setFormActions } from "../../forms/formActionsService";
import {
  captureFormAggregateNativeSnapshot,
  mutateFormAggregateAtomic,
  normalizeFormAggregateNativeDesired,
  type FormAggregateNativeDesired,
  type FormAggregateNativeSnapshot,
} from "../../forms/formAggregateService";
import { normalizeFormSuccessRedirectUrl } from "../../forms/formRedirects";
import { normalizeFormSettings } from "../../forms/formSettings";
import { normalizeFormStatus } from "../../forms/formStatus";
import {
  createForm,
  deleteForm,
  getForm,
  listFormFields,
  setFormFields,
  updateForm,
} from "../../forms/formsService";
import { normalizeSubmissionAccess } from "../../forms/submissionAccess";
import {
  deriveFormSlug,
  normalizeFormFields,
  snapshotFormFieldsWriteShape,
} from "../../forms/validation";
import {
  capturePageTemplateNativeSnapshot,
  createPageTemplate,
  mutatePageTemplateAtomic,
  updatePageTemplate,
  type PageTemplateNativeDesired,
  type PageTemplateNativeSnapshot,
} from "../../pages/pageTemplateLibraryService";
import { normalizePageTemplateCreateInput } from "../../pages/pageTemplateLibrarySchema";
import { normalizeSettingValueForWrite, resolveSettingKey } from "../../settings/settingsService";
import {
  applyFullSiteSettingsBatchAtomic,
  captureFullSiteSettingsBatchRaw,
  restoreFullSiteSettingsBatchRawAtomic,
  type FullSiteRawSettingState,
} from "../../settings/fullSiteSettingsAtomicService";
import {
  assertFullSiteSagaAdapterApplyInput,
  assertDesiredKeys,
  createOrUpdate,
  desiredInput,
  projectNormalizedDesired,
  unsupportedPublish,
  unsupportedStage,
  validateJsonDesired,
  withoutKeys,
  isFullSiteSagaAdapterApplyInput,
  type AdapterApplyInput,
  type FullSiteNativeSnapshot,
  type FullSiteSagaAdapterPrepareInput,
  type NativeAtomicResourceAdapter,
  type ResourceAdapter,
} from "./adapterTypes";
import { assertFormNestedContract } from "./nestedValidation";

type DomainNativeSnapshot<TDesired extends object> = Readonly<{
  id: string;
  desired: TDesired;
}>;

type DomainAtomicMutation<TDesired extends object, TSnapshot> =
  | Readonly<{ operation: "create"; id: string; desired: TDesired; actorId: string }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: TDesired;
      expectedCurrent: TSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: TSnapshot;
      actorId: string;
    }>;

type AggregateAtomicOwner<
  TDesired extends object,
  TSnapshot extends DomainNativeSnapshot<TDesired>,
> = Readonly<{
  normalize(value: unknown): TDesired;
  capture(id: string): Promise<TSnapshot | null>;
  mutate(
    input: DomainAtomicMutation<TDesired, TSnapshot>
  ): Promise<Readonly<{ id: string; snapshot: TSnapshot | null }>>;
  notFoundCode: string;
  invalidCode: string;
}>;

const toJsonObject = (value: object): import("../fullSitePackage/types").JsonObject =>
  JSON.parse(JSON.stringify(value)) as import("../fullSitePackage/types").JsonObject;

const toDomainSnapshot = <
  TDesired extends object,
  TSnapshot extends DomainNativeSnapshot<TDesired>,
>(
  snapshot: FullSiteNativeSnapshot
): TSnapshot =>
  ({ id: snapshot.id, desired: structuredClone(snapshot.desired) }) as unknown as TSnapshot;

const fromDomainSnapshot = <TDesired extends object>(
  snapshot: DomainNativeSnapshot<TDesired>
): FullSiteNativeSnapshot => ({ id: snapshot.id, desired: toJsonObject(snapshot.desired) });

const withAggregateAtomicContract = <
  TDesired extends object,
  TSnapshot extends DomainNativeSnapshot<TDesired>,
>(
  legacy: ResourceAdapter,
  owner: AggregateAtomicOwner<TDesired, TSnapshot>
): ResourceAdapter &
  Required<
    Pick<
      ResourceAdapter,
      | "prepareNativeTargets"
      | "captureSnapshotById"
      | "deleteSnapshotAtomic"
      | "restoreSnapshotAtomic"
    >
  > => ({
  ...legacy,
  async applyDesired(input: AdapterApplyInput) {
    if (!isFullSiteSagaAdapterApplyInput(input)) return legacy.applyDesired(input);
    const target = toDomainSnapshot<TDesired, TSnapshot>(input.targetSnapshot);
    const result = await owner.mutate(
      input.operation === "create"
        ? {
            operation: "create",
            id: input.intendedId,
            desired: target.desired,
            actorId: input.actorId,
          }
        : {
            operation: "replace",
            id: input.currentId,
            desired: target.desired,
            expectedCurrent: toDomainSnapshot<TDesired, TSnapshot>(input.expectedSnapshot),
            actorId: input.actorId,
          }
    );
    if (
      result.id !== target.id ||
      !result.snapshot ||
      !isDeepStrictEqual(result.snapshot, target)
    ) {
      throw new Error("site_package_state_changed");
    }
    return { id: result.id, desired: input.targetSnapshot.desired };
  },
  async prepareNativeTargets(input: FullSiteSagaAdapterPrepareInput) {
    const id = input.operation === "create" ? input.intendedId : input.currentId;
    try {
      await legacy.validateDesired(input);
    } catch (error) {
      if (error instanceof Error && error.message === `${input.key}_invalid`) {
        throw new Error(owner.invalidCode);
      }
      throw error;
    }
    const desired = owner.normalize(input.desired);
    return { staged: null, complete: { id, desired: toJsonObject(desired) } };
  },
  async captureSnapshotById(id: string) {
    const snapshot = await owner.capture(id);
    if (!snapshot) throw new Error(owner.notFoundCode);
    return fromDomainSnapshot(snapshot);
  },
  async deleteSnapshotAtomic(input) {
    const result = await owner.mutate({
      operation: "delete",
      id: input.id,
      expectedCurrent: toDomainSnapshot<TDesired, TSnapshot>(input.expectedCurrent),
      actorId: input.actorId,
    });
    if (result.id !== input.id || result.snapshot !== null) {
      throw new Error("site_package_state_changed");
    }
  },
  async restoreSnapshotAtomic(input) {
    const target = toDomainSnapshot<TDesired, TSnapshot>(input.target);
    const result = await owner.mutate({
      operation: "replace",
      id: input.id,
      desired: target.desired,
      expectedCurrent: toDomainSnapshot<TDesired, TSnapshot>(input.expectedCurrent),
      actorId: input.actorId,
    });
    if (!result.snapshot || !isDeepStrictEqual(result.snapshot, target)) {
      throw new Error("site_package_state_changed");
    }
  },
});

const legacyContentTypeAdapter: ResourceAdapter = {
  validateDesired(input) {
    validateJsonDesired(input);
    assertDesiredKeys(
      input,
      ["name", "slug", "schema", "status", "config"],
      ["name", "slug", "schema", "status"]
    );
    if (typeof input.desired.name !== "string" || typeof input.desired.slug !== "string") {
      throw new Error("content_type_invalid");
    }
    const name = normalizeContentTypeName(input.desired.name);
    const slug = normalizeContentTypeSlug(input.desired.slug);
    const status = normalizeContentTypeStatus(
      typeof input.desired.status === "string" ? input.desired.status : undefined
    );
    const config = normalizeContentTypeConfig(input.desired.config);
    assertContentSchema(input.desired.schema);
    return projectNormalizedDesired(
      input,
      { name, slug, schema: input.desired.schema, status, config },
      ["name", "slug", "schema", "status"],
      "content_type_invalid"
    );
  },
  async applyDesired(input) {
    const row = await createOrUpdate(
      input,
      () => createContentType(desiredInput(input.desired)),
      (id) => updateContentType(id, desiredInput(input.desired)),
      "content_type_write_failed"
    );
    return { id: row.id, desired: input.desired };
  },
  applyStaged: unsupportedStage,
  publish: unsupportedPublish,
};

export const contentTypeAdapter = withAggregateAtomicContract<
  ContentTypeNativeDesired,
  ContentTypeNativeSnapshot
>(legacyContentTypeAdapter, {
  normalize(value) {
    const desired = value as Record<string, unknown>;
    if (
      typeof desired.name !== "string" ||
      typeof desired.slug !== "string" ||
      !desired.schema ||
      Array.isArray(desired.schema) ||
      typeof desired.schema !== "object"
    ) {
      throw new Error("content_type_invalid");
    }
    assertContentSchema(desired.schema);
    return {
      name: normalizeContentTypeName(desired.name),
      slug: normalizeContentTypeSlug(desired.slug),
      schema: desired.schema,
      status: normalizeContentTypeStatus(
        typeof desired.status === "string" ? desired.status : undefined
      ),
      config: normalizeContentTypeConfig(desired.config),
    } as ContentTypeNativeDesired;
  },
  capture: captureContentTypeNativeSnapshot,
  mutate: mutateContentTypeAtomic,
  notFoundCode: "content_type_not_found",
  invalidCode: "content_type_invalid",
});

export type FormResourceAdapterDeps = {
  createForm: typeof createForm;
  deleteForm: typeof deleteForm;
  getForm: typeof getForm;
  listFormFields: typeof listFormFields;
  listFormActions: typeof listFormActions;
  updateForm: typeof updateForm;
  setFormFields: typeof setFormFields;
  setFormActions: typeof setFormActions;
};

export const createFormResourceAdapter = (
  overrides: Partial<FormResourceAdapterDeps> = {}
): ResourceAdapter => {
  const deps: FormResourceAdapterDeps = {
    createForm,
    deleteForm,
    getForm,
    listFormFields,
    listFormActions,
    updateForm,
    setFormFields,
    setFormActions,
    ...overrides,
  };
  return {
    validateDesired(input) {
      validateJsonDesired(input);
      assertDesiredKeys(
        input,
        [
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
        ],
        ["name", "slug", "status", "fields", "actions"]
      );
      if (
        (input.desired.fields !== undefined && !Array.isArray(input.desired.fields)) ||
        (input.desired.actions !== undefined && !Array.isArray(input.desired.actions))
      ) {
        throw new Error("form_invalid");
      }
      assertFormNestedContract(input.desired);
      if (typeof input.desired.name !== "string" || !input.desired.name.trim()) {
        throw new Error("form_name_required");
      }
      const name = input.desired.name.trim();
      const slug = deriveFormSlug(
        name,
        typeof input.desired.slug === "string" || input.desired.slug === null
          ? input.desired.slug
          : undefined
      );
      const normalizeOptionalText = (value: unknown) => {
        if (value === undefined || value === null) return null;
        if (typeof value !== "string") throw new Error("form_invalid");
        return value.trim() || null;
      };
      const fields = normalizeFormFields(snapshotFormFieldsWriteShape(input.desired.fields ?? []));
      const fieldOrderIndexes = new Set<number>();
      for (const field of fields) {
        if (fieldOrderIndexes.has(field.orderIndex)) throw new Error("form_invalid");
        fieldOrderIndexes.add(field.orderIndex);
      }
      fields.sort(
        (left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id)
      );
      const normalized = {
        name,
        slug,
        status: normalizeFormStatus(input.desired.status, "draft"),
        description: normalizeOptionalText(input.desired.description),
        successMessage: normalizeOptionalText(input.desired.successMessage),
        successRedirectUrl: normalizeFormSuccessRedirectUrl(input.desired.successRedirectUrl),
        submissionAccess: normalizeSubmissionAccess(input.desired.submissionAccess, "public"),
        settings: normalizeFormSettings(input.desired.settings),
        fields,
        actions: normalizeFormActionsForWrite(input.desired.actions ?? [], {
          requireStableIds: true,
        }),
      };
      return projectNormalizedDesired(
        input,
        normalized,
        ["name", "slug", "status", "fields", "actions"],
        "form_invalid"
      );
    },
    async applyDesired(input) {
      const fields = Array.isArray(input.desired.fields) ? input.desired.fields : [];
      const actions = Array.isArray(input.desired.actions) ? input.desired.actions : [];
      const formDesired = withoutKeys(input.desired, ["fields", "actions"]);
      const before =
        input.operation === "update" && input.currentId
          ? await Promise.all([
              deps.getForm(input.currentId),
              deps.listFormFields(input.currentId),
              deps.listFormActions(input.currentId),
            ])
          : null;
      const row = await createOrUpdate(
        input,
        () => deps.createForm(desiredInput(formDesired)),
        (id) => deps.updateForm(id, desiredInput(formDesired)),
        "form_write_failed"
      );
      try {
        await deps.setFormFields(row.id, desiredInput(fields));
        await deps.setFormActions(row.id, actions);
      } catch (error) {
        if (input.operation === "create") {
          await deps.deleteForm(row.id);
        } else if (before?.[0]) {
          const previous = before[0];
          await deps.updateForm(row.id, {
            name: previous.name,
            slug: previous.slug,
            status: normalizeFormStatus(previous.status, "draft"),
            description: previous.description,
            successMessage: previous.successMessage,
            successRedirectUrl: previous.successRedirectUrl,
            submissionAccess: previous.submissionAccess as "public" | "internal",
            settings: previous.settings,
          });
          await deps.setFormFields(row.id, desiredInput(before[1]));
          await deps.setFormActions(row.id, before[2]);
        }
        throw error;
      }
      return { id: row.id, desired: input.desired };
    },
    applyStaged: unsupportedStage,
    publish: unsupportedPublish,
  };
};

const legacyFormAdapter = createFormResourceAdapter();
export const formAdapter = withAggregateAtomicContract<
  FormAggregateNativeDesired,
  FormAggregateNativeSnapshot
>(legacyFormAdapter, {
  normalize: normalizeFormAggregateNativeDesired,
  capture: captureFormAggregateNativeSnapshot,
  mutate: mutateFormAggregateAtomic,
  notFoundCode: "form_not_found",
  invalidCode: "form_invalid",
});

const legacyPageTemplateAdapter: ResourceAdapter = {
  validateDesired(input) {
    validateJsonDesired(input);
    assertDesiredKeys(
      input,
      ["name", "slug", "description", "category", "status", "document"],
      ["name", "slug", "status", "document"]
    );
    return projectNormalizedDesired(
      input,
      normalizePageTemplateCreateInput(input.desired),
      ["name", "slug", "status", "document"],
      "page_template_invalid"
    );
  },
  async applyDesired(input) {
    const row = await createOrUpdate(
      input,
      () => createPageTemplate(input.desired),
      (id) => updatePageTemplate(id, input.desired),
      "page_template_write_failed"
    );
    return { id: row.id, desired: input.desired };
  },
  applyStaged: unsupportedStage,
  publish: unsupportedPublish,
};

export const pageTemplateAdapter = withAggregateAtomicContract<
  PageTemplateNativeDesired,
  PageTemplateNativeSnapshot
>(legacyPageTemplateAdapter, {
  normalize: normalizePageTemplateCreateInput,
  capture: capturePageTemplateNativeSnapshot,
  mutate: mutatePageTemplateAtomic,
  notFoundCode: "page_template_not_found",
  invalidCode: "page_template_invalid",
});

const legacyListingTemplateAdapter: ResourceAdapter = {
  validateDesired(input) {
    validateJsonDesired(input);
    assertDesiredKeys(
      input,
      ["name", "slug", "description", "layout", "config"],
      ["name", "slug", "layout", "config"]
    );
    return projectNormalizedDesired(
      input,
      normalizeListingTemplateWriteInput(input.desired),
      ["name", "slug", "layout", "config"],
      "listing_template_invalid"
    );
  },
  async applyDesired(input) {
    const row = await createOrUpdate(
      input,
      () => createListingTemplate(desiredInput(input.desired)),
      (id) => updateListingTemplate(id, desiredInput(input.desired)),
      "listing_template_write_failed"
    );
    return { id: row.id, desired: input.desired };
  },
  applyStaged: unsupportedStage,
  publish: unsupportedPublish,
};

export const listingTemplateAdapter = withAggregateAtomicContract<
  ListingTemplateNativeDesired,
  ListingTemplateNativeSnapshot
>(legacyListingTemplateAdapter, {
  normalize: normalizeListingTemplateWriteInput,
  capture: captureListingTemplateNativeSnapshot,
  mutate: mutateListingTemplateAtomic,
  notFoundCode: "listing_template_not_found",
  invalidCode: "listing_template_invalid",
});

const legacyListingQueryAdapter: ResourceAdapter = {
  validateDesired(input) {
    validateJsonDesired(input);
    assertDesiredKeys(input, ["name", "description", "query"], ["name", "query"]);
    return projectNormalizedDesired(
      input,
      parseListingQueryCreateInput(input.desired),
      ["name", "query"],
      "listing_query_invalid"
    );
  },
  async applyDesired(input) {
    const row = await createOrUpdate(
      input,
      () => createListingQuery(input.desired),
      (id) => updateListingQuery(id, input.desired),
      "listing_query_write_failed"
    );
    return { id: row.id, desired: input.desired };
  },
  applyStaged: unsupportedStage,
  publish: unsupportedPublish,
};

export const listingQueryAdapter = withAggregateAtomicContract<
  ListingQueryNativeDesired,
  ListingQueryNativeSnapshot
>(legacyListingQueryAdapter, {
  normalize: parseListingQueryCreateInput,
  capture: captureListingQueryNativeSnapshot,
  mutate: mutateListingQueryAtomic,
  notFoundCode: "listing_query_not_found",
  invalidCode: "listing_query_invalid",
});

const settingStateToSnapshot = (
  state: FullSiteRawSettingState
): import("./adapterTypes").FullSiteNativeSnapshot => ({
  id: state.key,
  desired: state.present
    ? { present: true, value: structuredClone(state.value) }
    : { present: false },
});

const settingSnapshotToState = (
  snapshot: import("./adapterTypes").FullSiteNativeSnapshot
): FullSiteRawSettingState => {
  const keys = Reflect.ownKeys(snapshot.desired);
  if (snapshot.desired.present === false && keys.length === 1 && keys[0] === "present") {
    return { key: resolveSettingKey(snapshot.id), present: false };
  }
  if (
    snapshot.desired.present === true &&
    keys.length === 2 &&
    keys.includes("present") &&
    keys.includes("value")
  ) {
    const key = resolveSettingKey(snapshot.id);
    return { key, present: true, value: snapshot.desired.value };
  }
  throw new Error("site_package_invalid");
};

const absentSettingState = (key: string): FullSiteRawSettingState => ({
  key: resolveSettingKey(key),
  present: false,
});

export const settingAdapter: NativeAtomicResourceAdapter &
  Required<Pick<ResourceAdapter, "applySettingsBatchAtomic" | "reverseSettingsBatch">> = {
  validateDesired(input) {
    validateJsonDesired(input);
    assertDesiredKeys(input, ["value"], ["value"]);
    if (!Object.prototype.hasOwnProperty.call(input.desired, "value")) {
      throw new Error("setting_invalid");
    }
    const normalized = normalizeSettingValueForWrite(input.key, input.desired.value);
    return projectNormalizedDesired(
      input,
      { value: normalized.value },
      ["value"],
      "setting_invalid"
    );
  },
  async applyDesired(input) {
    const key = normalizeSettingValueForWrite(input.key, input.desired.value).key;
    const [current] = await captureFullSiteSettingsBatchRaw([key]);
    if (!current) throw new Error("setting_batch_write_failed");
    const target: FullSiteRawSettingState = {
      key,
      present: true,
      value: normalizeSettingValueForWrite(key, input.desired.value).value,
    };
    await applyFullSiteSettingsBatchAtomic({
      expectedCurrent: [input.operation === "create" ? absentSettingState(key) : current],
      target: [target],
    });
    return { id: key, desired: input.desired };
  },
  async applyBatch(inputs) {
    const ordered = [...inputs].sort((left, right) => left.key.localeCompare(right.key));
    const keys = ordered.map(
      (input) => normalizeSettingValueForWrite(input.key, input.desired.value).key
    );
    const current = await captureFullSiteSettingsBatchRaw(keys);
    const expectedCurrent = ordered.map((input, index) =>
      input.operation === "create" ? absentSettingState(keys[index]!) : current[index]!
    );
    const target = ordered.map((input, index): FullSiteRawSettingState => ({
      key: keys[index]!,
      present: true,
      value: normalizeSettingValueForWrite(input.key, input.desired.value).value,
    }));
    await applyFullSiteSettingsBatchAtomic({ expectedCurrent, target });
    return inputs.map((input) => ({ id: input.key, desired: input.desired }));
  },
  applyStaged: unsupportedStage,
  publish: unsupportedPublish,
  async prepareNativeTargets(input) {
    const normalized = normalizeSettingValueForWrite(input.key, input.desired.value);
    return {
      staged: null,
      complete: {
        id: normalized.key,
        desired: { present: true, value: structuredClone(normalized.value) },
      },
    };
  },
  async captureSnapshotById(id) {
    const key = resolveSettingKey(id);
    const [state] = await captureFullSiteSettingsBatchRaw([key]);
    if (!state) throw new Error("setting_batch_write_failed");
    return settingStateToSnapshot(state);
  },
  async deleteSnapshotAtomic(input) {
    await restoreFullSiteSettingsBatchRawAtomic({
      expectedCurrent: [settingSnapshotToState(input.expectedCurrent)],
      target: [absentSettingState(input.id)],
    });
  },
  async restoreSnapshotAtomic(input) {
    await restoreFullSiteSettingsBatchRawAtomic({
      expectedCurrent: [settingSnapshotToState(input.expectedCurrent)],
      target: [settingSnapshotToState(input.target)],
    });
  },
  async applySettingsBatchAtomic(input) {
    const items = [...input.items].sort((left, right) => left.key.localeCompare(right.key));
    for (const item of items) assertFullSiteSagaAdapterApplyInput(item);
    const expectedCurrent = items.map((item) =>
      item.operation === "create"
        ? absentSettingState(item.key)
        : settingSnapshotToState(item.expectedSnapshot)
    );
    const target = items.map((item) => settingSnapshotToState(item.targetSnapshot));
    const applied = await applyFullSiteSettingsBatchAtomic({ expectedCurrent, target });
    return applied.map(settingStateToSnapshot);
  },
  async reverseSettingsBatch(input) {
    const items = [...input.items].sort((left, right) => left.id.localeCompare(right.id));
    const expectedCurrent = items.map((item) => settingSnapshotToState(item.expectedCurrent));
    const target = items.map((item) =>
      item.operation === "create"
        ? absentSettingState(item.id)
        : settingSnapshotToState(item.target)
    );
    await restoreFullSiteSettingsBatchRawAtomic({ expectedCurrent, target });
  },
};
