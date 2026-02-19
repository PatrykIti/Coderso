import { isDeepStrictEqual } from "node:util";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import {
  contentTypes,
  forms,
  menus,
  pages,
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../db/schema";
import { logAudit } from "../audit/auditService";
import { getSolutionKitFromCatalog } from "./solutionKitsCatalog";
import type {
  SolutionKitDefinition,
  SolutionKitId,
  SolutionKitResourceBlueprint,
} from "./solutionKitTypes";

type JsonRecord = Record<string, unknown>;

export type SolutionKitInstallMode = "dry_run" | "apply" | "rollback";
export type SolutionKitInstallStatus = "running" | "success" | "failed";
export type SolutionKitInstallItemStatus =
  | "planned"
  | "success"
  | "failed"
  | "skipped";
export type SolutionKitInstallItemOperation =
  | "create"
  | "update"
  | "noop"
  | "delete"
  | "restore";
export type SolutionKitInstallResourceType =
  | "content_type"
  | "form"
  | "page"
  | "menu";

type SolutionKitInstallRunRow = typeof solutionKitInstallRuns.$inferSelect;
type SolutionKitInstallItemRow = typeof solutionKitInstallItems.$inferSelect;
type ContentTypeRow = typeof contentTypes.$inferSelect;
type FormRow = typeof forms.$inferSelect;
type PageRow = typeof pages.$inferSelect;
type MenuRow = typeof menus.$inferSelect;

type ContentTypeSnapshot = {
  id: string;
  name: string;
  slug: string;
  schema: JsonRecord;
};

type FormSnapshot = {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  successMessage: string | null;
  successRedirectUrl: string | null;
  submissionAccess: string;
  settings: JsonRecord;
};

type PageSnapshot = {
  id: string;
  title: string;
  slug: string;
  status: string;
  authorId: string | null;
  currentData: JsonRecord;
  publishedData: JsonRecord | null;
  publishedAt: string | null;
};

type MenuSnapshot = {
  id: string;
  name: string;
  location: string | null;
};

type InstallPlanOperation =
  | {
      position: number;
      resourceType: "content_type";
      resourceKey: string;
      payload: {
        slug: string;
        name: string;
        schema: JsonRecord;
      };
    }
  | {
      position: number;
      resourceType: "form";
      resourceKey: string;
      payload: {
        slug: string;
        name: string;
        status: "draft" | "published";
      };
    }
  | {
      position: number;
      resourceType: "page";
      resourceKey: string;
      payload: {
        slug: string;
        title: string;
        status: "draft" | "published";
        currentData: JsonRecord;
      };
    }
  | {
      position: number;
      resourceType: "menu";
      resourceKey: string;
      payload: {
        location: string | null;
        name: string;
      };
    };

type InstallOperationResult = {
  operation: SolutionKitInstallItemOperation;
  beforeSnapshot: JsonRecord | null;
  afterSnapshot: JsonRecord | null;
  rollbackAction: JsonRecord | null;
};

type RollbackOperationResult = InstallOperationResult & {
  status: SolutionKitInstallItemStatus;
  error: string | null;
};

type QueryExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export type SolutionKitInstallRunRecord = {
  id: string;
  kitId: string;
  mode: SolutionKitInstallMode;
  status: SolutionKitInstallStatus;
  actorId: string | null;
  rollbackOfRunId: string | null;
  options: JsonRecord;
  summary: JsonRecord;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
};

export type SolutionKitInstallItemRecord = {
  id: string;
  runId: string;
  position: number;
  resourceType: SolutionKitInstallResourceType;
  resourceKey: string;
  operation: SolutionKitInstallItemOperation;
  status: SolutionKitInstallItemStatus;
  beforeSnapshot: JsonRecord | null;
  afterSnapshot: JsonRecord | null;
  rollbackAction: JsonRecord | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SolutionKitInstallSummary = {
  total: number;
  success: number;
  failed: number;
  planned: number;
  skipped: number;
  operations: Record<SolutionKitInstallItemOperation, number>;
};

export type ApplySolutionKitInstallInput = {
  kitId: SolutionKitId;
  actorId?: string | null;
  dryRun?: boolean;
  continueOnError?: boolean;
  kitDefinitionOverride?: SolutionKitDefinition;
};

export type RollbackSolutionKitInstallInput = {
  sourceRunId?: string;
  kitId?: SolutionKitId;
  actorId?: string | null;
  continueOnError?: boolean;
};

export type SolutionKitInstallResult = {
  run: SolutionKitInstallRunRecord;
  items: SolutionKitInstallItemRecord[];
  summary: SolutionKitInstallSummary;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord =>
  isRecord(value) ? (value as JsonRecord) : {};

const toIsoOrNull = (value: Date | null) => (value ? value.toISOString() : null);

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePageSlug = (value: unknown) => {
  if (typeof value !== "string") throw new Error("solution_kit_page_slug_invalid");
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "/") return "/";
  const withoutLead = trimmed.replace(/^\/+/, "");
  const withoutTrail = withoutLead.replace(/\/+$/, "");
  return withoutTrail.length > 0 ? withoutTrail : "/";
};

const pageSlugCandidates = (slug: string) =>
  slug === "/" ? ["/", ""] : [slug, `/${slug}`];

const defaultContentTypeSchema = (): JsonRecord => ({
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
  },
  required: [],
});

const defaultPageData = (): JsonRecord => ({
  blocks: [],
  settings: {
    showInNav: true,
  },
});

const snapshotContentType = (row: ContentTypeRow): ContentTypeSnapshot => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  schema: asRecord(row.schema),
});

const snapshotForm = (row: FormRow): FormSnapshot => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status,
  description: row.description,
  successMessage: row.successMessage,
  successRedirectUrl: row.successRedirectUrl,
  submissionAccess: row.submissionAccess,
  settings: asRecord(row.settings),
});

const snapshotPage = (row: PageRow): PageSnapshot => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  status: row.status,
  authorId: row.authorId,
  currentData: asRecord(row.currentData),
  publishedData: isRecord(row.publishedData) ? (row.publishedData as JsonRecord) : null,
  publishedAt: toIsoOrNull(row.publishedAt),
});

const snapshotMenu = (row: MenuRow): MenuSnapshot => ({
  id: row.id,
  name: row.name,
  location: row.location,
});

const normalizeRunRow = (row: SolutionKitInstallRunRow): SolutionKitInstallRunRecord => ({
  id: row.id,
  kitId: row.kitId,
  mode: row.mode as SolutionKitInstallMode,
  status: row.status as SolutionKitInstallStatus,
  actorId: row.actorId,
  rollbackOfRunId: row.rollbackOfRunId,
  options: asRecord(row.options),
  summary: asRecord(row.summary),
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  finishedAt: row.finishedAt,
});

const normalizeItemRow = (row: SolutionKitInstallItemRow): SolutionKitInstallItemRecord => ({
  id: row.id,
  runId: row.runId,
  position: row.position,
  resourceType: row.resourceType as SolutionKitInstallResourceType,
  resourceKey: row.resourceKey,
  operation: row.operation as SolutionKitInstallItemOperation,
  status: row.status as SolutionKitInstallItemStatus,
  beforeSnapshot: isRecord(row.beforeSnapshot)
    ? (row.beforeSnapshot as JsonRecord)
    : null,
  afterSnapshot: isRecord(row.afterSnapshot)
    ? (row.afterSnapshot as JsonRecord)
    : null,
  rollbackAction: isRecord(row.rollbackAction)
    ? (row.rollbackAction as JsonRecord)
    : null,
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const buildSummary = (
  items: Pick<SolutionKitInstallItemRecord, "operation" | "status">[]
): SolutionKitInstallSummary => {
  const summary: SolutionKitInstallSummary = {
    total: 0,
    success: 0,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: {
      create: 0,
      update: 0,
      noop: 0,
      delete: 0,
      restore: 0,
    },
  };

  for (const item of items) {
    summary.total += 1;
    summary.operations[item.operation] += 1;
    if (item.status === "success") summary.success += 1;
    if (item.status === "failed") summary.failed += 1;
    if (item.status === "planned") summary.planned += 1;
    if (item.status === "skipped") summary.skipped += 1;
  }
  return summary;
};

const resolveKitDefinition = (
  kitId: SolutionKitId,
  override?: SolutionKitDefinition
) => {
  if (override) return override;
  const kit = getSolutionKitFromCatalog(kitId);
  if (!kit) throw new Error("solution_kit_not_found");
  return kit;
};

const createInstallRun = async (input: {
  kitId: string;
  mode: SolutionKitInstallMode;
  actorId?: string | null;
  rollbackOfRunId?: string | null;
  options?: JsonRecord;
}) => {
  const [row] = await db
    .insert(solutionKitInstallRuns)
    .values({
      kitId: input.kitId,
      mode: input.mode,
      status: "running",
      actorId: input.actorId ?? null,
      rollbackOfRunId: input.rollbackOfRunId ?? null,
      options: input.options ?? {},
      summary: {},
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: null,
    })
    .returning();
  if (!row) throw new Error("solution_kit_install_run_create_failed");
  return normalizeRunRow(row);
};

const appendInstallItem = async (runId: string, input: {
  position: number;
  resourceType: SolutionKitInstallResourceType;
  resourceKey: string;
  operation: SolutionKitInstallItemOperation;
  status: SolutionKitInstallItemStatus;
  beforeSnapshot?: JsonRecord | null;
  afterSnapshot?: JsonRecord | null;
  rollbackAction?: JsonRecord | null;
  error?: string | null;
}) => {
  const [row] = await db
    .insert(solutionKitInstallItems)
    .values({
      runId,
      position: input.position,
      resourceType: input.resourceType,
      resourceKey: input.resourceKey,
      operation: input.operation,
      status: input.status,
      beforeSnapshot: input.beforeSnapshot ?? null,
      afterSnapshot: input.afterSnapshot ?? null,
      rollbackAction: input.rollbackAction ?? null,
      error: input.error ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error("solution_kit_install_item_create_failed");
  return normalizeItemRow(row);
};

const finalizeInstallRun = async (
  runId: string,
  input: {
    status: SolutionKitInstallStatus;
    summary: SolutionKitInstallSummary;
    error?: string | null;
  }
) => {
  const [row] = await db
    .update(solutionKitInstallRuns)
    .set({
      status: input.status,
      summary: input.summary,
      error: input.error ?? null,
      updatedAt: new Date(),
      finishedAt: new Date(),
    })
    .where(eq(solutionKitInstallRuns.id, runId))
    .returning();
  if (!row) throw new Error("solution_kit_install_run_finalize_failed");
  return normalizeRunRow(row);
};

const planOperations = (blueprint: SolutionKitResourceBlueprint): InstallPlanOperation[] => {
  const operations: InstallPlanOperation[] = [];
  const keys = new Set<string>();
  let position = 0;

  const push = (op: InstallPlanOperation) => {
    const dedupeKey = `${op.resourceType}:${op.resourceKey}`;
    if (keys.has(dedupeKey)) {
      throw new Error("solution_kit_blueprint_duplicate_resource");
    }
    keys.add(dedupeKey);
    operations.push(op);
  };

  for (const type of blueprint.contentTypes) {
    const slug = normalizeString(type.slug);
    const name = normalizeString(type.name);
    if (!slug || !name) throw new Error("solution_kit_blueprint_content_type_invalid");
    push({
      position,
      resourceType: "content_type",
      resourceKey: slug,
      payload: {
        slug,
        name,
        schema: defaultContentTypeSchema(),
      },
    });
    position += 1;
  }

  for (const form of blueprint.forms) {
    const slug = normalizeString(form.slug);
    const name = normalizeString(form.name);
    if (!slug || !name) throw new Error("solution_kit_blueprint_form_invalid");
    push({
      position,
      resourceType: "form",
      resourceKey: slug,
      payload: {
        slug,
        name,
        status: form.status === "published" ? "published" : "draft",
      },
    });
    position += 1;
  }

  for (const page of blueprint.pages) {
    const slug = normalizePageSlug(page.slug);
    const title = normalizeString(page.title);
    if (!title) throw new Error("solution_kit_blueprint_page_invalid");
    push({
      position,
      resourceType: "page",
      resourceKey: slug,
      payload: {
        slug,
        title,
        status: page.status === "published" ? "published" : "draft",
        currentData: defaultPageData(),
      },
    });
    position += 1;
  }

  for (const menu of blueprint.menus) {
    const name = normalizeString(menu.name);
    if (!name) throw new Error("solution_kit_blueprint_menu_invalid");
    const location = normalizeString(menu.location);
    push({
      position,
      resourceType: "menu",
      resourceKey: location ? `location:${location}` : `name:${name.toLowerCase()}`,
      payload: {
        location,
        name,
      },
    });
    position += 1;
  }

  return operations;
};

const executeContentTypeOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "content_type" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const [existing] = await executor
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, op.payload.slug));

  if (!existing) {
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          ...op.payload,
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const [created] = await executor
      .insert(contentTypes)
      .values({
        name: op.payload.name,
        slug: op.payload.slug,
        schema: op.payload.schema,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    if (!created) throw new Error("solution_kit_content_type_create_failed");

    const afterSnapshot = snapshotContentType(created);
    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot,
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = snapshotContentType(existing);
  const patch: Partial<typeof contentTypes.$inferInsert> = {};

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
  if (!isDeepStrictEqual(existing.schema, op.payload.schema)) {
    patch.schema = op.payload.schema;
  }

  if (Object.keys(patch).length === 0) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.schema ? { schema: asRecord(patch.schema) } : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  const [updated] = await executor
    .update(contentTypes)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(contentTypes.id, existing.id))
    .returning();

  if (!updated) throw new Error("solution_kit_content_type_update_failed");

  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: snapshotContentType(updated),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

const executeFormOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "form" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const [existing] = await executor.select().from(forms).where(eq(forms.slug, op.payload.slug));

  if (!existing) {
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          name: op.payload.name,
          slug: op.payload.slug,
          status: op.payload.status,
          description: null,
          successMessage: null,
          successRedirectUrl: null,
          submissionAccess: "public",
          settings: {},
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const now = new Date();
    const [created] = await executor
      .insert(forms)
      .values({
        name: op.payload.name,
        slug: op.payload.slug,
        status: op.payload.status,
        description: null,
        successMessage: null,
        successRedirectUrl: null,
        submissionAccess: "public",
        settings: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) throw new Error("solution_kit_form_create_failed");

    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot: snapshotForm(created),
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = snapshotForm(existing);
  const patch: Partial<typeof forms.$inferInsert> = {};

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
  if (op.payload.status === "published" && existing.status !== "published") {
    patch.status = "published";
  }

  if (Object.keys(patch).length === 0) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.status ? { status: patch.status } : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  const [updated] = await executor
    .update(forms)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(forms.id, existing.id))
    .returning();

  if (!updated) throw new Error("solution_kit_form_update_failed");

  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: snapshotForm(updated),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

const executePageOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "page" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const candidates = pageSlugCandidates(op.payload.slug);
  const rows = await executor
    .select()
    .from(pages)
    .where(inArray(pages.slug, candidates));
  const existing =
    rows.find((item) => item.slug === op.payload.slug) ??
    rows.find((item) => item.slug === "/") ??
    rows[0];

  if (!existing) {
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          title: op.payload.title,
          slug: op.payload.slug,
          status: op.payload.status,
          currentData: op.payload.currentData,
          publishedData:
            op.payload.status === "published" ? op.payload.currentData : null,
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const now = new Date();
    const [created] = await executor
      .insert(pages)
      .values({
        title: op.payload.title,
        slug: op.payload.slug,
        status: op.payload.status,
        authorId: null,
        currentData: op.payload.currentData,
        publishedData:
          op.payload.status === "published" ? op.payload.currentData : null,
        publishedAt: op.payload.status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) throw new Error("solution_kit_page_create_failed");

    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot: snapshotPage(created),
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = snapshotPage(existing);
  const patch: Partial<typeof pages.$inferInsert> = {};
  const now = new Date();

  if (existing.title !== op.payload.title) patch.title = op.payload.title;
  if (op.payload.status === "published" && existing.status !== "published") {
    patch.status = "published";
    patch.publishedData =
      isRecord(existing.publishedData) && existing.publishedData
        ? existing.publishedData
        : existing.currentData;
    patch.publishedAt = existing.publishedAt ?? now;
  }

  if (Object.keys(patch).length === 0) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.title ? { title: patch.title } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.publishedData
          ? { publishedData: asRecord(patch.publishedData) }
          : {}),
        ...(patch.publishedAt
          ? {
              publishedAt:
                patch.publishedAt instanceof Date
                  ? patch.publishedAt.toISOString()
                  : null,
            }
          : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  const [updated] = await executor
    .update(pages)
    .set({
      ...patch,
      updatedAt: now,
    })
    .where(eq(pages.id, existing.id))
    .returning();

  if (!updated) throw new Error("solution_kit_page_update_failed");

  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: snapshotPage(updated),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

const executeMenuOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "menu" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  let existing: MenuRow | undefined;
  if (op.payload.location) {
    [existing] = await executor
      .select()
      .from(menus)
      .where(eq(menus.location, op.payload.location));
  } else {
    [existing] = await executor
      .select()
      .from(menus)
      .where(eq(menus.name, op.payload.name));
  }

  if (!existing) {
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          name: op.payload.name,
          location: op.payload.location,
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const [created] = await executor
      .insert(menus)
      .values({
        name: op.payload.name,
        location: op.payload.location,
        createdAt: new Date(),
      })
      .returning();

    if (!created) throw new Error("solution_kit_menu_create_failed");
    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot: snapshotMenu(created),
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = snapshotMenu(existing);
  const patch: Partial<typeof menus.$inferInsert> = {};

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
  if ((existing.location ?? null) !== (op.payload.location ?? null)) {
    patch.location = op.payload.location;
  }

  if (Object.keys(patch).length === 0) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.name ? { name: patch.name } : {}),
        ...(typeof patch.location !== "undefined"
          ? { location: patch.location }
          : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  const [updated] = await executor
    .update(menus)
    .set(patch)
    .where(eq(menus.id, existing.id))
    .returning();

  if (!updated) throw new Error("solution_kit_menu_update_failed");
  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: snapshotMenu(updated),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

const executeInstallOperation = async (
  executor: QueryExecutor,
  op: InstallPlanOperation,
  dryRun: boolean
) => {
  switch (op.resourceType) {
    case "content_type":
      return executeContentTypeOperation(executor, op, dryRun);
    case "form":
      return executeFormOperation(executor, op, dryRun);
    case "page":
      return executePageOperation(executor, op, dryRun);
    case "menu":
      return executeMenuOperation(executor, op, dryRun);
    default: {
      const neverType: never = op;
      throw new Error(`solution_kit_operation_unknown:${JSON.stringify(neverType)}`);
    }
  }
};

const parseSnapshot = <T extends JsonRecord>(
  value: JsonRecord | null,
  parser: (payload: JsonRecord) => T
) => {
  if (!value) return null;
  return parser(value);
};

const parseContentTypeSnapshot = (payload: JsonRecord): ContentTypeSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  slug: String(payload.slug ?? ""),
  schema: asRecord(payload.schema),
});

const parseFormSnapshot = (payload: JsonRecord): FormSnapshot => ({
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
    payload.successRedirectUrl === null ||
    typeof payload.successRedirectUrl === "string"
      ? payload.successRedirectUrl
      : null,
  submissionAccess: String(payload.submissionAccess ?? "public"),
  settings: asRecord(payload.settings),
});

const parsePageSnapshot = (payload: JsonRecord): PageSnapshot => ({
  id: String(payload.id ?? ""),
  title: String(payload.title ?? ""),
  slug: String(payload.slug ?? ""),
  status: String(payload.status ?? "draft"),
  authorId:
    payload.authorId === null || typeof payload.authorId === "string"
      ? payload.authorId
      : null,
  currentData: asRecord(payload.currentData),
  publishedData: isRecord(payload.publishedData)
    ? (payload.publishedData as JsonRecord)
    : null,
  publishedAt:
    payload.publishedAt === null || typeof payload.publishedAt === "string"
      ? payload.publishedAt
      : null,
});

const parseMenuSnapshot = (payload: JsonRecord): MenuSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  location:
    payload.location === null || typeof payload.location === "string"
      ? payload.location
      : null,
});

const rollbackCreatedResource = async (
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
        beforeSnapshot: deleted ? snapshotContentType(deleted) : null,
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
        beforeSnapshot: deleted ? snapshotForm(deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "page": {
      const [deleted] = await executor.delete(pages).where(eq(pages.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? snapshotPage(deleted) : null,
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
        beforeSnapshot: deleted ? snapshotMenu(deleted) : null,
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

const rollbackUpdatedResource = async (
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

      const beforeSnapshot = current ? snapshotContentType(current) : null;
      let restored: ContentTypeRow | undefined;

      if (current) {
        [restored] = await executor
          .update(contentTypes)
          .set({
            name: snapshot.name,
            slug: snapshot.slug,
            schema: snapshot.schema,
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
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_content_type_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? snapshotContentType(restored) : null,
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
      const beforeSnapshot = current ? snapshotForm(current) : null;
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

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_form_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? snapshotForm(restored) : null,
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
      const beforeSnapshot = current ? snapshotPage(current) : null;
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

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_page_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? snapshotPage(restored) : null,
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
      const beforeSnapshot = current ? snapshotMenu(current) : null;
      let restored: MenuRow | undefined;

      if (current) {
        [restored] = await executor
          .update(menus)
          .set({
            name: snapshot.name,
            location: snapshot.location,
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
            createdAt: new Date(),
          })
          .returning();
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_menu_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? snapshotMenu(restored) : null,
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

const executeRollbackForItem = async (
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

export async function listSolutionKitInstallRuns(options?: {
  kitId?: string;
  mode?: SolutionKitInstallMode;
  limit?: number;
}) {
  const filters = [];
  if (options?.kitId) filters.push(eq(solutionKitInstallRuns.kitId, options.kitId));
  if (options?.mode) filters.push(eq(solutionKitInstallRuns.mode, options.mode));

  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(Math.round(options.limit), 200))
      : 50;

  const rows = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(limit);

  return rows.map(normalizeRunRow);
}

export async function getSolutionKitInstallRun(runId: string) {
  const [row] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.id, runId));
  return row ? normalizeRunRow(row) : null;
}

export async function listSolutionKitInstallItems(runId: string) {
  const rows = await db
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.createdAt));

  return rows.map(normalizeItemRow);
}

export async function applySolutionKitInstall(
  input: ApplySolutionKitInstallInput
): Promise<SolutionKitInstallResult> {
  const definition = resolveKitDefinition(input.kitId, input.kitDefinitionOverride);
  const operations = planOperations(definition.resourceBlueprint);
  const mode: SolutionKitInstallMode = input.dryRun ? "dry_run" : "apply";
  const continueOnError = input.continueOnError ?? true;
  const run = await createInstallRun({
    kitId: definition.id,
    mode,
    actorId: input.actorId ?? null,
    options: {
      continueOnError,
      operationCount: operations.length,
    },
  });

  const items: SolutionKitInstallItemRecord[] = [];
  let failureCount = 0;

  for (const operation of operations) {
    try {
      const result = input.dryRun
        ? await executeInstallOperation(db, operation, true)
        : await db.transaction((tx) =>
            executeInstallOperation(tx as QueryExecutor, operation, false)
          );

      const item = await appendInstallItem(run.id, {
        position: operation.position,
        resourceType: operation.resourceType,
        resourceKey: operation.resourceKey,
        operation: result.operation,
        status: input.dryRun ? "planned" : "success",
        beforeSnapshot: result.beforeSnapshot,
        afterSnapshot: result.afterSnapshot,
        rollbackAction: result.rollbackAction,
        error: null,
      });
      items.push(item);
    } catch (error) {
      failureCount += 1;
      const message =
        error instanceof Error ? error.message : "solution_kit_operation_failed";
      const item = await appendInstallItem(run.id, {
        position: operation.position,
        resourceType: operation.resourceType,
        resourceKey: operation.resourceKey,
        operation: "noop",
        status: "failed",
        error: message,
      });
      items.push(item);
      if (!continueOnError) break;
    }
  }

  const summary = buildSummary(items);
  const finalStatus: SolutionKitInstallStatus = failureCount > 0 ? "failed" : "success";
  const finalizedRun = await finalizeInstallRun(run.id, {
    status: finalStatus,
    summary,
    error: failureCount > 0 ? `failed_operations:${failureCount}` : null,
  });

  await logAudit({
    actorId: input.actorId ?? null,
    action: "solution_kits.apply",
    targetType: "solution_kit",
    targetId: definition.id,
    metadata: {
      runId: finalizedRun.id,
      mode,
      status: finalizedRun.status,
      summary,
    },
  });

  return {
    run: finalizedRun,
    items,
    summary,
  };
}

const resolveRollbackSourceRun = async (input: RollbackSolutionKitInstallInput) => {
  if (input.sourceRunId) {
    const [row] = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, input.sourceRunId));
    if (!row) throw new Error("solution_kit_install_run_not_found");
    if (row.mode !== "apply") throw new Error("solution_kit_rollback_invalid_source");
    return normalizeRunRow(row);
  }

  if (!input.kitId) throw new Error("solution_kit_rollback_source_required");

  const [row] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(
      and(
        eq(solutionKitInstallRuns.kitId, input.kitId),
        eq(solutionKitInstallRuns.mode, "apply"),
        eq(solutionKitInstallRuns.status, "success")
      )
    )
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(1);

  if (!row) throw new Error("solution_kit_rollback_source_not_found");
  return normalizeRunRow(row);
};

export async function rollbackSolutionKitInstall(
  input: RollbackSolutionKitInstallInput
): Promise<SolutionKitInstallResult> {
  const sourceRun = await resolveRollbackSourceRun(input);
  const sourceItems = await listSolutionKitInstallItems(sourceRun.id);
  const continueOnError = input.continueOnError ?? true;
  const rollbackRun = await createInstallRun({
    kitId: sourceRun.kitId,
    mode: "rollback",
    actorId: input.actorId ?? null,
    rollbackOfRunId: sourceRun.id,
    options: {
      sourceRunId: sourceRun.id,
      continueOnError,
      operationCount: sourceItems.length,
    },
  });

  const items: SolutionKitInstallItemRecord[] = [];
  let failureCount = 0;

  const ordered = [...sourceItems].sort((left, right) => right.position - left.position);

  for (let index = 0; index < ordered.length; index += 1) {
    const sourceItem = ordered[index];
    try {
      const result = await db.transaction((tx) =>
        executeRollbackForItem(tx as QueryExecutor, sourceItem)
      );
      if (result.status === "failed") failureCount += 1;

      const item = await appendInstallItem(rollbackRun.id, {
        position: index,
        resourceType: sourceItem.resourceType,
        resourceKey: sourceItem.resourceKey,
        operation: result.operation,
        status: result.status,
        beforeSnapshot: result.beforeSnapshot,
        afterSnapshot: result.afterSnapshot,
        rollbackAction: result.rollbackAction,
        error: result.error,
      });
      items.push(item);

      if (result.status === "failed" && !continueOnError) break;
    } catch (error) {
      failureCount += 1;
      const message =
        error instanceof Error ? error.message : "solution_kit_rollback_operation_failed";

      const failedItem = await appendInstallItem(rollbackRun.id, {
        position: index,
        resourceType: sourceItem.resourceType,
        resourceKey: sourceItem.resourceKey,
        operation: "restore",
        status: "failed",
        error: message,
      });
      items.push(failedItem);
      if (!continueOnError) break;
    }
  }

  const summary = buildSummary(items);
  const finalStatus: SolutionKitInstallStatus = failureCount > 0 ? "failed" : "success";
  const finalizedRun = await finalizeInstallRun(rollbackRun.id, {
    status: finalStatus,
    summary,
    error: failureCount > 0 ? `failed_operations:${failureCount}` : null,
  });

  await logAudit({
    actorId: input.actorId ?? null,
    action: "solution_kits.rollback",
    targetType: "solution_kit_install_run",
    targetId: sourceRun.id,
    metadata: {
      rollbackRunId: finalizedRun.id,
      status: finalizedRun.status,
      summary,
    },
  });

  return {
    run: finalizedRun,
    items,
    summary,
  };
}

