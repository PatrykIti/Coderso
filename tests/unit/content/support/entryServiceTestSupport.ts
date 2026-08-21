import { test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isAsExpression,
  isCallExpression,
  isFunctionDeclaration,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isVariableDeclaration,
  type CallExpression,
  type FunctionDeclaration,
  type Node,
  type SourceFile,
} from "typescript";
import { db } from "../../../../core/db/client";
import {
  contentEntries,
  contentRevisions,
  contentTermAssignments,
  contentTypes,
  previewTokens,
  seoDocuments,
  users,
} from "../../../../core/db/schema";
import {
  createEntry,
  createEntryMutationDepsForTest,
  type EntryMutationDeps,
} from "../../../../core/services/content/entryService";
import { createTerm, setTaxonomyConfig } from "../../../../core/services/content/taxonomyService";
import { createContentType } from "../../../../core/services/content/typeService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
export const testIfDb = hasDb ? test : test.skip;
export const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

export async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string" },
  },
};

export const uniqueName = (prefix: string) => `${prefix} ${randomUUID()}`;

export const entryServiceTestState = {
  contentTypeId: undefined as string | undefined,
  entryId: undefined as string | undefined,
  userId: undefined as string | undefined,
};

export const cleanup = async () => {
  if (entryServiceTestState.entryId) {
    await db.delete(seoDocuments).where(eq(seoDocuments.targetId, entryServiceTestState.entryId));
    await db
      .delete(contentRevisions)
      .where(eq(contentRevisions.entryId, entryServiceTestState.entryId));
    await db.delete(previewTokens).where(eq(previewTokens.targetId, entryServiceTestState.entryId));
    await db.delete(contentEntries).where(eq(contentEntries.id, entryServiceTestState.entryId));
  }
  if (entryServiceTestState.contentTypeId) {
    await db.delete(contentTypes).where(eq(contentTypes.id, entryServiceTestState.contentTypeId));
  }
  if (entryServiceTestState.userId) {
    await db.delete(users).where(eq(users.id, entryServiceTestState.userId));
  }
};

export const entryServiceSource = readFileSync(
  new URL("../../../../core/services/content/entryService.ts", import.meta.url),
  "utf8"
);
export const entryServiceAst = createSourceFile(
  "entryService.ts",
  entryServiceSource,
  ScriptTarget.Latest,
  true,
  ScriptKind.TS
);

export const findFunction = (sourceFile: SourceFile, name: string): FunctionDeclaration => {
  let found: FunctionDeclaration | undefined;
  const visit = (node: Node) => {
    if (isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (!found) forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!found) throw new Error(`missing_function:${name}`);
  return found;
};

export const collectCalls = (root: Node): CallExpression[] => {
  const calls: CallExpression[] = [];
  const visit = (node: Node) => {
    if (isCallExpression(node)) calls.push(node);
    forEachChild(node, visit);
  };
  visit(root);
  return calls;
};

export const methodCallsNamed = (root: Node, name: string) =>
  collectCalls(root).filter(
    (call) => isPropertyAccessExpression(call.expression) && call.expression.name.text === name
  );

export const readProjectionKeys = (name: string) => {
  let initializer: Node | undefined;
  const visit = (node: Node) => {
    if (isVariableDeclaration(node) && isIdentifier(node.name) && node.name.text === name) {
      initializer = node.initializer;
      return;
    }
    if (!initializer) forEachChild(node, visit);
  };
  visit(entryServiceAst);
  const object = initializer && isAsExpression(initializer) ? initializer.expression : initializer;
  if (!object || !isObjectLiteralExpression(object)) throw new Error(`missing_projection:${name}`);
  return object.properties.map((property) => property.name?.getText(entryServiceAst));
};

export const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

export type EntryMutationFixture = {
  actorId: string;
  entryId: string;
  typeId: string;
  typeSlug: string;
};

export const withEntryMutationFixture = async <T>(
  run: (fixture: EntryMutationFixture) => Promise<T>
): Promise<T> => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `entry-mutation-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("missing_entry_mutation_actor");

  let type: Awaited<ReturnType<typeof createContentType>> | null = null;
  let createdEntryId: string | null = null;

  try {
    type = await createContentType({
      name: uniqueName("Entry mutation"),
      slug: `entry-mutation-${randomUUID()}`,
      schema,
    });
    const entry = await createEntry(type.id, {
      title: "Entry mutation fixture",
      slug: `entry-mutation-${randomUUID()}`,
      data: { title: "Entry mutation fixture" },
      authorId: actor.id,
    });
    createdEntryId = entry.id;
    return await run({
      actorId: actor.id,
      entryId: entry.id,
      typeId: type.id,
      typeSlug: type.slug,
    });
  } finally {
    if (createdEntryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, createdEntryId));
      await db.delete(contentRevisions).where(eq(contentRevisions.entryId, createdEntryId));
      await db
        .delete(contentTermAssignments)
        .where(eq(contentTermAssignments.entryId, createdEntryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, createdEntryId));
    }
    if (type) await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
    await db.delete(users).where(eq(users.id, actor.id));
  }
};

export const createCacheRecordingDeps = (overrides: Partial<EntryMutationDeps> = {}) => {
  const cacheEvents: string[] = [];
  const deps = createEntryMutationDepsForTest({
    invalidateEntrySiteCache: async () => {
      cacheEvents.push("targeted");
    },
    clearAllSiteCache: () => {
      cacheEvents.push("global");
    },
    reportCacheFailure: (code) => {
      cacheEvents.push(`report:${code}`);
    },
    ...overrides,
  });
  return { cacheEvents, deps };
};

export const createMutationTag = async (typeId: string, name = "Mutation tag") => {
  const taxonomies = await setTaxonomyConfig(typeId, { categories: true, tags: true });
  const tagTaxonomy = taxonomies.find((taxonomy) => taxonomy.kind === "tag");
  if (!tagTaxonomy) throw new Error("missing_mutation_tag_taxonomy");
  const tag = await createTerm(tagTaxonomy.id, { name: `${name} ${randomUUID()}` });
  if (!tag) throw new Error("missing_mutation_tag");
  return tag;
};

export const readStoredEntryMutationState = async (entryId: string) => {
  const [row] = await db
    .select({
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      accessPassword: contentEntries.accessPassword,
      tags: contentEntries.tags,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
    })
    .from(contentEntries)
    .where(eq(contentEntries.id, entryId));
  if (!row) throw new Error("missing_stored_entry_mutation_state");
  return row;
};

export const readEntryMutationDomainSnapshot = async (entryId: string) => ({
  entry: await readStoredEntryMutationState(entryId),
  revisions: await db
    .select({
      id: contentRevisions.id,
      version: contentRevisions.version,
      data: contentRevisions.data,
      createdBy: contentRevisions.createdBy,
    })
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, entryId)),
  assignments: await db
    .select({ termId: contentTermAssignments.termId })
    .from(contentTermAssignments)
    .where(eq(contentTermAssignments.entryId, entryId)),
  seo: await db
    .select({
      id: seoDocuments.id,
      title: seoDocuments.title,
      description: seoDocuments.description,
      canonicalUrl: seoDocuments.canonicalUrl,
      robots: seoDocuments.robots,
    })
    .from(seoDocuments)
    .where(eq(seoDocuments.targetId, entryId)),
});

export const hasSecretKey = (value: unknown) => {
  const serialized = JSON.stringify(value);
  return serialized.includes("accessPassword") || serialized.includes("access_password");
};
