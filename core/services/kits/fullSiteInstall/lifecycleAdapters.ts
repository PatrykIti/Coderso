import {
  createEntry,
  getEntry,
  publishEntry,
  unpublishEntry,
  updateEntry,
} from "../../content/entryService";
import {
  captureEntryLifecycleNativeSnapshot,
  mutateEntryLifecycleAtomic,
  normalizeEntryLifecycleNativeDesired,
  prepareEntryLifecycleNativeTargets,
  type EntryLifecycleNativeDesired,
  type EntryLifecycleNativeSnapshot,
} from "../../content/entryLifecycleMutationService";
import {
  captureDetailPageDocumentLifecycleNativeSnapshot,
  createDetailPageDraftDocument,
  getDetailPageDocument,
  mutateDetailPageDocumentLifecycleAtomic,
  normalizeDetailPageDocumentLifecycleNativeDesired,
  prepareDetailPageDocumentLifecycleNativeTargets,
  publishDetailPageDocument,
  unpublishDetailPageDocument,
  updateDetailPageDraftDocument,
  type DetailPageDocumentLifecycleNativeDesired,
  type DetailPageDocumentLifecycleNativeSnapshot,
} from "../../content/detailPageDocumentService";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { normalizeDetailPageDocument } from "../../content/detailPageSchema";
import {
  captureMenuAggregateNativeSnapshot,
  createMenu,
  deleteMenu,
  getMenu,
  listMenuItems,
  mutateMenuAggregateAtomic,
  moveMenuToDraft,
  normalizeMenuAggregateNativeDesired,
  prepareMenuAggregateNativeTargets,
  publishMenu,
  replaceMenuItems,
  updateMenu,
  type MenuAggregateNativeDesired,
  type MenuAggregateNativeSnapshot,
} from "../../menus/menuService";
import { isEmptyMenuDocument, normalizeMenuDocumentV2ForWrite } from "../../menus/menuDocumentV2";
import { normalizeMenuAppearance } from "../../menus/normalizeMenuAppearance";
import { normalizeMenuItemSettings } from "../../menus/menuItemSettings";
import { normalizeMenuNavExtras } from "../../menus/menuNavExtras";
import { assertNoCycles, type MenuItemRecord } from "../../menus/treeBuilder";
import {
  capturePageLifecycleNativeSnapshot,
  createPage,
  getPage,
  mutatePageLifecycleAtomic,
  normalizePageLifecycleNativeDesired,
  preparePageLifecycleNativeTargets,
  publishPage,
  unpublishPage,
  updatePage,
  type PageLifecycleNativeDesired,
  type PageLifecycleNativeSnapshot,
} from "../../pages/pageService";
import { normalizePageDocumentV2ForWrite } from "../../pages/pageDocumentV2";
import type { JsonValue } from "../fullSitePackage/types";
import {
  assertDesiredKeys,
  assertLifecycleStatus,
  desiredInput,
  isFullSiteSagaAdapterApplyInput,
  projectNormalizedDesired,
  requireId,
  toPersistedJsonValue,
  unsupportedStage,
  validateJsonDesired,
  withoutKeys,
  type AdapterApplyInput,
  type FullSiteNativeSnapshot,
  type FullSiteSagaAdapterPrepareInput,
  type ResourceAdapter,
} from "./adapterTypes";
import { assertMenuItemContract } from "./nestedValidation";
import { toStagedDetailDocument } from "./staging";

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

type LifecycleAtomicOwner<
  TDesired extends object,
  TSnapshot extends DomainNativeSnapshot<TDesired>,
> = Readonly<{
  normalize(value: unknown): TDesired;
  prepare(input: FullSiteSagaAdapterPrepareInput): Readonly<{
    staged: TSnapshot | null;
    complete: TSnapshot;
  }>;
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

const withLifecycleAtomicContract = <
  TDesired extends object,
  TSnapshot extends DomainNativeSnapshot<TDesired>,
>(
  legacy: ResourceAdapter,
  owner: LifecycleAtomicOwner<TDesired, TSnapshot>
): ResourceAdapter &
  Required<
    Pick<
      ResourceAdapter,
      | "prepareNativeTargets"
      | "captureSnapshotById"
      | "deleteSnapshotAtomic"
      | "restoreSnapshotAtomic"
      | "publishSnapshotAtomic"
    >
  > => ({
  ...legacy,
  async applyStaged(input: AdapterApplyInput) {
    if (!isFullSiteSagaAdapterApplyInput(input)) return legacy.applyStaged(input);
    const staged = owner.normalize(input.desired);
    const result = await owner.mutate(
      input.operation === "create"
        ? {
            operation: "create",
            id: input.intendedId,
            desired: staged,
            actorId: input.actorId,
          }
        : {
            operation: "replace",
            id: input.currentId,
            desired: staged,
            expectedCurrent: toDomainSnapshot<TDesired, TSnapshot>(input.expectedSnapshot),
            actorId: input.actorId,
          }
    );
    if (!result.snapshot || result.id !== input.targetSnapshot.id) {
      throw new Error("site_package_state_changed");
    }
    return { id: result.id, desired: fromDomainSnapshot(result.snapshot).desired };
  },
  async prepareNativeTargets(input) {
    try {
      await legacy.validateDesired(input);
    } catch (error) {
      if (error instanceof Error && error.message === `${input.key}_invalid`) {
        throw new Error(owner.invalidCode);
      }
      throw error;
    }
    const targets = owner.prepare(input);
    return {
      staged: targets.staged ? fromDomainSnapshot(targets.staged) : null,
      complete: fromDomainSnapshot(targets.complete),
    };
  },
  async captureSnapshotById(id) {
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
  async publishSnapshotAtomic(input) {
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
      if (
        typeof input.desired.contentTypeId !== "string" ||
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
        {
          ...input.desired,
          title: input.desired.title.trim(),
          slug: input.desired.slug.trim(),
        },
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

const legacyContentEntryAdapter = createContentEntryResourceAdapter();
export const contentEntryAdapter = withLifecycleAtomicContract<
  EntryLifecycleNativeDesired,
  EntryLifecycleNativeSnapshot
>(legacyContentEntryAdapter, {
  normalize: normalizeEntryLifecycleNativeDesired,
  prepare(input) {
    const id = input.operation === "create" ? input.intendedId : input.currentId;
    const desired = input.desired as Readonly<{
      contentTypeId: string;
      title: string;
      slug: string;
      status: "draft" | "published";
      data: Record<string, unknown>;
    }>;
    return prepareEntryLifecycleNativeTargets({
      id,
      desired,
      actorId: input.actorId,
      expectedCurrent:
        input.operation === "update"
          ? toDomainSnapshot<EntryLifecycleNativeDesired, EntryLifecycleNativeSnapshot>(
              input.expectedSnapshot
            )
          : null,
      revisionId: randomUUID(),
      publicationTimestamp: new Date().toISOString(),
    });
  },
  capture: captureEntryLifecycleNativeSnapshot,
  mutate: mutateEntryLifecycleAtomic,
  notFoundCode: "content_entry_not_found",
  invalidCode: "content_entry_invalid",
});

const legacyDetailPageAdapter: ResourceAdapter = {
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
        "sections",
        "bindings",
        "related",
      ],
      ["schemaVersion", "name", "contentTypeId", "contentTypeSlug", "status"]
    );
    assertLifecycleStatus(input.desired.status, "detail_page_invalid");
    const hasSections = Array.isArray(input.desired.sections);
    const hasBlocks = Array.isArray(input.desired.blocks);
    if (!hasSections && !hasBlocks) {
      throw new Error("detail_page_invalid");
    }
    if (
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
      ["schemaVersion", "name", "contentTypeId", "contentTypeSlug", "status", "sections"],
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

export const detailPageAdapter = withLifecycleAtomicContract<
  DetailPageDocumentLifecycleNativeDesired,
  DetailPageDocumentLifecycleNativeSnapshot
>(legacyDetailPageAdapter, {
  normalize: normalizeDetailPageDocumentLifecycleNativeDesired,
  prepare(input) {
    const id = input.operation === "create" ? input.intendedId : input.currentId;
    return prepareDetailPageDocumentLifecycleNativeTargets({
      id,
      desired: input.desired,
      actorId: input.actorId,
      expectedCurrent:
        input.operation === "update"
          ? toDomainSnapshot<
              DetailPageDocumentLifecycleNativeDesired,
              DetailPageDocumentLifecycleNativeSnapshot
            >(input.expectedSnapshot)
          : null,
      revisionId: randomUUID(),
      publicationTimestamp: new Date().toISOString(),
    });
  },
  capture: captureDetailPageDocumentLifecycleNativeSnapshot,
  mutate: mutateDetailPageDocumentLifecycleAtomic,
  notFoundCode: "detail_page_not_found",
  invalidCode: "detail_page_invalid",
});

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
        ["title", "slug", "status", "data"],
        ["title", "slug", "status", "data"]
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
          data: normalizePageDocumentV2ForWrite(input.desired.data),
        },
        ["title", "slug", "status", "data"],
        "page_invalid"
      );
    },
    applyDesired: unsupportedStage,
    async applyStaged(input) {
      const native = withoutKeys(input.desired, ["status"]);
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
      const row = requireId(
        await deps.createPage(desiredInput({ ...native, authorId: input.actorId })),
        "page_write_failed"
      );
      return { id: row.id, desired: input.desired };
    },
    async publish(id, actorId) {
      await deps.publishPage(id, actorId);
    },
  };
};

const legacyPageAdapter = createPageResourceAdapter();
export const pageAdapter = withLifecycleAtomicContract<
  PageLifecycleNativeDesired,
  PageLifecycleNativeSnapshot
>(legacyPageAdapter, {
  normalize: normalizePageLifecycleNativeDesired,
  prepare(input) {
    const id = input.operation === "create" ? input.intendedId : input.currentId;
    const desired = input.desired as Readonly<{
      title: string;
      slug: string;
      status: "draft" | "published";
      data: Record<string, unknown>;
    }>;
    return preparePageLifecycleNativeTargets({
      id,
      desired,
      actorId: input.actorId,
      expectedCurrent:
        input.operation === "update"
          ? toDomainSnapshot<PageLifecycleNativeDesired, PageLifecycleNativeSnapshot>(
              input.expectedSnapshot
            )
          : null,
      revisionId: randomUUID(),
      publicationTimestamp: new Date().toISOString(),
    });
  },
  capture: capturePageLifecycleNativeSnapshot,
  mutate: mutatePageLifecycleAtomic,
  notFoundCode: "page_not_found",
  invalidCode: "page_invalid",
});

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

const legacyMenuAdapter = createMenuResourceAdapter();
export const menuAdapter = withLifecycleAtomicContract<
  MenuAggregateNativeDesired,
  MenuAggregateNativeSnapshot
>(legacyMenuAdapter, {
  normalize: normalizeMenuAggregateNativeDesired,
  prepare(input) {
    const id = input.operation === "create" ? input.intendedId : input.currentId;
    return prepareMenuAggregateNativeTargets({
      id,
      desired: input.desired,
      expectedCurrent:
        input.operation === "update"
          ? toDomainSnapshot<MenuAggregateNativeDesired, MenuAggregateNativeSnapshot>(
              input.expectedSnapshot
            )
          : null,
      publicationTimestamp: new Date().toISOString(),
    });
  },
  capture: captureMenuAggregateNativeSnapshot,
  mutate: mutateMenuAggregateAtomic,
  notFoundCode: "menu_not_found",
  invalidCode: "menu_invalid",
});
