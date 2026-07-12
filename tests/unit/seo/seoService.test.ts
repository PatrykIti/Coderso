import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isAsExpression,
  isCallExpression,
  isFunctionDeclaration,
  isIdentifier,
  isIfStatement,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isVariableDeclaration,
  type CallExpression,
  type FunctionDeclaration,
  type Node,
  type SourceFile,
} from "typescript";

import { db } from "../../../core/db/client";
import { contentEntries, pages, seoDocuments } from "../../../core/db/schema";
import {
  applyPreparedSeoMutationWithExecutor,
  deleteSeoDocument,
  getSeoDocumentByTarget,
  getSeoDocumentByTargetWithExecutor,
  listExistingSeoDocuments,
  listSeoDocuments,
  prepareSeoMutation,
  prepareSeoMutationWithExecutor,
  resolvePublicSeoMetadata,
  runSeoAudit,
  updateSeoDocumentById,
  upsertSeoDocument,
  upsertSeoDocumentWithExecutor,
  type PreparedSeoMutation,
  type SeoAnalysis,
} from "../../../core/services/seo/seoService";
import type { SeoDocument, SeoUpsertInput } from "../../../core/services/seo/seoTypes";
import {
  clearSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const SEO_DOCUMENT_KEYS = [
  "id",
  "targetType",
  "targetId",
  "slug",
  "title",
  "description",
  "canonicalUrl",
  "robots",
  "score",
  "status",
  "issues",
  "lastAuditAt",
  "createdAt",
  "updatedAt",
] as const;

type SeoExecutor = Parameters<typeof prepareSeoMutationWithExecutor>[0];
type SeoRow = typeof seoDocuments.$inferSelect;

const makeSeoDocument = (overrides: Partial<SeoDocument> = {}): SeoDocument => ({
  id: randomUUID(),
  targetType: "page",
  targetId: randomUUID(),
  slug: "/existing",
  title: "Existing SEO title",
  description: "Existing SEO description",
  canonicalUrl: "https://example.com/existing",
  robots: "index,follow",
  score: 50,
  status: "warning",
  issues: [],
  lastAuditAt: null,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  ...overrides,
});

const makeSeoRow = (overrides: Partial<SeoRow> = {}): SeoRow => ({
  ...makeSeoDocument(),
  ...overrides,
});

const readObjectKeys = (value: unknown) =>
  value && typeof value === "object" ? Object.keys(value) : [];

const seedSiteCache = () => {
  clearSiteCache();
  const key = `task-537-seo:${randomUUID()}`;
  setSiteCacheEntry(key, "cached", 300, 0);
  expect(getSiteCacheEntry(key, 1)).toBe("cached");
  return key;
};

const withPageFixture = async <T>(run: (pageId: string) => Promise<T>): Promise<T> => {
  const [page] = await db
    .insert(pages)
    .values({
      title: `SEO Test Page ${randomUUID()}`,
      slug: `seo-${randomUUID()}`,
      currentData: { schemaVersion: 1, blocks: [] },
    })
    .returning({ id: pages.id });
  if (!page) throw new Error("missing_test_page");

  try {
    return await run(page.id);
  } finally {
    await db.delete(seoDocuments).where(eq(seoDocuments.targetId, page.id));
    await db.delete(pages).where(eq(pages.id, page.id));
  }
};

const withTrackedBroadSeoCreations = async <T>(run: () => Promise<T>): Promise<T> => {
  type SeoIdentity = {
    id: string;
    targetType: string;
    targetId: string;
    slug: string | null;
    updatedAt: Date;
  };
  type AlignedSeoIdentity = {
    original: SeoIdentity;
    expectedSlug: string | null;
    markerUpdatedAt: Date;
  };

  const insertedRows: Array<Omit<SeoIdentity, "slug">> = [];
  const alignedRows: AlignedSeoIdentity[] = [];
  const cleanupErrors: unknown[] = [];
  let result!: T;
  let runFailed = false;
  let runError: unknown;

  try {
    const [pageTargets, entryTargets, existingSeoRows] = await Promise.all([
      db.select({ id: pages.id, title: pages.title, slug: pages.slug }).from(pages),
      db
        .select({ id: contentEntries.id, title: contentEntries.title, slug: contentEntries.slug })
        .from(contentEntries),
      db
        .select({
          id: seoDocuments.id,
          targetType: seoDocuments.targetType,
          targetId: seoDocuments.targetId,
          slug: seoDocuments.slug,
          updatedAt: seoDocuments.updatedAt,
        })
        .from(seoDocuments),
    ]);
    const normalizeTargetSlug = (value: string | null) => {
      if (!value) return null;
      return value.startsWith("/") ? value : `/${value}`;
    };
    const targets = [
      ...pageTargets.map((target) => ({
        targetType: "page" as const,
        targetId: target.id,
        title: target.title,
        slug: normalizeTargetSlug(target.slug),
      })),
      ...entryTargets.map((target) => ({
        targetType: "entry" as const,
        targetId: target.id,
        title: target.title,
        slug: normalizeTargetSlug(target.slug),
      })),
    ];
    const existingByTarget = new Map(
      existingSeoRows.map((row) => [`${row.targetType}:${row.targetId}`, row] as const)
    );

    for (const target of targets) {
      if (existingByTarget.has(`${target.targetType}:${target.targetId}`)) continue;
      const [inserted] = await db
        .insert(seoDocuments)
        .values({
          targetType: target.targetType,
          targetId: target.targetId,
          slug: target.slug,
          title: target.title,
          description: null,
          canonicalUrl: null,
          robots: null,
          status: "warning",
          issues: [],
        })
        .onConflictDoNothing({
          target: [seoDocuments.targetType, seoDocuments.targetId],
        })
        .returning({
          id: seoDocuments.id,
          targetType: seoDocuments.targetType,
          targetId: seoDocuments.targetId,
          updatedAt: seoDocuments.updatedAt,
        });
      if (inserted) insertedRows.push(inserted);
    }

    for (const target of targets) {
      const existing = existingByTarget.get(`${target.targetType}:${target.targetId}`);
      if (!existing || (existing.slug ?? null) === target.slug) continue;
      const markerUpdatedAt = new Date(
        Date.UTC(2100, 0, 1) + Number.parseInt(randomUUID().slice(0, 8), 16)
      );
      const [aligned] = await db
        .update(seoDocuments)
        .set({ slug: target.slug, updatedAt: markerUpdatedAt })
        .where(
          and(
            eq(seoDocuments.id, existing.id),
            eq(seoDocuments.targetType, existing.targetType),
            eq(seoDocuments.targetId, existing.targetId),
            existing.slug === null
              ? isNull(seoDocuments.slug)
              : eq(seoDocuments.slug, existing.slug),
            eq(seoDocuments.updatedAt, existing.updatedAt)
          )
        )
        .returning({
          id: seoDocuments.id,
          targetType: seoDocuments.targetType,
          targetId: seoDocuments.targetId,
          slug: seoDocuments.slug,
          updatedAt: seoDocuments.updatedAt,
        });
      if (aligned) {
        alignedRows.push({
          original: existing,
          expectedSlug: aligned.slug,
          markerUpdatedAt: aligned.updatedAt,
        });
      }
    }

    result = await run();
  } catch (error) {
    runFailed = true;
    runError = error;
  }

  for (const aligned of [...alignedRows].reverse()) {
    try {
      const restored = await db
        .update(seoDocuments)
        .set({
          slug: aligned.original.slug,
          updatedAt: aligned.original.updatedAt,
        })
        .where(
          and(
            eq(seoDocuments.id, aligned.original.id),
            eq(seoDocuments.targetType, aligned.original.targetType),
            eq(seoDocuments.targetId, aligned.original.targetId),
            aligned.expectedSlug === null
              ? isNull(seoDocuments.slug)
              : eq(seoDocuments.slug, aligned.expectedSlug),
            eq(seoDocuments.updatedAt, aligned.markerUpdatedAt)
          )
        )
        .returning({ id: seoDocuments.id });
      if (restored.length !== 1 || restored[0]?.id !== aligned.original.id) {
        cleanupErrors.push(new Error("seo_cleanup_restore_conflict"));
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  for (const inserted of insertedRows) {
    try {
      const deleted = await db
        .delete(seoDocuments)
        .where(
          and(
            eq(seoDocuments.id, inserted.id),
            eq(seoDocuments.targetType, inserted.targetType),
            eq(seoDocuments.targetId, inserted.targetId),
            eq(seoDocuments.updatedAt, inserted.updatedAt)
          )
        )
        .returning({ id: seoDocuments.id });
      if (deleted.length !== 1 || deleted[0]?.id !== inserted.id) {
        cleanupErrors.push(new Error("seo_cleanup_delete_conflict"));
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (runFailed) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [runError, ...cleanupErrors],
        "Broad SEO operation and exact-ownership cleanup both failed."
      );
    }
    throw runError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Exact-ownership SEO cleanup failed.");
  }
  return result;
};

const createReadExecutor = (
  rows: SeoRow[],
  state: { selectKeys: string[]; insertCalls: number; updateCalls: number }
): SeoExecutor =>
  ({
    select: (fields: unknown) => {
      state.selectKeys = readObjectKeys(fields);
      return {
        from: (_table: unknown) => ({
          where: async (_condition: unknown) => rows,
        }),
      };
    },
    insert: (_table: unknown) => {
      state.insertCalls += 1;
      throw new Error("unexpected_insert");
    },
    update: (_table: unknown) => {
      state.updateCalls += 1;
      throw new Error("unexpected_update");
    },
  }) as unknown as SeoExecutor;

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createDeferredInsertExecutor = (
  deferred: ReturnType<typeof createDeferred<SeoRow[]>>,
  state: { selectKeys: string[]; returningKeys: string[]; values: unknown }
): SeoExecutor =>
  ({
    select: (fields: unknown) => {
      state.selectKeys = readObjectKeys(fields);
      return {
        from: (_table: unknown) => ({
          where: async (_condition: unknown) => [],
        }),
      };
    },
    insert: (_table: unknown) => ({
      values: (values: unknown) => {
        state.values = values;
        return {
          returning: (fields: unknown) => {
            state.returningKeys = readObjectKeys(fields);
            return deferred.promise;
          },
        };
      },
    }),
    update: (_table: unknown) => {
      throw new Error("unexpected_update");
    },
  }) as unknown as SeoExecutor;

const seoServiceSource = readFileSync(
  new URL("../../../core/services/seo/seoService.ts", import.meta.url),
  "utf8"
);
const seoServiceAst = createSourceFile(
  "seoService.ts",
  seoServiceSource,
  ScriptTarget.Latest,
  true,
  ScriptKind.TS
);

const findFunction = (sourceFile: SourceFile, name: string): FunctionDeclaration => {
  let found: FunctionDeclaration | undefined;
  const visit = (node: Node) => {
    if (isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (!found) forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!found) throw new Error(`missing_function:${name}`);
  return found;
};

const collectCalls = (root: Node): CallExpression[] => {
  const calls: CallExpression[] = [];
  const visit = (node: Node) => {
    if (isCallExpression(node)) calls.push(node);
    forEachChild(node, visit);
  };
  visit(root);
  return calls;
};

const directCallsNamed = (root: Node, name: string) =>
  collectCalls(root).filter(
    (call) => isIdentifier(call.expression) && call.expression.text === name
  );

const methodCallsNamed = (root: Node, name: string) =>
  collectCalls(root).filter(
    (call) => isPropertyAccessExpression(call.expression) && call.expression.name.text === name
  );

test("prepareSeoMutation normalizes insert values and deeply freezes the plan", async () => {
  const targetId = randomUUID();
  const plan = prepareSeoMutation(
    {
      targetType: "page",
      targetId,
      title: "  A normalized SEO title  ",
      description: "   ",
      canonicalUrl: "  https://example.com/canonical  ",
      robots: "  index,follow  ",
    },
    null
  );
  const typedPlan: PreparedSeoMutation = plan;
  const typedAnalysis: SeoAnalysis = plan.analysis;

  expect(typedPlan.targetId).toBe(targetId);
  expect(typedAnalysis).toBe(plan.analysis);
  expect(plan).toMatchObject({
    existingId: null,
    slug: null,
    title: "A normalized SEO title",
    description: null,
    canonicalUrl: "https://example.com/canonical",
    robots: "index,follow",
  });
  expect(Object.isFrozen(plan)).toBe(true);
  expect(Object.isFrozen(plan.analysis)).toBe(true);
  expect(Object.isFrozen(plan.analysis.issues)).toBe(true);
  expect(plan.analysis.issues.length).toBeGreaterThan(0);
  expect(plan.analysis.issues.every((issue) => Object.isFrozen(issue))).toBe(true);
  const originalIssueMessages = plan.analysis.issues.map((issue) => issue.message);

  expect(() => {
    (plan as unknown as { title: string | null }).title = "mutated";
  }).toThrow();
  expect(() => {
    (plan.analysis.issues as unknown as Array<{ message: string }>)[0]!.message = "mutated";
  }).toThrow();
  expect(plan.title).toBe("A normalized SEO title");
  expect(plan.analysis.issues[0]?.message).not.toBe("mutated");

  const deferred = createDeferred<SeoRow[]>();
  const state = {
    selectKeys: [] as string[],
    returningKeys: [] as string[],
    values: null as unknown,
  };
  const executor = createDeferredInsertExecutor(deferred, state);
  deferred.resolve([
    makeSeoRow({
      targetId: plan.targetId,
      slug: plan.slug,
      title: plan.title,
      description: plan.description,
      canonicalUrl: plan.canonicalUrl,
      robots: plan.robots,
      score: plan.analysis.score,
      status: plan.analysis.status,
      issues: plan.analysis.issues,
    }),
  ]);
  const applied = await applyPreparedSeoMutationWithExecutor(executor, plan);
  const emitted = state.values as {
    slug: string | null;
    title: string | null;
    description: string | null;
    canonicalUrl: string | null;
    robots: string | null;
    score: number;
    status: string;
    issues: readonly unknown[];
  };
  expect(emitted).toMatchObject({
    slug: null,
    title: "A normalized SEO title",
    description: null,
    canonicalUrl: "https://example.com/canonical",
    robots: "index,follow",
    score: plan.analysis.score,
    status: plan.analysis.status,
  });
  expect(emitted.issues).toBe(plan.analysis.issues);
  expect(plan.analysis.issues.map((issue) => issue.message)).toEqual(originalIssueMessages);
  expect(applied?.title).toBe("A normalized SEO title");
});

test("prepareSeoMutation covers the complete per-field present-key matrix", () => {
  type MatrixCase = {
    name: string;
    existing: boolean;
    input: Partial<SeoUpsertInput>;
    expected?: Partial<PreparedSeoMutation>;
    error?: "seo_canonical_invalid" | "seo_robots_invalid";
  };

  const cases: MatrixCase[] = [
    {
      name: "all fields omitted on insert",
      existing: false,
      input: {},
      expected: {
        slug: null,
        title: null,
        description: null,
        canonicalUrl: null,
        robots: null,
      },
    },
    {
      name: "all fields omitted on existing row",
      existing: true,
      input: {},
      expected: {
        slug: "/matrix-existing",
        title: " Existing title bytes ",
        description: " Existing description bytes ",
        canonicalUrl: "legacy-canonical-bytes",
        robots: "legacy<robots>",
      },
    },
    {
      name: "slug undefined on insert",
      existing: false,
      input: { slug: undefined },
      expected: { slug: null },
    },
    {
      name: "slug null on insert",
      existing: false,
      input: { slug: null },
      expected: { slug: null },
    },
    {
      name: "slug undefined on existing row",
      existing: true,
      input: { slug: undefined },
      expected: { slug: "/matrix-existing" },
    },
    {
      name: "slug null on existing row",
      existing: true,
      input: { slug: null },
      expected: { slug: "/matrix-existing" },
    },
    {
      name: "title undefined",
      existing: true,
      input: { title: undefined },
      expected: { title: " Existing title bytes " },
    },
    { name: "title null", existing: true, input: { title: null }, expected: { title: null } },
    { name: "title blank", existing: true, input: { title: "   " }, expected: { title: null } },
    {
      name: "title trimmed",
      existing: true,
      input: { title: "  Trimmed title  " },
      expected: { title: "Trimmed title" },
    },
    {
      name: "description undefined",
      existing: true,
      input: { description: undefined },
      expected: { description: " Existing description bytes " },
    },
    {
      name: "description null",
      existing: true,
      input: { description: null },
      expected: { description: null },
    },
    {
      name: "description blank",
      existing: true,
      input: { description: "   " },
      expected: { description: null },
    },
    {
      name: "description trimmed",
      existing: true,
      input: { description: "  Trimmed description  " },
      expected: { description: "Trimmed description" },
    },
    {
      name: "canonical undefined on insert",
      existing: false,
      input: { canonicalUrl: undefined },
      expected: { canonicalUrl: null },
    },
    {
      name: "canonical undefined preserves existing bytes",
      existing: true,
      input: { canonicalUrl: undefined },
      expected: { canonicalUrl: "legacy-canonical-bytes" },
    },
    {
      name: "canonical null",
      existing: true,
      input: { canonicalUrl: null },
      expected: { canonicalUrl: null },
    },
    {
      name: "canonical blank",
      existing: true,
      input: { canonicalUrl: "   " },
      expected: { canonicalUrl: null },
    },
    {
      name: "canonical valid trim",
      existing: true,
      input: { canonicalUrl: "  https://example.com/matrix  " },
      expected: { canonicalUrl: "https://example.com/matrix" },
    },
    {
      name: "canonical invalid",
      existing: true,
      input: { canonicalUrl: "ftp://example.com/matrix" },
      error: "seo_canonical_invalid",
    },
    {
      name: "robots undefined on insert",
      existing: false,
      input: { robots: undefined },
      expected: { robots: null },
    },
    {
      name: "robots undefined preserves existing bytes",
      existing: true,
      input: { robots: undefined },
      expected: { robots: "legacy<robots>" },
    },
    { name: "robots null", existing: true, input: { robots: null }, expected: { robots: null } },
    { name: "robots blank", existing: true, input: { robots: "   " }, expected: { robots: null } },
    {
      name: "robots valid trim",
      existing: true,
      input: { robots: "  index,follow  " },
      expected: { robots: "index,follow" },
    },
    {
      name: "robots invalid",
      existing: true,
      input: { robots: "noindex<script>" },
      error: "seo_robots_invalid",
    },
  ];

  for (const scenario of cases) {
    const existing = scenario.existing
      ? makeSeoDocument({
          slug: "/matrix-existing",
          title: " Existing title bytes ",
          description: " Existing description bytes ",
          canonicalUrl: "legacy-canonical-bytes",
          robots: "legacy<robots>",
        })
      : null;
    const input: SeoUpsertInput = {
      targetType: "page",
      targetId: existing?.targetId ?? randomUUID(),
      ...scenario.input,
    };

    if (scenario.error) {
      expect(() => prepareSeoMutation(input, existing), scenario.name).toThrow(scenario.error);
    } else {
      expect(prepareSeoMutation(input, existing), scenario.name).toMatchObject(
        scenario.expected ?? {}
      );
    }
  }
});

test("prepareSeoMutation preserves omitted existing bytes including null slug input", () => {
  const existing = makeSeoDocument({
    slug: "/stored-slug",
    title: " Stored title bytes ",
    description: " Stored description bytes ",
    canonicalUrl: "legacy-canonical-bytes",
    robots: "legacy<robots>",
  });
  const plan = prepareSeoMutation(
    {
      targetType: existing.targetType,
      targetId: existing.targetId,
      slug: null,
      title: undefined,
      description: undefined,
      canonicalUrl: undefined,
      robots: undefined,
    },
    existing
  );

  expect(plan).toMatchObject({
    existingId: existing.id,
    slug: "/stored-slug",
    title: " Stored title bytes ",
    description: " Stored description bytes ",
    canonicalUrl: "legacy-canonical-bytes",
    robots: "legacy<robots>",
  });
});

test("prepareSeoMutation preserves the exact per-field clear and trim matrix", () => {
  const existing = makeSeoDocument();
  const cleared = prepareSeoMutation(
    {
      targetType: existing.targetType,
      targetId: existing.targetId,
      slug: "/replacement",
      title: null,
      description: "   ",
      canonicalUrl: null,
      robots: "   ",
    },
    existing
  );
  expect(cleared).toMatchObject({
    slug: "/replacement",
    title: null,
    description: null,
    canonicalUrl: null,
    robots: null,
  });

  const longTitle = `  ${"x".repeat(500)}  `;
  expect(
    prepareSeoMutation({ targetType: "page", targetId: randomUUID(), title: longTitle }, null).title
  ).toBe("x".repeat(500));
});

test("prepareSeoMutation rejects only explicit invalid canonical and robots values", () => {
  const targetId = randomUUID();
  expect(() =>
    prepareSeoMutation({ targetType: "page", targetId, canonicalUrl: "ftp://example.com" }, null)
  ).toThrow("seo_canonical_invalid");
  expect(() =>
    prepareSeoMutation({ targetType: "page", targetId, robots: "noindex<script>" }, null)
  ).toThrow("seo_robots_invalid");
});

test("executor preparation reads through the supplied projection and reaches no write on error", async () => {
  const existing = makeSeoRow();
  const state = { selectKeys: [] as string[], insertCalls: 0, updateCalls: 0 };
  const executor = createReadExecutor([existing], state);

  await expect(
    prepareSeoMutationWithExecutor(executor, {
      targetType: "page",
      targetId: existing.targetId,
      canonicalUrl: "javascript:invalid",
    })
  ).rejects.toThrow("seo_canonical_invalid");
  expect(state.selectKeys).toEqual([...SEO_DOCUMENT_KEYS]);
  expect(state.insertCalls).toBe(0);
  expect(state.updateCalls).toBe(0);
});

test("executor upsert awaits application and stays cache-silent on resolve and reject", async () => {
  const successCacheKey = seedSiteCache();
  const successTargetId = randomUUID();
  const successDeferred = createDeferred<SeoRow[]>();
  const successState = {
    selectKeys: [] as string[],
    returningKeys: [] as string[],
    values: null as unknown,
  };
  const successExecutor = createDeferredInsertExecutor(successDeferred, successState);
  let successSettled = false;
  const pendingSuccess = upsertSeoDocumentWithExecutor(successExecutor, {
    targetType: "page",
    targetId: successTargetId,
    title: "Deferred SEO title",
  });
  void pendingSuccess.then(
    () => {
      successSettled = true;
    },
    () => {
      successSettled = true;
    }
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(successSettled).toBe(false);
  expect(getSiteCacheEntry(successCacheKey, 1)).toBe("cached");

  successDeferred.resolve([
    makeSeoRow({
      targetId: successTargetId,
      title: "Deferred SEO title",
      score: 20,
      status: "issue",
    }),
  ]);
  const success = await pendingSuccess;
  expect(success?.targetId).toBe(successTargetId);
  expect(successState.selectKeys).toEqual([...SEO_DOCUMENT_KEYS]);
  expect(successState.returningKeys).toEqual([...SEO_DOCUMENT_KEYS]);
  expect(successState.values).toMatchObject({ targetId: successTargetId });
  expect(getSiteCacheEntry(successCacheKey, 1)).toBe("cached");

  const rejectionCacheKey = seedSiteCache();
  const rejectionDeferred = createDeferred<SeoRow[]>();
  const rejectionState = {
    selectKeys: [] as string[],
    returningKeys: [] as string[],
    values: null as unknown,
  };
  const rejectionExecutor = createDeferredInsertExecutor(rejectionDeferred, rejectionState);
  const pendingRejection = upsertSeoDocumentWithExecutor(rejectionExecutor, {
    targetType: "page",
    targetId: randomUUID(),
    title: "Rejected SEO title",
  });
  rejectionDeferred.reject(new Error("seo_apply_failed"));
  await expect(pendingRejection).rejects.toThrow("seo_apply_failed");
  expect(getSiteCacheEntry(rejectionCacheKey, 1)).toBe("cached");
  clearSiteCache();
});

test("SEO helper AST pins the projection and cache ownership without regex mirrors", () => {
  let projectionInitializer: Node | undefined;
  const findProjection = (node: Node) => {
    if (
      isVariableDeclaration(node) &&
      isIdentifier(node.name) &&
      node.name.text === "SEO_DOCUMENT_FIELDS"
    ) {
      projectionInitializer = node.initializer;
      return;
    }
    forEachChild(node, findProjection);
  };
  findProjection(seoServiceAst);
  const projectionObject =
    projectionInitializer && isAsExpression(projectionInitializer)
      ? projectionInitializer.expression
      : projectionInitializer;
  if (!projectionObject || !isObjectLiteralExpression(projectionObject)) {
    throw new Error("missing_seo_document_fields");
  }
  expect(
    projectionObject.properties.map((property) => property.name?.getText(seoServiceAst))
  ).toEqual([...SEO_DOCUMENT_KEYS]);

  const readHelper = findFunction(seoServiceAst, "getSeoDocumentByTargetWithExecutor");
  const applyHelper = findFunction(seoServiceAst, "applyPreparedSeoMutationWithExecutor");
  const executorWrapper = findFunction(seoServiceAst, "upsertSeoDocumentWithExecutor");
  const publicWrapper = findFunction(seoServiceAst, "upsertSeoDocument");
  expect(methodCallsNamed(readHelper, "select")[0]?.arguments[0]?.getText(seoServiceAst)).toBe(
    "SEO_DOCUMENT_FIELDS"
  );
  expect(
    methodCallsNamed(applyHelper, "returning").map((call) =>
      call.arguments[0]?.getText(seoServiceAst)
    )
  ).toEqual(["SEO_DOCUMENT_FIELDS", "SEO_DOCUMENT_FIELDS"]);
  expect(directCallsNamed(readHelper, "clearSiteCache")).toHaveLength(0);
  expect(directCallsNamed(applyHelper, "clearSiteCache")).toHaveLength(0);
  expect(directCallsNamed(executorWrapper, "clearSiteCache")).toHaveLength(0);

  const clearCalls = directCallsNamed(publicWrapper, "clearSiteCache");
  const applyCalls = directCallsNamed(publicWrapper, "applyPreparedSeoMutationWithExecutor");
  expect(clearCalls).toHaveLength(1);
  expect(applyCalls).toHaveLength(1);
  expect(clearCalls[0]!.getStart(seoServiceAst)).toBeGreaterThan(
    applyCalls[0]!.getStart(seoServiceAst)
  );
  const clearGuard = publicWrapper.body?.statements.find(isIfStatement);
  expect(clearGuard?.expression.getText(seoServiceAst)).toBe("result");
  expect(clearGuard ? directCallsNamed(clearGuard, "clearSiteCache") : []).toHaveLength(1);
});

testIfDb(
  "exact-ownership cleanup reports a CAS miss without clobbering changed state",
  async () => {
    let pageId: string | undefined;
    let seoId: string | undefined;
    const pageSlug = `seo-cas-${randomUUID()}`;
    const expectedSlug = `/${pageSlug}`;
    const concurrentSlug = `/concurrent-${randomUUID()}`;
    const concurrentUpdatedAt = new Date("2080-06-15T12:00:00.000Z");

    try {
      const [page] = await db
        .insert(pages)
        .values({
          title: "SEO cleanup CAS fixture",
          slug: pageSlug,
          currentData: { schemaVersion: 1, blocks: [] },
        })
        .returning({ id: pages.id });
      if (!page) throw new Error("missing_cleanup_cas_page");
      pageId = page.id;

      const [seo] = await db
        .insert(seoDocuments)
        .values({
          targetType: "page",
          targetId: page.id,
          slug: `/stale-${randomUUID()}`,
          title: "SEO cleanup CAS fixture",
          status: "warning",
          issues: [],
          updatedAt: new Date("2024-06-15T12:00:00.000Z"),
        })
        .returning({ id: seoDocuments.id });
      if (!seo) throw new Error("missing_cleanup_cas_seo");
      seoId = seo.id;

      let cleanupFailure: unknown;
      try {
        await withTrackedBroadSeoCreations(async () => {
          const [aligned] = await db
            .select({ slug: seoDocuments.slug, updatedAt: seoDocuments.updatedAt })
            .from(seoDocuments)
            .where(eq(seoDocuments.id, seo.id));
          expect(aligned?.slug).toBe(expectedSlug);
          if (!aligned) throw new Error("missing_aligned_cleanup_cas_seo");

          const [changed] = await db
            .update(seoDocuments)
            .set({ slug: concurrentSlug, updatedAt: concurrentUpdatedAt })
            .where(
              and(
                eq(seoDocuments.id, seo.id),
                eq(seoDocuments.slug, expectedSlug),
                eq(seoDocuments.updatedAt, aligned.updatedAt)
              )
            )
            .returning({ id: seoDocuments.id });
          expect(changed?.id).toBe(seo.id);
        });
      } catch (error) {
        cleanupFailure = error;
      }

      expect(cleanupFailure).toBeInstanceOf(AggregateError);
      const cleanupMessages = ((cleanupFailure as AggregateError).errors as unknown[]).map(
        (error) => (error instanceof Error ? error.message : String(error))
      );
      expect(cleanupMessages).toContain("seo_cleanup_restore_conflict");

      const [preserved] = await db
        .select({ slug: seoDocuments.slug, updatedAt: seoDocuments.updatedAt })
        .from(seoDocuments)
        .where(eq(seoDocuments.id, seo.id));
      expect(preserved?.slug).toBe(concurrentSlug);
      expect(preserved?.updatedAt.getTime()).toBe(concurrentUpdatedAt.getTime());
    } finally {
      if (seoId) await db.delete(seoDocuments).where(eq(seoDocuments.id, seoId));
      if (pageId) await db.delete(pages).where(eq(pages.id, pageId));
    }
  }
);

testIfDb(
  "executor insert/update/null use the exact mapped shape and stay cache-silent",
  async () => {
    const targetId = randomUUID();
    const cacheKey = seedSiteCache();
    try {
      const inserted = await upsertSeoDocumentWithExecutor(db, {
        targetType: "page",
        targetId,
        slug: "/executor-insert",
        title: "This is a properly sized executor title",
        description:
          "This executor description is long enough to satisfy the recommended SEO preview length.",
        canonicalUrl: "https://example.com/executor-insert",
        robots: "index,follow",
      });
      if (!inserted) throw new Error("missing_inserted_seo_doc");
      expect(Object.keys(inserted)).toEqual([...SEO_DOCUMENT_KEYS]);
      expect(inserted.createdAt).toBeInstanceOf(Date);
      expect(inserted.updatedAt).toBeInstanceOf(Date);
      expect(getSiteCacheEntry(cacheKey, 1)).toBe("cached");

      const authoredAuditAt = new Date("2024-05-01T00:00:00.000Z");
      const oldUpdatedAt = new Date("2024-05-02T00:00:00.000Z");
      await db
        .update(seoDocuments)
        .set({ lastAuditAt: authoredAuditAt, updatedAt: oldUpdatedAt })
        .where(eq(seoDocuments.id, inserted.id));

      const updated = await upsertSeoDocumentWithExecutor(db, {
        targetType: "page",
        targetId,
        title: "This is a properly sized updated executor title",
      });
      expect(updated?.createdAt.getTime()).toBe(inserted.createdAt.getTime());
      expect(updated?.lastAuditAt?.getTime()).toBe(authoredAuditAt.getTime());
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
      expect(getSiteCacheEntry(cacheKey, 1)).toBe("cached");

      const missingPlan = await prepareSeoMutationWithExecutor(db, {
        targetType: "page",
        targetId,
        robots: "noindex",
      });
      await db.delete(seoDocuments).where(eq(seoDocuments.id, inserted.id));
      await expect(applyPreparedSeoMutationWithExecutor(db, missingPlan)).resolves.toBeNull();
      expect(getSiteCacheEntry(cacheKey, 1)).toBe("cached");
    } finally {
      clearSiteCache();
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, targetId));
    }
  }
);

testIfDb("executor helpers see transaction-local state and roll application back", async () => {
  const targetId = randomUUID();
  try {
    await expect(
      db.transaction(async (tx) => {
        const [seeded] = await tx
          .insert(seoDocuments)
          .values({
            targetType: "page",
            targetId,
            title: "Transaction-local SEO title",
            status: "warning",
            issues: [],
          })
          .returning({ id: seoDocuments.id });
        if (!seeded) throw new Error("missing_transaction_seed");

        const plan = await prepareSeoMutationWithExecutor(tx, {
          targetType: "page",
          targetId,
          title: "Updated transaction-local SEO title",
        });
        expect(plan.existingId).toBe(seeded.id);
        const applied = await applyPreparedSeoMutationWithExecutor(tx, plan);
        expect(applied?.title).toBe("Updated transaction-local SEO title");
        throw new Error("task_537_force_rollback");
      })
    ).rejects.toThrow("task_537_force_rollback");
    await expect(getSeoDocumentByTarget("page", targetId)).resolves.toBeNull();
  } finally {
    await db.delete(seoDocuments).where(eq(seoDocuments.targetId, targetId));
  }
});

testIfDb(
  "standalone upsert alone clears cache after success and preserves it on DB rejection",
  async () => {
    await withPageFixture(async (pageId) => {
      const successKey = seedSiteCache();
      await upsertSeoDocument({
        targetType: "page",
        targetId: pageId,
        title: "Standalone cache-clearing SEO title",
      });
      expect(getSiteCacheEntry(successKey, 1)).toBeNull();

      const failureKey = seedSiteCache();
      await expect(
        upsertSeoDocument({
          targetType: "page",
          targetId: "not-a-valid-uuid",
          title: "Rejected standalone SEO title",
        })
      ).rejects.toThrow();
      expect(getSiteCacheEntry(failureKey, 1)).toBe("cached");
      clearSiteCache();
    });
  }
);

testIfDb("upsert and audit score SEO document", async () => {
  await withTrackedBroadSeoCreations(async () => {
    await withPageFixture(async (pageId) => {
      const title = "This is a properly sized meta title";
      const description =
        "This meta description is long enough to satisfy the recommended length range for SEO previews.";

      await upsertSeoDocument({
        targetType: "page",
        targetId: pageId,
        slug: "/seo-test",
        title,
        description,
        canonicalUrl: "https://example.com/seo-test",
        robots: "index,follow",
      });
      await runSeoAudit("page", pageId);

      const doc = await getSeoDocumentByTarget("page", pageId);
      expect(doc).not.toBeNull();
      expect(doc?.score).toBe(100);
      expect(doc?.status).toBe("ok");
      expect(doc?.issues.length).toBe(0);
    });
  });
});

testIfDb("updateSeoDocumentById preserves omitted fields and recalculates score", async () => {
  await withPageFixture(async (pageId) => {
    const doc = await upsertSeoDocument({
      targetType: "page",
      targetId: pageId,
      slug: "/seo-test",
      title: "Short title",
      description: null,
      canonicalUrl: "https://example.com/seo-test",
      robots: "index,follow",
    });
    if (!doc) throw new Error("missing_seo_doc");

    const updated = await updateSeoDocumentById(doc.id, {
      title: "This is a properly sized updated title",
      description:
        "This updated meta description is long enough to satisfy the recommended SEO preview length.",
    });
    expect(updated?.canonicalUrl).toBe("https://example.com/seo-test");
    expect(updated?.robots).toBe("index,follow");
    expect(updated?.score).toBe(100);
    expect(updated?.status).toBe("ok");
    expect(updated?.issues).toEqual([]);
  });
});

testIfDb("runSeoAudit applies selected checks with normalized score", async () => {
  await withTrackedBroadSeoCreations(async () => {
    await withPageFixture(async (pageId) => {
      await upsertSeoDocument({
        targetType: "page",
        targetId: pageId,
        slug: "/seo-test",
        title: "This is a properly sized meta title",
        description:
          "This meta description is long enough to satisfy the recommended length range for SEO previews.",
        canonicalUrl: null,
        robots: null,
      });
      await runSeoAudit("page", pageId, ["meta"]);

      const doc = await getSeoDocumentByTarget("page", pageId);
      expect(doc?.score).toBe(100);
      expect(doc?.status).toBe("ok");
      expect(doc?.issues.map((issue) => issue.code)).not.toContain("canonical_missing");
      expect(doc?.issues.map((issue) => issue.code)).not.toContain("robots_missing");
    });
  });
});

testIfDb(
  "resolvePublicSeoMetadata prefers target document and ignores orphan slug rows",
  async () => {
    await withPageFixture(async (pageId) => {
      const doc = await upsertSeoDocument({
        targetType: "page",
        targetId: pageId,
        slug: "/seo-test",
        title: "SEO document title wins over fallback",
        description:
          "SEO document description wins over the page-published fallback description for public HTML.",
        canonicalUrl: "https://example.com/seo-test",
        robots: "index,follow",
      });
      if (!doc) throw new Error("missing_seo_doc");

      await expect(
        resolvePublicSeoMetadata({
          targetType: "page",
          targetId: pageId,
          slug: "/seo-test",
          fallback: {
            title: "Fallback title",
            description: "Fallback description",
            canonicalUrl: "/fallback",
            robots: "noindex",
          },
        })
      ).resolves.toMatchObject({
        title: "SEO document title wins over fallback",
        description:
          "SEO document description wins over the page-published fallback description for public HTML.",
        canonicalUrl: "https://example.com/seo-test",
        robots: "index,follow",
      });

      await db.delete(seoDocuments).where(eq(seoDocuments.id, doc.id));
      const orphanTargetId = randomUUID();
      try {
        await db.insert(seoDocuments).values({
          targetType: "page",
          targetId: orphanTargetId,
          slug: "/seo-test",
          title: "Orphan slug title must not render",
          status: "warning",
          issues: [],
        });
        await expect(
          resolvePublicSeoMetadata({
            targetType: "page",
            targetId: pageId,
            slug: "/seo-test",
            fallback: {
              title: "Fallback title",
              description: "Fallback description",
              canonicalUrl: "/fallback",
              robots: "noindex",
            },
          })
        ).resolves.toMatchObject({
          title: "Fallback title",
          description: "Fallback description",
          canonicalUrl: "/fallback",
          robots: "noindex",
        });
      } finally {
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, orphanTargetId));
      }
    });
  }
);

testIfDb("listSeoDocuments includes target title", async () => {
  await withTrackedBroadSeoCreations(async () => {
    await withPageFixture(async (pageId) => {
      const list = await listSeoDocuments();
      const item = list.find((row) => row.targetId === pageId);
      expect(item?.targetTitle).toContain("SEO Test Page");
    });
  });
});

testIfDb("listExistingSeoDocuments and deleteSeoDocument do not create missing docs", async () => {
  await withPageFixture(async (pageId) => {
    const doc = await upsertSeoDocument({
      targetType: "page",
      targetId: pageId,
      slug: "/seo-test",
      title: "Existing SEO Test Page",
    });
    if (!doc) throw new Error("missing_seo_doc");

    const list = await listExistingSeoDocuments();
    expect(list.some((row) => row.id === doc.id)).toBe(true);
    const deleted = await deleteSeoDocument(doc.id);
    expect(deleted?.id).toBe(doc.id);
    await expect(getSeoDocumentByTarget("page", pageId)).resolves.toBeNull();
  });
});

testIfDb(
  "listExistingSeoDocuments prioritizes existing target titles over orphan docs",
  async () => {
    await withPageFixture(async (pageId) => {
      const matchedDoc = await upsertSeoDocument({
        targetType: "page",
        targetId: pageId,
        slug: "/seo-test",
        title: null,
      });
      if (!matchedDoc) throw new Error("missing_matched_seo_doc");
      const orphanTargetId = randomUUID();
      try {
        const [orphanDoc] = await db
          .insert(seoDocuments)
          .values({
            targetType: "page",
            targetId: orphanTargetId,
            slug: `/entry-${orphanTargetId}`,
            title: null,
            status: "warning",
            issues: [],
          })
          .returning({ id: seoDocuments.id });
        if (!orphanDoc) throw new Error("missing_orphan_seo_doc");

        const list = await listExistingSeoDocuments();
        const matchedIndex = list.findIndex((row) => row.id === matchedDoc.id);
        const orphanIndex = list.findIndex((row) => row.id === orphanDoc.id);
        expect(list[matchedIndex]?.targetTitle).toContain("SEO Test Page");
        expect(matchedIndex).toBeGreaterThanOrEqual(0);
        expect(orphanIndex).toBeGreaterThanOrEqual(0);
        expect(matchedIndex).toBeLessThan(orphanIndex);
      } finally {
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, orphanTargetId));
      }
    });
  }
);
