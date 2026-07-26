import { createContentType, updateContentType } from "../../content/typeService";
import {
  createEntry,
  getEntry,
  publishEntry,
  unpublishEntry,
  updateEntry,
} from "../../content/entryService";
import {
  createDetailPageDraftDocument,
  getDetailPageDocument,
  publishDetailPageDocument,
  unpublishDetailPageDocument,
  updateDetailPageDraftDocument,
} from "../../content/detailPageDocumentService";
import { createListingQuery, updateListingQuery } from "../../content/listingQueriesService";
import {
  createListingTemplate,
  updateListingTemplate,
} from "../../content/listingTemplatesService";
import { listFormActions, setFormActions } from "../../forms/formActionsService";
import {
  createForm,
  deleteForm,
  getForm,
  listFormFields,
  setFormFields,
  updateForm,
} from "../../forms/formsService";
import {
  createMenu,
  deleteMenu,
  getMenu,
  listMenuItems,
  moveMenuToDraft,
  publishMenu,
  replaceMenuItems,
  updateMenu,
} from "../../menus/menuService";
import {
  createPage,
  getPage,
  publishPage,
  unpublishPage,
  updatePage,
} from "../../pages/pageService";
import { createPageTemplate, updatePageTemplate } from "../../pages/pageTemplateLibraryService";
import { applySettingsBatch, normalizeSettingValueForWrite } from "../../settings/settingsService";
import type { JsonObject, JsonValue } from "../fullSitePackage/types";
import type {
  FullSiteInstallOperation,
  FullSiteInstallResourceKind,
} from "../fullSiteInstallTypes";
import { toStagedDetailDocument } from "./staging";
import { normalizeContentTypeConfig } from "../../content/contentTypeConfig";
import {
  normalizeContentTypeName,
  normalizeContentTypeSlug,
  normalizeContentTypeStatus,
} from "../../content/typeService";
import { normalizeListingTemplateWriteInput } from "../../content/listingTemplateConfig";
import { normalizeDetailPageDocument } from "../../content/detailPageSchema";
import { parseListingQueryCreateInput } from "../../content/queryBuilderService";
import { normalizeFormActionsForWrite } from "../../forms/formActionsContract";
import { normalizeFormSettings } from "../../forms/formSettings";
import { normalizeFormStatus } from "../../forms/formStatus";
import {
  normalizeFormFields,
  snapshotFormFieldsWriteShape,
  deriveFormSlug,
} from "../../forms/validation";
import { normalizeFormSuccessRedirectUrl } from "../../forms/formRedirects";
import { normalizeSubmissionAccess } from "../../forms/submissionAccess";
import { normalizePageTemplateCreateInput } from "../../pages/pageTemplateLibrarySchema";
import { normalizePageDocumentV2ForWrite } from "../../pages/pageDocumentV2";
import { isEmptyMenuDocument, normalizeMenuDocumentV2ForWrite } from "../../menus/menuDocumentV2";
import { normalizeMenuAppearance } from "../../menus/normalizeMenuAppearance";
import { normalizeMenuItemSettings } from "../../menus/menuItemSettings";
import { normalizeMenuNavExtras } from "../../menus/menuNavExtras";
import { assertNoCycles, type MenuItemRecord } from "../../menus/treeBuilder";
import { assertContentSchema } from "../../content/validation";
import { assertFormNestedContract, assertMenuItemContract } from "./nestedValidation";

export const LIFECYCLE_CAPABLE_PUBLISH_KINDS = [
  "content_entry",
  "detail_page",
  "page",
  "menu",
] as const satisfies readonly FullSiteInstallResourceKind[];

export type LifecycleCapablePublishKind = (typeof LIFECYCLE_CAPABLE_PUBLISH_KINDS)[number];

export const isLifecycleCapablePublishKind = (
  kind: FullSiteInstallResourceKind
): kind is LifecycleCapablePublishKind =>
  (LIFECYCLE_CAPABLE_PUBLISH_KINDS as readonly string[]).includes(kind);

export type AdapterApplyInput = {
  operation: Exclude<FullSiteInstallOperation, "conflict" | "noop">;
  currentId: string | null;
  key: string;
  desired: JsonObject;
  actorId: string;
};

export type AdapterApplyResult = {
  id: string;
  desired: JsonObject;
};

export type ResourceAdapter = {
  validateDesired(input: AdapterApplyInput): JsonObject | void | Promise<JsonObject | void>;
  applyDesired(input: AdapterApplyInput): Promise<AdapterApplyResult>;
  applyBatch?(inputs: readonly AdapterApplyInput[]): Promise<AdapterApplyResult[]>;
  applyStaged(input: AdapterApplyInput): Promise<AdapterApplyResult>;
  publish(id: string, actorId: string): Promise<void>;
};

const validateJsonDesired = (input: AdapterApplyInput): void => {
  if (!input.desired || Array.isArray(input.desired)) {
    throw new Error(`${input.key}_invalid`);
  }
  JSON.stringify(input.desired);
};

const assertDesiredKeys = (
  input: AdapterApplyInput,
  allowed: readonly string[],
  required: readonly string[]
): void => {
  const keys = Object.keys(input.desired);
  if (
    keys.some((key) => !allowed.includes(key)) ||
    required.some((key) => !Object.prototype.hasOwnProperty.call(input.desired, key))
  ) {
    throw new Error(`${input.key}_invalid`);
  }
};

const assertLifecycleStatus = (value: unknown, code: string): void => {
  if (value !== "draft" && value !== "published") throw new Error(code);
};

const unsupportedStage = async (): Promise<AdapterApplyResult> => {
  throw new Error("site_package_stage_unsupported");
};

const unsupportedPublish = async (): Promise<void> => {
  throw new Error("site_package_publish_unsupported");
};

const requireId = <T extends { id: string } | null | undefined>(
  value: T,
  code: string
): Exclude<T, null | undefined> => {
  if (!value) throw new Error(code);
  return value as Exclude<T, null | undefined>;
};

const withoutKeys = (value: JsonObject, keys: readonly string[]): JsonObject =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key))) as JsonObject;

const projectNormalizedDesired = (
  input: AdapterApplyInput,
  normalized: object,
  required: readonly string[],
  code: string
): JsonObject => {
  const source = normalized as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(input.desired), ...required])];
  const projected = Object.fromEntries(keys.map((key) => [key, source[key] ?? null]));
  try {
    const serialized = JSON.stringify(projected);
    const parsed = JSON.parse(serialized) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(code);
    return parsed as JsonObject;
  } catch {
    throw new Error(code);
  }
};

const desiredInput = <T>(desired: unknown): T => desired as T;

const toPersistedJsonValue = (value: unknown): JsonValue => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("menu_document_invalid");
  return JSON.parse(serialized) as JsonValue;
};

const createOrUpdate = async <T extends { id: string }>(
  input: AdapterApplyInput,
  create: () => Promise<T | null | undefined>,
  update: (id: string) => Promise<T | null | undefined>,
  code: string
): Promise<T> =>
  requireId(
    input.operation === "create" ? await create() : await update(input.currentId ?? ""),
    code
  );

const contentTypeAdapter: ResourceAdapter = {
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
        actions: normalizeFormActionsForWrite(input.desired.actions ?? []),
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
const formAdapter = createFormResourceAdapter();

const pageTemplateAdapter: ResourceAdapter = {
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

const listingTemplateAdapter: ResourceAdapter = {
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

export type ContentEntryResourceAdapterDeps = {
  createEntry: typeof createEntry;
  getEntry: typeof getEntry;
  updateEntry: typeof updateEntry;
  unpublishEntry: typeof unpublishEntry;
  publishEntry: typeof publishEntry;
};

export const createContentEntryResourceAdapter = (
  overrides: Partial<ContentEntryResourceAdapterDeps> = {}
): ResourceAdapter => {
  const deps: ContentEntryResourceAdapterDeps = {
    createEntry,
    getEntry,
    updateEntry,
    unpublishEntry,
    publishEntry,
    ...overrides,
  };
  return {
    validateDesired(input) {
      validateJsonDesired(input);
      assertDesiredKeys(
        input,
        ["contentTypeId", "title", "slug", "status", "data"],
        ["contentTypeId", "title", "slug", "status", "data"]
      );
      assertLifecycleStatus(input.desired.status, "content_entry_invalid");
      if (typeof input.desired.contentTypeId !== "string") {
        throw new Error("content_entry_invalid");
      }
      if (
        typeof input.desired.title !== "string" ||
        !input.desired.title.trim() ||
        typeof input.desired.slug !== "string" ||
        !input.desired.slug.trim() ||
        !input.desired.data ||
        Array.isArray(input.desired.data) ||
        typeof input.desired.data !== "object"
      ) {
        throw new Error("content_entry_invalid");
      }
      return projectNormalizedDesired(
        input,
        input.desired,
        ["contentTypeId", "title", "slug", "status", "data"],
        "content_entry_invalid"
      );
    },
    applyDesired: unsupportedStage,
    async applyStaged(input) {
      const contentTypeId = input.desired.contentTypeId;
      if (typeof contentTypeId !== "string") throw new Error("content_entry_invalid");
      const native = withoutKeys(input.desired, ["contentTypeId", "status"]);
      if (input.operation === "update" && input.currentId) {
        const before = await deps.getEntry(input.currentId);
        if (!before) throw new Error("content_entry_not_found");
        await deps.unpublishEntry(input.currentId);
        try {
          const row = requireId(
            await deps.updateEntry(input.currentId, desiredInput(native)),
            "content_entry_write_failed"
          );
          return { id: row.id, desired: input.desired };
        } catch (error) {
          await deps.updateEntry(input.currentId, {
            title: before.title,
            slug: before.slug,
            data: before.data,
          });
          if (before.status === "published") {
            await deps.publishEntry(input.currentId, input.actorId);
          }
          throw error;
        }
      }
      const row = requireId(
        await deps.createEntry(contentTypeId, desiredInput(native)),
        "content_entry_write_failed"
      );
      return { id: row.id, desired: input.desired };
    },
    async publish(id, actorId) {
      await deps.publishEntry(id, actorId);
    },
  };
};
const contentEntryAdapter = createContentEntryResourceAdapter();

const listingQueryAdapter: ResourceAdapter = {
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

const detailPageAdapter: ResourceAdapter = {
  validateDesired(input) {
    validateJsonDesired(input);
    assertDesiredKeys(
      input,
      [
        "schemaVersion",
        "name",
        "contentTypeId",
        "contentTypeSlug",
        "status",
        "titlePattern",
        "seo",
        "settings",
        "blocks",
        "bindings",
        "related",
      ],
      ["schemaVersion", "name", "contentTypeId", "contentTypeSlug", "status", "blocks"]
    );
    assertLifecycleStatus(input.desired.status, "detail_page_invalid");
    if (
      (input.desired.blocks !== undefined && !Array.isArray(input.desired.blocks)) ||
      (input.desired.bindings !== undefined && !Array.isArray(input.desired.bindings)) ||
      (input.desired.related !== undefined && !Array.isArray(input.desired.related))
    ) {
      throw new Error("detail_page_invalid");
    }
    const normalized = normalizeDetailPageDocument(input.desired, {
      id: input.currentId ?? "00000000-0000-4000-8000-000000000547",
      status: input.desired.status as "draft" | "published",
    });
    const { id: _nativeId, ...packageDesired } = normalized;
    return projectNormalizedDesired(
      input,
      packageDesired,
      ["schemaVersion", "name", "contentTypeId", "contentTypeSlug", "status", "blocks"],
      "detail_page_invalid"
    );
  },
  applyDesired: unsupportedStage,
  async applyStaged(input) {
    const document = toStagedDetailDocument(input.desired);
    if (input.operation === "create") {
      const result = await createDetailPageDraftDocument({ document });
      return { id: result.record.id, desired: input.desired };
    }
    const id = input.currentId ?? "";
    const before = await getDetailPageDocument(id);
    if (!before) throw new Error("detail_page_not_found");
    const mustUnpublish = input.desired.status === "draft" && before.status === "published";
    if (mustUnpublish) await unpublishDetailPageDocument(id);
    try {
      const result = await updateDetailPageDraftDocument(id, { document });
      return { id: result.record.id, desired: input.desired };
    } catch (error) {
      if (mustUnpublish) {
        await updateDetailPageDraftDocument(id, {
          document: { ...before.currentDocument, status: "draft" },
        });
        await publishDetailPageDocument(id, input.actorId);
      }
      throw error;
    }
  },
  async publish(id, actorId) {
    await publishDetailPageDocument(id, actorId);
  },
};

export type PageResourceAdapterDeps = {
  createPage: typeof createPage;
  getPage: typeof getPage;
  updatePage: typeof updatePage;
  unpublishPage: typeof unpublishPage;
  publishPage: typeof publishPage;
};

export const createPageResourceAdapter = (
  overrides: Partial<PageResourceAdapterDeps> = {}
): ResourceAdapter => {
  const deps: PageResourceAdapterDeps = {
    createPage,
    getPage,
    updatePage,
    unpublishPage,
    publishPage,
    ...overrides,
  };
  return {
    validateDesired(input) {
      validateJsonDesired(input);
      assertDesiredKeys(
        input,
        ["title", "slug", "status", "document"],
        ["title", "slug", "status", "document"]
      );
      assertLifecycleStatus(input.desired.status, "page_invalid");
      if (
        typeof input.desired.title !== "string" ||
        !input.desired.title.trim() ||
        typeof input.desired.slug !== "string" ||
        !input.desired.slug.trim()
      ) {
        throw new Error("page_invalid");
      }
      return projectNormalizedDesired(
        input,
        {
          title: input.desired.title.trim(),
          slug: input.desired.slug.trim(),
          status: input.desired.status,
          document: normalizePageDocumentV2ForWrite(input.desired.document),
        },
        ["title", "slug", "status", "document"],
        "page_invalid"
      );
    },
    applyDesired: unsupportedStage,
    async applyStaged(input) {
      const native = {
        ...withoutKeys(input.desired, ["status", "document"]),
        data: input.desired.document ?? input.desired.data,
        authorId: input.actorId,
      };
      if (input.operation === "update" && input.currentId) {
        const before = await deps.getPage(input.currentId);
        if (!before) throw new Error("page_not_found");
        await deps.unpublishPage(input.currentId);
        try {
          const row = requireId(
            await deps.updatePage(input.currentId, desiredInput(native)),
            "page_write_failed"
          );
          return { id: row.id, desired: input.desired };
        } catch (error) {
          await deps.updatePage(input.currentId, {
            title: before.title,
            slug: before.slug,
            data: desiredInput(before.currentData),
          });
          if (before.status === "published") {
            await deps.publishPage(input.currentId, input.actorId);
          }
          throw error;
        }
      }
      const row = requireId(await deps.createPage(desiredInput(native)), "page_write_failed");
      return { id: row.id, desired: input.desired };
    },
    async publish(id, actorId) {
      await deps.publishPage(id, actorId);
    },
  };
};
const pageAdapter = createPageResourceAdapter();

export type MenuResourceAdapterDeps = {
  createMenu: typeof createMenu;
  deleteMenu: typeof deleteMenu;
  getMenu: typeof getMenu;
  listMenuItems: typeof listMenuItems;
  updateMenu: typeof updateMenu;
  replaceMenuItems: typeof replaceMenuItems;
  publishMenu: typeof publishMenu;
  moveMenuToDraft: typeof moveMenuToDraft;
};

export const createMenuResourceAdapter = (
  overrides: Partial<MenuResourceAdapterDeps> = {}
): ResourceAdapter => {
  const deps: MenuResourceAdapterDeps = {
    createMenu,
    deleteMenu,
    getMenu,
    listMenuItems,
    updateMenu,
    replaceMenuItems,
    publishMenu,
    moveMenuToDraft,
    ...overrides,
  };
  return {
    validateDesired(input) {
      validateJsonDesired(input);
      assertDesiredKeys(
        input,
        ["name", "location", "status", "items", "document", "appearance", "extras"],
        ["name", "status", "items", "document", "appearance"]
      );
      assertLifecycleStatus(input.desired.status, "menu_invalid");
      if (input.desired.items !== undefined && !Array.isArray(input.desired.items)) {
        throw new Error("menu_invalid");
      }
      if (typeof input.desired.name !== "string" || !input.desired.name.trim()) {
        throw new Error("menu_invalid");
      }
      if (
        input.desired.location !== undefined &&
        input.desired.location !== null &&
        typeof input.desired.location !== "string"
      ) {
        throw new Error("menu_invalid");
      }
      const normalizedAppearance = normalizeMenuAppearance(input.desired.appearance);
      const menuDocument = normalizeMenuDocumentV2ForWrite(input.desired.document);
      const normalizedDocument = isEmptyMenuDocument(menuDocument)
        ? null
        : toPersistedJsonValue(menuDocument);
      const normalizedItems: MenuItemRecord[] = [];
      for (const [index, item] of (input.desired.items ?? []).entries()) {
        if (!item || Array.isArray(item) || typeof item !== "object") {
          throw new Error("menu_invalid");
        }
        assertMenuItemContract(item);
        const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : null;
        if (!id) throw new Error("menu_invalid");
        const label = typeof item.label === "string" ? item.label.trim() : "";
        const href = typeof item.href === "string" && item.href.trim() ? item.href.trim() : null;
        const pageId =
          typeof item.pageId === "string" && item.pageId.trim() ? item.pageId.trim() : null;
        if (!label || Boolean(href) === Boolean(pageId)) {
          throw new Error("menu_item_link_invalid");
        }
        normalizedItems.push({
          id,
          label,
          href,
          pageId,
          parentId:
            typeof item.parentId === "string" && item.parentId.trim() ? item.parentId.trim() : null,
          orderIndex:
            item.orderIndex === undefined
              ? index
              : typeof item.orderIndex === "number" &&
                  Number.isInteger(item.orderIndex) &&
                  item.orderIndex >= 0
                ? item.orderIndex
                : (() => {
                    throw new Error("menu_invalid");
                  })(),
          settings: normalizeMenuItemSettings(item.settings),
        });
      }
      if (new Set(normalizedItems.map((item) => item.id)).size !== normalizedItems.length) {
        throw new Error("menu_item_id_duplicate");
      }
      const itemIds = new Set(normalizedItems.map((item) => item.id));
      if (normalizedItems.some((item) => item.parentId && !itemIds.has(item.parentId))) {
        throw new Error("menu_invalid");
      }
      const siblingOrderIndexes = normalizedItems.map((item) =>
        JSON.stringify([item.parentId, item.orderIndex])
      );
      if (new Set(siblingOrderIndexes).size !== siblingOrderIndexes.length) {
        throw new Error("menu_invalid");
      }
      normalizedItems.sort(
        (left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id)
      );
      assertNoCycles(normalizedItems);
      const normalized: Record<string, unknown> = {
        name: input.desired.name.trim(),
        location:
          typeof input.desired.location === "string" && input.desired.location.trim()
            ? input.desired.location.trim()
            : null,
        items: normalizedItems as unknown as JsonValue,
        document: normalizedDocument,
        appearance: normalizedAppearance,
        status: input.desired.status,
      };
      if (input.desired.extras !== undefined) {
        const extras = normalizeMenuNavExtras(input.desired.extras ?? []);
        normalized.extras = extras.length === 0 ? null : extras;
      }
      return projectNormalizedDesired(
        input,
        normalized,
        ["name", "status", "items", "document", "appearance"],
        "menu_invalid"
      );
    },
    applyDesired: unsupportedStage,
    async applyStaged(input) {
      const items = Array.isArray(input.desired.items) ? input.desired.items : [];
      const native = withoutKeys(input.desired, ["status", "items"]);
      const before =
        input.operation === "update" && input.currentId
          ? await Promise.all([deps.getMenu(input.currentId), deps.listMenuItems(input.currentId)])
          : null;
      if (input.operation === "update" && input.currentId) {
        await deps.moveMenuToDraft(input.currentId);
      }
      let mutatedId: string | null = null;
      try {
        let row;
        if (input.operation === "create") {
          const created = requireId(
            await deps.createMenu(desiredInput({ ...native, status: "draft" })),
            "menu_write_failed"
          );
          mutatedId = created.id;
          row = requireId(
            await deps.updateMenu(created.id, desiredInput(native)),
            "menu_write_failed"
          );
        } else {
          mutatedId = input.currentId;
          row = requireId(
            await deps.updateMenu(input.currentId ?? "", desiredInput(native)),
            "menu_write_failed"
          );
        }
        await deps.replaceMenuItems(row.id, desiredInput(items));
        return { id: row.id, desired: input.desired };
      } catch (error) {
        if (input.operation === "create" && mutatedId) {
          await deps.deleteMenu(mutatedId);
        } else if (before?.[0]) {
          const previous = before[0];
          const envelope =
            previous.settings &&
            typeof previous.settings === "object" &&
            !Array.isArray(previous.settings)
              ? (previous.settings as Record<string, unknown>)
              : {};
          await deps.updateMenu(mutatedId ?? previous.id, {
            name: previous.name,
            location: previous.location,
            status: "draft",
            appearance: Object.prototype.hasOwnProperty.call(envelope, "appearance")
              ? envelope.appearance
              : null,
            document: Object.prototype.hasOwnProperty.call(envelope, "document")
              ? envelope.document
              : null,
            extras: Object.prototype.hasOwnProperty.call(envelope, "extras")
              ? envelope.extras
              : null,
          });
          await deps.replaceMenuItems(mutatedId ?? previous.id, desiredInput(before[1]));
          if (previous.status === "published") {
            await deps.publishMenu(mutatedId ?? previous.id);
          }
        }
        throw error;
      }
    },
    async publish(id) {
      await deps.publishMenu(id);
    },
  };
};
const menuAdapter = createMenuResourceAdapter();

const settingAdapter: ResourceAdapter = {
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
    await applySettingsBatch([{ key: input.key, operation: "set", value: input.desired.value }]);
    return { id: input.key, desired: input.desired };
  },
  async applyBatch(inputs) {
    await applySettingsBatch(
      inputs.map((input) => ({
        key: input.key,
        operation: "set" as const,
        value: input.desired.value,
      }))
    );
    return inputs.map((input) => ({
      id: input.key,
      desired: input.desired,
    }));
  },
  applyStaged: unsupportedStage,
  publish: unsupportedPublish,
};

export const FULL_SITE_RESOURCE_ADAPTERS = {
  content_type: contentTypeAdapter,
  form: formAdapter,
  page_template: pageTemplateAdapter,
  listing_template: listingTemplateAdapter,
  content_entry: contentEntryAdapter,
  listing_query: listingQueryAdapter,
  detail_page: detailPageAdapter,
  page: pageAdapter,
  menu: menuAdapter,
  setting: settingAdapter,
} satisfies Record<FullSiteInstallResourceKind, ResourceAdapter>;
