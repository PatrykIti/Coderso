import { and, eq } from "drizzle-orm";
import { contentTypes, forms, menus, pages, seoDocuments } from "../../db/schema";
import {
  asRecord,
  isRecord,
  snapshotContentType,
  snapshotForm,
  snapshotMenu,
  snapshotPage,
} from "./legacyInstallPlanning";
import type {
  ContentTypeRow,
  ContentTypeSnapshot,
  FormRow,
  FormSnapshot,
  JsonRecord,
  MenuRow,
  MenuSnapshot,
  PageRow,
  PageSnapshot,
  QueryExecutor,
  RollbackOperationResult,
  SeoSnapshot,
  SolutionKitInstallItemRecord,
} from "./legacyInstallPlanning";
import {
  replaceFormFieldsTx,
  replaceMenuItemsTx,
  restorePageSeoTx,
  syncContentTypeTaxonomy,
  toMenuDesiredFromSnapshot,
} from "./legacyInstallResourceHandlers";

export const parseSnapshot = <T extends JsonRecord>(
  value: JsonRecord | null,
  parser: (payload: JsonRecord) => T
) => {
  if (!value) return null;
  return parser(value);
};

export const parseContentTypeSnapshot = (payload: JsonRecord): ContentTypeSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  slug: String(payload.slug ?? ""),
  schema: asRecord(payload.schema),
  status: payload.status === "published" ? "published" : "draft",
  taxonomy: {
    categories: Array.isArray(asRecord(payload.taxonomy).categories)
      ? (asRecord(payload.taxonomy).categories as unknown[])
          .filter((value) => isRecord(value))
          .map((value) => ({
            id: String(value.id ?? ""),
            name: String(value.name ?? ""),
            slug: String(value.slug ?? ""),
          }))
      : [],
    tags: Array.isArray(asRecord(payload.taxonomy).tags)
      ? (asRecord(payload.taxonomy).tags as unknown[])
          .filter((value) => isRecord(value))
          .map((value) => ({
            id: String(value.id ?? ""),
            name: String(value.name ?? ""),
            slug: String(value.slug ?? ""),
          }))
      : [],
  },
});

export const parseFormSnapshot = (payload: JsonRecord): FormSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  slug: String(payload.slug ?? ""),
  status: String(payload.status ?? "draft"),
  description:
    payload.description === null || typeof payload.description === "string"
      ? payload.description
      : null,
  successMessage:
    payload.successMessage === null || typeof payload.successMessage === "string"
      ? payload.successMessage
      : null,
  successRedirectUrl:
    payload.successRedirectUrl === null || typeof payload.successRedirectUrl === "string"
      ? payload.successRedirectUrl
      : null,
  submissionAccess: String(payload.submissionAccess ?? "public"),
  settings: asRecord(payload.settings),
  fields: Array.isArray(payload.fields)
    ? (payload.fields as unknown[])
        .filter((value) => isRecord(value))
        .map((value) => ({
          id: String(value.id ?? ""),
          type: String(value.type ?? "text"),
          label: String(value.label ?? ""),
          name: String(value.name ?? ""),
          required: Boolean(value.required),
          orderIndex:
            typeof value.orderIndex === "number" && Number.isFinite(value.orderIndex)
              ? Math.round(value.orderIndex)
              : 0,
          settings: asRecord(value.settings),
        }))
        .sort((left, right) => left.orderIndex - right.orderIndex)
    : [],
});

export const parseSeoSnapshot = (payload: JsonRecord): SeoSnapshot => ({
  id: String(payload.id ?? ""),
  title: typeof payload.title === "string" ? payload.title : null,
  description: typeof payload.description === "string" ? payload.description : null,
  canonicalUrl: typeof payload.canonicalUrl === "string" ? payload.canonicalUrl : null,
  robots: typeof payload.robots === "string" ? payload.robots : null,
});

export const parsePageSnapshot = (payload: JsonRecord): PageSnapshot => ({
  id: String(payload.id ?? ""),
  title: String(payload.title ?? ""),
  slug: String(payload.slug ?? ""),
  status: String(payload.status ?? "draft"),
  authorId:
    payload.authorId === null || typeof payload.authorId === "string" ? payload.authorId : null,
  currentData: asRecord(payload.currentData),
  publishedData: isRecord(payload.publishedData) ? (payload.publishedData as JsonRecord) : null,
  publishedAt:
    payload.publishedAt === null || typeof payload.publishedAt === "string"
      ? payload.publishedAt
      : null,
  seo: isRecord(payload.seo) ? parseSeoSnapshot(payload.seo) : null,
});

export const parseMenuSnapshot = (payload: JsonRecord): MenuSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  location:
    payload.location === null || typeof payload.location === "string" ? payload.location : null,
  status: payload.status === "published" ? "published" : "draft",
  publishedAt:
    payload.publishedAt === null || typeof payload.publishedAt === "string"
      ? payload.publishedAt
      : null,
  items: Array.isArray(payload.items)
    ? (payload.items as unknown[])
        .filter((value) => isRecord(value))
        .map((value) => ({
          id: String(value.id ?? ""),
          label: String(value.label ?? ""),
          href: value.href === null || typeof value.href === "string" ? value.href : null,
          pageId: value.pageId === null || typeof value.pageId === "string" ? value.pageId : null,
          parentId:
            value.parentId === null || typeof value.parentId === "string" ? value.parentId : null,
          orderIndex:
            typeof value.orderIndex === "number" && Number.isFinite(value.orderIndex)
              ? Math.round(value.orderIndex)
              : 0,
          settings: asRecord(value.settings),
        }))
        .sort((left, right) => left.orderIndex - right.orderIndex)
    : [],
});

export const rollbackCreatedResource = async (
  executor: QueryExecutor,
  item: SolutionKitInstallItemRecord
): Promise<RollbackOperationResult> => {
  const afterSnapshot = item.afterSnapshot;
  const id = typeof afterSnapshot?.id === "string" ? afterSnapshot.id : null;
  if (!id) {
    return {
      operation: "delete",
      status: "failed",
      error: "solution_kit_rollback_missing_created_id",
      beforeSnapshot: null,
      afterSnapshot: null,
      rollbackAction: { strategy: "none" },
    };
  }

  switch (item.resourceType) {
    case "content_type": {
      const [deleted] = await executor
        .delete(contentTypes)
        .where(eq(contentTypes.id, id))
        .returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotContentType(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "form": {
      const [deleted] = await executor.delete(forms).where(eq(forms.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotForm(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "page": {
      await executor
        .delete(seoDocuments)
        .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, id)));
      const [deleted] = await executor.delete(pages).where(eq(pages.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotPage(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "menu": {
      const [deleted] = await executor.delete(menus).where(eq(menus.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotMenu(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    default: {
      return {
        operation: "delete",
        status: "failed",
        error: "solution_kit_rollback_resource_type_invalid",
        beforeSnapshot: null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
  }
};

export const rollbackUpdatedResource = async (
  executor: QueryExecutor,
  item: SolutionKitInstallItemRecord
): Promise<RollbackOperationResult> => {
  if (!item.beforeSnapshot) {
    return {
      operation: "restore",
      status: "failed",
      error: "solution_kit_rollback_missing_before_snapshot",
      beforeSnapshot: null,
      afterSnapshot: null,
      rollbackAction: { strategy: "none" },
    };
  }

  switch (item.resourceType) {
    case "content_type": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parseContentTypeSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_content_type_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, snapshot.id));

      const beforeSnapshot = current ? await snapshotContentType(executor, current) : null;
      let restored: ContentTypeRow | undefined;
      const restoreTaxonomy = {
        categories: snapshot.taxonomy.categories.map((item) => ({
          name: item.name,
          slug: item.slug,
        })),
        tags: snapshot.taxonomy.tags.map((item) => ({
          name: item.name,
          slug: item.slug,
        })),
      };

      if (current) {
        [restored] = await executor
          .update(contentTypes)
          .set({
            name: snapshot.name,
            slug: snapshot.slug,
            schema: snapshot.schema,
            status: snapshot.status,
            updatedAt: new Date(),
          })
          .where(eq(contentTypes.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(contentTypes)
          .values({
            id: snapshot.id,
            name: snapshot.name,
            slug: snapshot.slug,
            schema: snapshot.schema,
            status: snapshot.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      if (restored) {
        await syncContentTypeTaxonomy(executor, restored.id, restoreTaxonomy);
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_content_type_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotContentType(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "form": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parseFormSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_form_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor.select().from(forms).where(eq(forms.id, snapshot.id));
      const beforeSnapshot = current ? await snapshotForm(executor, current) : null;
      const now = new Date();
      let restored: FormRow | undefined;

      if (current) {
        [restored] = await executor
          .update(forms)
          .set({
            name: snapshot.name,
            slug: snapshot.slug,
            status: snapshot.status,
            description: snapshot.description,
            successMessage: snapshot.successMessage,
            successRedirectUrl: snapshot.successRedirectUrl,
            submissionAccess: snapshot.submissionAccess,
            settings: snapshot.settings,
            updatedAt: now,
          })
          .where(eq(forms.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(forms)
          .values({
            id: snapshot.id,
            name: snapshot.name,
            slug: snapshot.slug,
            status: snapshot.status,
            description: snapshot.description,
            successMessage: snapshot.successMessage,
            successRedirectUrl: snapshot.successRedirectUrl,
            submissionAccess: snapshot.submissionAccess,
            settings: snapshot.settings,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
      }

      if (restored) {
        await replaceFormFieldsTx(executor, restored.id, snapshot.fields);
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_form_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotForm(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "page": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parsePageSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_page_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor.select().from(pages).where(eq(pages.id, snapshot.id));
      const beforeSnapshot = current ? await snapshotPage(executor, current) : null;
      const now = new Date();
      const publishedAt = snapshot.publishedAt ? new Date(snapshot.publishedAt) : null;
      let restored: PageRow | undefined;

      if (current) {
        [restored] = await executor
          .update(pages)
          .set({
            title: snapshot.title,
            slug: snapshot.slug,
            status: snapshot.status,
            authorId: snapshot.authorId,
            currentData: snapshot.currentData,
            publishedData: snapshot.publishedData,
            publishedAt,
            updatedAt: now,
          })
          .where(eq(pages.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(pages)
          .values({
            id: snapshot.id,
            title: snapshot.title,
            slug: snapshot.slug,
            status: snapshot.status,
            authorId: snapshot.authorId,
            currentData: snapshot.currentData,
            publishedData: snapshot.publishedData,
            publishedAt,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
      }

      if (restored) {
        await restorePageSeoTx(executor, restored.id, snapshot.seo);
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_page_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotPage(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "menu": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parseMenuSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_menu_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor.select().from(menus).where(eq(menus.id, snapshot.id));
      const beforeSnapshot = current ? await snapshotMenu(executor, current) : null;
      const publishedAt = snapshot.publishedAt ? new Date(snapshot.publishedAt) : null;
      let restored: MenuRow | undefined;

      if (current) {
        [restored] = await executor
          .update(menus)
          .set({
            name: snapshot.name,
            location: snapshot.location,
            status: snapshot.status,
            publishedAt,
          })
          .where(eq(menus.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(menus)
          .values({
            id: snapshot.id,
            name: snapshot.name,
            location: snapshot.location,
            status: snapshot.status,
            publishedAt,
            createdAt: new Date(),
          })
          .returning();
      }

      if (restored) {
        await replaceMenuItemsTx(executor, restored.id, toMenuDesiredFromSnapshot(snapshot.items));
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_menu_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotMenu(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    default:
      return {
        operation: "restore",
        status: "failed",
        error: "solution_kit_rollback_resource_type_invalid",
        beforeSnapshot: null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
  }
};

export const executeRollbackForItem = async (
  executor: QueryExecutor,
  item: SolutionKitInstallItemRecord
) => {
  if (item.status !== "success") {
    return {
      operation: "noop" as const,
      status: "skipped" as const,
      error: null,
      beforeSnapshot: item.beforeSnapshot,
      afterSnapshot: item.afterSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (item.operation === "create") {
    return rollbackCreatedResource(executor, item);
  }

  if (item.operation === "update") {
    return rollbackUpdatedResource(executor, item);
  }

  return {
    operation: "noop" as const,
    status: "skipped" as const,
    error: null,
    beforeSnapshot: item.beforeSnapshot,
    afterSnapshot: item.afterSnapshot,
    rollbackAction: { strategy: "none" },
  };
};
