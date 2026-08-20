import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "../../../../core/services/assistant/siteBuilderExecutor";

import type { ActionExecutorTestState } from "./actionExecutorTestState";

export const createActionExecutorEngagementDeps = (state: ActionExecutorTestState) => {
  const {
    forms,
    formSubmissionCounts,
    formActions,
    entries,
    menus,
    menuItemsByMenu,
    seoDocuments,
    mediaAssets,
    formFields,
  } = state;

  return {
    listForms: async () => forms,
    getForm: async (id: string) => forms.find((entry) => entry.id === id) ?? null,
    countFormSubmissions: async (formId: string) => formSubmissionCounts.get(formId) ?? 0,
    createForm: async (input: {
      name: string;
      slug?: string | null;
      status?: "draft" | "published" | "archived";
      description?: string | null;
      successMessage?: string | null;
      submissionAccess?: "public" | "internal";
    }) => {
      const record = {
        id: `form-${forms.length + 1}`,
        name: input.name,
        slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-"),
        status: input.status ?? "draft",
        description: input.description ?? null,
        successMessage: input.successMessage ?? null,
        submissionAccess: input.submissionAccess ?? "public",
      };
      forms.push(record);
      return record;
    },
    deleteForm: async (id: string) => {
      if ((formSubmissionCounts.get(id) ?? 0) > 0) return null;
      const index = forms.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = forms.splice(index, 1);
      formSubmissionCounts.delete(id);
      return deleted ?? null;
    },
    updateForm: async (
      id: string,
      input: {
        name?: string;
        slug?: string | null;
        status?: "draft" | "published" | "archived";
        description?: string | null;
        successMessage?: string | null;
        submissionAccess?: "public" | "internal";
      }
    ) => {
      const existing = forms.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined && input.slug !== null) existing.slug = input.slug;
      if (input.status !== undefined) existing.status = input.status;
      if (input.description !== undefined) existing.description = input.description;
      if (input.successMessage !== undefined) existing.successMessage = input.successMessage;
      if (input.submissionAccess !== undefined) existing.submissionAccess = input.submissionAccess;
      return existing;
    },
    setFormFields: async (formId: string, fields: Array<Record<string, unknown>>) => {
      formFields.set(formId, fields);
      return fields;
    },
    listFormActions: async (formId: string) => formActions.get(formId) ?? [],
    setFormActions: async (
      formId: string,
      actions: Array<{
        id: string;
        type: "email" | "webhook" | "entry_sync" | "redirect" | "success_message";
        label: string;
        enabled: boolean;
        continueOnError: boolean;
        condition: Record<string, unknown>;
        config: Record<string, unknown>;
        orderIndex: number;
      }>
    ) => {
      const next = actions.map((action, index) => ({
        ...action,
        orderIndex: index,
      }));
      formActions.set(formId, next);
      return next;
    },
    getEntryBySlug: async (typeId: string, slug: string) =>
      (entries.find((entry) => entry.typeId === typeId && entry.slug === slug) ??
        null) as unknown as Awaited<
        ReturnType<
          (typeof import("../../../../core/services/content/entryService"))["getEntryBySlug"]
        >
      >,
    getEntry: async (id: string) =>
      (entries.find((entry) => entry.id === id) ?? null) as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/content/entryService"))["getEntry"]>
      >,
    createEntry: async (
      typeId: string,
      input: {
        title: string;
        slug: string;
        data: Record<string, unknown>;
        authorId?: string | null;
      }
    ) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `entry-${entries.length + 1}`,
        typeId,
        title: input.title,
        slug: input.slug,
        status: "draft" as const,
        data: input.data,
        authorId: input.authorId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      entries.push(record);
      return record as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/content/entryService"))["createEntry"]>
      >;
    },
    deleteEntry: async (id: string) => {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = entries.splice(index, 1);
      return deleted as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/content/entryService"))["deleteEntry"]>
      >;
    },
    updateEntry: async (
      id: string,
      input: {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      }
    ) => {
      const existing = entries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.title !== undefined) existing.title = input.title;
      if (input.slug !== undefined) existing.slug = input.slug;
      if (input.data !== undefined) existing.data = input.data;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/content/entryService"))["updateEntry"]>
      >;
    },
    publishEntry: async (id: string) => {
      const existing = entries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      existing.status = "published";
      existing.updatedAt = new Date("2026-04-10T12:02:00.000Z");
      return existing as unknown as Awaited<
        ReturnType<
          (typeof import("../../../../core/services/content/entryService"))["publishEntry"]
        >
      >;
    },
    updateEntryMetadata: async (
      id: string,
      input: {
        status?: "draft" | "published" | "scheduled" | "archived";
        seo?: {
          title?: string | null;
          description?: string | null;
          canonicalUrl?: string | null;
          robots?: string | null;
        };
      }
    ) => {
      const existing = entries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (
        input.status !== undefined &&
        input.status !== "scheduled" &&
        input.status !== "archived"
      ) {
        existing.status = input.status;
      }
      if (input.seo) {
        const seo =
          seoDocuments.find((entry) => entry.targetType === "entry" && entry.targetId === id) ??
          null;
        if (seo) {
          seo.title = input.seo.title ?? seo.title;
          seo.description = input.seo.description ?? seo.description;
          seo.canonicalUrl = input.seo.canonicalUrl ?? seo.canonicalUrl;
          seo.robots = input.seo.robots ?? seo.robots;
        } else {
          seoDocuments.push({
            id: `seo-${seoDocuments.length + 1}`,
            targetType: "entry",
            targetId: id,
            slug: existing.slug,
            title: input.seo.title ?? null,
            description: input.seo.description ?? null,
            canonicalUrl: input.seo.canonicalUrl ?? null,
            robots: input.seo.robots ?? null,
            score: null,
            status: "warning",
            issues: [],
            lastAuditAt: null,
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            updatedAt: new Date("2026-04-10T12:00:00.000Z"),
          });
        }
      }
      return existing as unknown as Awaited<
        ReturnType<
          (typeof import("../../../../core/services/content/entryService"))["updateEntryMetadata"]
        >
      >;
    },
    listMenus: async () => menus,
    createMenu: async (input: {
      name: string;
      location?: string | null;
      status?: "draft" | "published";
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `menu-${menus.length + 1}`,
        name: input.name,
        location: input.location ?? null,
        status: input.status ?? "draft",
        createdAt: now,
        updatedAt: now,
      };
      menus.push(record);
      return record as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/menus/menuService"))["createMenu"]>
      >;
    },
    updateMenu: async (
      id: string,
      input: {
        name?: string;
        location?: string | null;
        status?: "draft" | "published";
      }
    ) => {
      const existing = menus.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.location !== undefined) existing.location = input.location;
      if (input.status !== undefined) existing.status = input.status;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/menus/menuService"))["updateMenu"]>
      >;
    },
    listMenuItems: async (menuId: string) =>
      (menuItemsByMenu.get(menuId) ?? []).map((item) => ({
        ...item,
        children: [],
      })),
    deleteMenuItem: async (menuId: string, itemId: string) => {
      const existingItems = menuItemsByMenu.get(menuId) ?? [];
      const existing = existingItems.find((item) => item.id === itemId) ?? null;
      if (!existing) return null;
      const deleteIds = new Set([itemId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of existingItems) {
          if (item.parentId && deleteIds.has(item.parentId) && !deleteIds.has(item.id)) {
            deleteIds.add(item.id);
            changed = true;
          }
        }
      }
      const next = existingItems.filter((item) => !deleteIds.has(item.id));
      menuItemsByMenu.set(menuId, next);
      return {
        deleted: existing,
        deletedIds: [...deleteIds].sort((left, right) => left.localeCompare(right)),
        items: next.map((item) => ({ ...item, children: [] })),
      };
    },
    replaceMenuItems: async (
      menuId: string,
      items: Array<{
        id?: string;
        label: string;
        href?: string | null;
        pageId?: string | null;
        parentId?: string | null;
        orderIndex?: number;
        settings?: unknown;
      }>
    ) => {
      const next = items.map((item, index) => ({
        id: item.id ?? `menu-item-${index + 1}`,
        label: item.label,
        href: item.href ?? null,
        pageId: item.pageId ?? null,
        parentId: item.parentId ?? null,
        orderIndex: item.orderIndex ?? index,
        settings:
          item.settings && typeof item.settings === "object" && !Array.isArray(item.settings)
            ? (item.settings as Record<string, unknown>)
            : {},
      }));
      menuItemsByMenu.set(menuId, next);
      return next.map((item) => ({
        ...item,
        children: [],
      }));
    },
    getSeoDocument: async (id: string) => seoDocuments.find((entry) => entry.id === id) ?? null,
    getSeoDocumentByTarget: async (targetType: "page" | "entry", targetId: string) =>
      seoDocuments.find(
        (entry) => entry.targetType === targetType && entry.targetId === targetId
      ) ?? null,
    deleteSeoDocument: async (id: string) => {
      const index = seoDocuments.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = seoDocuments.splice(index, 1);
      return deleted ?? null;
    },
    updateSeoDocumentById: async (
      id: string,
      input: {
        title?: string | null;
        description?: string | null;
        canonicalUrl?: string | null;
        robots?: string | null;
      }
    ) => {
      const existing = seoDocuments.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.title !== undefined) existing.title = input.title;
      if (input.description !== undefined) existing.description = input.description;
      if (input.canonicalUrl !== undefined) existing.canonicalUrl = input.canonicalUrl;
      if (input.robots !== undefined) existing.robots = input.robots;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing;
    },
    upsertSeoDocument: async (input: {
      targetType: "page" | "entry";
      targetId: string;
      slug?: string | null;
      title?: string | null;
      description?: string | null;
      canonicalUrl?: string | null;
      robots?: string | null;
    }) => {
      const existing =
        seoDocuments.find(
          (entry) => entry.targetType === input.targetType && entry.targetId === input.targetId
        ) ?? null;
      if (existing) {
        existing.slug = input.slug ?? existing.slug;
        existing.title = input.title ?? existing.title;
        existing.description = input.description ?? existing.description;
        existing.canonicalUrl = input.canonicalUrl ?? existing.canonicalUrl;
        existing.robots = input.robots ?? existing.robots;
        existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
        return existing;
      }
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `seo-${seoDocuments.length + 1}`,
        targetType: input.targetType,
        targetId: input.targetId,
        slug: input.slug ?? null,
        title: input.title ?? null,
        description: input.description ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        robots: input.robots ?? null,
        score: null,
        status: "warning" as const,
        issues: [] as [],
        lastAuditAt: null,
        createdAt: now,
        updatedAt: now,
      };
      seoDocuments.push(record);
      return record;
    },
    getMediaById: async (id: string) => mediaAssets.find((entry) => entry.id === id) ?? null,
    previewSiteKitPlan: previewGuidedSiteBuilderPlan,
    executeSiteKit: (async (input) => {
      const preview = previewGuidedSiteBuilderPlan(input);
      return {
        ...preview,
        execution: {
          run: {
            id: "run-site-kit-1",
            kitId: preview.selectedKitId,
            mode: input.dryRun ? "dry_run" : "apply",
            status: "success",
            actorId: input.actorId ?? null,
            rollbackOfRunId: null,
            options: {},
            summary: {
              total: 1,
              success: 1,
              failed: 0,
              planned: 0,
              skipped: 0,
              operations: {
                create: 1,
                update: 0,
                noop: 0,
                delete: 0,
                restore: 0,
              },
            },
            error: null,
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            updatedAt: new Date("2026-04-10T12:00:00.000Z"),
            finishedAt: new Date("2026-04-10T12:00:01.000Z"),
          },
          items: [],
          summary: {
            total: 1,
            success: 1,
            failed: 0,
            planned: 0,
            skipped: 0,
            operations: {
              create: 1,
              update: 0,
              noop: 0,
              delete: 0,
              restore: 0,
            },
          },
          manifest: {
            id: preview.selectedKitId,
            title: preview.selectedKitTitle,
            vertical: "test",
            includes: {
              contentTypes: [],
              entries: [],
              widgets: [],
              templates: [],
              forms: [],
              menus: [],
            },
            requiredModules: [],
          },
        },
        validation: {
          runId: "run-site-kit-1",
          status: "ok",
          unresolvedItems: [],
          checks: [],
        },
      };
    }) as typeof executeGuidedSiteBuilder,
    validateSiteKitRun: (async (input) => ({
      runId: input.runId,
      status: "ok",
      unresolvedItems: [],
      checks: [],
    })) as typeof validateGuidedSiteBuilderRun,
  };
};
