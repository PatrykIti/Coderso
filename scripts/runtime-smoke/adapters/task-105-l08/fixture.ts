import { SmokeError } from "../../contracts";
import type { LifecycleResource } from "../../lifecycle";
import { writeAdminSessionStorageState } from "../../browser/admin-auth";
import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../../core/services/pages/pageDocumentV2Normalizer";

/**
 * TASK-105 L08 namespaced synthetic fixture (contract: TASK-105-08-08-L07).
 *
 * One least-privilege non-system role, one synthetic active admin user linked
 * only to that role, one bounded session, two draft pages, and three draft
 * posts. Every identity is namespaced by the smoke session and every owned row
 * is removed again by the aggregate fail-closed cleanup resource. Core services
 * load lazily so this module stays DB-free at import time.
 */

export const TASK105_L08_PERMISSIONS = Object.freeze([
  "content:read",
  "content:write",
  "content:publish",
  "media:read",
  "settings:read",
  "settings:write",
] as const);

/** Settings the suite owns during the run and restores in cleanup. */
export const TASK105_L08_LEASED_SETTING_KEYS = Object.freeze([
  "site.adminPath",
  "site.contentRoutes",
] as const);

export type Task105L08LeasedSettingKey = (typeof TASK105_L08_LEASED_SETTING_KEYS)[number];

const SESSION_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;

export function requireTask105L08Session(session: string): string {
  if (typeof session !== "string" || !SESSION_PATTERN.test(session)) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L08 session is invalid");
  }
  return session;
}

export function task105L08RoleName(session: string): string {
  return `task-105-l08-${session}-role`;
}

export function task105L08UserEmail(session: string): string {
  return `task-105-l08-${session}@smoke.invalid`;
}

export function task105L08AdminBase(session: string): string {
  return `/${session}-admin`;
}

export function task105L08ContentListPath(session: string): string {
  return `/${session}-journal`;
}

interface SettingRowIdentity {
  readonly key: string;
  readonly xmin: string;
}

export interface Task105L08SettingBaseline {
  readonly key: Task105L08LeasedSettingKey;
  readonly value: unknown;
  readonly identity: SettingRowIdentity | null;
}

export interface Task105L08OwnedSetting {
  readonly key: Task105L08LeasedSettingKey;
  readonly identity: SettingRowIdentity;
}

export interface Task105L08FixturePage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
}

export interface Task105L08FixturePost {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
}

export interface Task105L08FixtureContent {
  readonly insertPage: Task105L08FixturePage;
  readonly parityPage: Task105L08FixturePage;
  readonly blockPost: Task105L08FixturePost;
  readonly classicPost: Task105L08FixturePost;
  readonly richtextPost: Task105L08FixturePost;
}

/** Bounded fixture facts. No token, email body, or raw setting JSON is retained. */
export interface Task105L08FixtureFacts {
  readonly roleId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly permissions: readonly string[];
  readonly adminBase: string;
  readonly contentListPath: string;
  readonly content: Task105L08FixtureContent;
}

export interface Task105L08FixtureHandle {
  readonly facts: Task105L08FixtureFacts;
  readonly cleanup: LifecycleResource;
}

interface FixtureDeps {
  readonly assertAbsent: (input: {
    readonly roleName: string;
    readonly email: string;
  }) => Promise<void>;
  readonly createRole: (input: {
    readonly name: string;
    readonly description: string;
    readonly permissions: readonly string[];
  }) => Promise<string>;
  readonly createUser: (input: {
    readonly email: string;
    readonly roleId: string;
  }) => Promise<string>;
  readonly createSession: (input: {
    readonly userId: string;
    readonly userAgent: string;
  }) => Promise<{ readonly sessionId: string; readonly token: string }>;
  readonly readSettingRow: (
    key: Task105L08LeasedSettingKey
  ) => Promise<{ readonly value: unknown; readonly xmin: string } | null>;
  readonly writeSetting: (input: {
    readonly key: Task105L08LeasedSettingKey;
    readonly value: unknown;
  }) => Promise<SettingRowIdentity>;
  readonly deleteSettingRow: (key: Task105L08LeasedSettingKey) => Promise<void>;
  readonly createPage: (input: {
    readonly title: string;
    readonly slug: string;
    readonly document: unknown;
    readonly authorId: string;
  }) => Promise<Task105L08FixturePage>;
  readonly createPost: (input: {
    readonly title: string;
    readonly authorId: string;
  }) => Promise<Task105L08FixturePost>;
  readonly writeStorageState: (input: {
    readonly adminUrl: string;
    readonly workspace: string;
    readonly storageStatePath: string;
    readonly sessionValue: string;
  }) => Promise<void>;
}

function fail(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

/**
 * Releases the lazy shared database client as the lifecycle's final act.
 *
 * Registered first so reverse-order teardown closes it after every other
 * resource (including fixture absence proofs). Without this release the
 * idle pool keeps the orchestrator process alive after a finished report —
 * the same contract the shared worker lane documents for its own workers.
 */
export function createTask105L08DatabaseReleaseResource(): LifecycleResource {
  return {
    name: "task-105-l08-database-client",
    close: async () => {
      const { closeDatabase } = await import("../../../../core/db/client");
      await closeDatabase();
    },
    proveAbsent: async () => true,
  };
}

/**
 * Bounded adapter seam: the production fixture has no browser-owned page
 * creation path, so any attempt to use one fails closed instead of improvising.
 */
export function defaultTask105L08AdapterFixtureDeps(): {
  readonly createPublishedPage: () => Promise<never>;
} {
  return Object.freeze({
    createPublishedPage: (): Promise<never> =>
      Promise.reject(
        new SmokeError(
          "smoke_adapter_unavailable",
          "TASK-105 L08 pages are provisioned in-process through the shared page service"
        )
      ),
  });
}

async function defaultFixtureDeps(): Promise<FixtureDeps> {
  const [{ db }, schema, drizzle] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
    import("drizzle-orm"),
  ]);
  const { eq, sql } = drizzle;
  const [roles, users, sessions, settings, pages, posts] = await Promise.all([
    import("../../../../core/services/admin/rolesService"),
    import("../../../../core/services/admin/usersService"),
    import("../../../../core/services/auth/sessionService"),
    import("../../../../core/services/settings/settingsService"),
    import("../../../../core/services/pages/pageService"),
    import("../../../../core/services/content/postsService"),
  ]);
  return {
    assertAbsent: async ({ roleName, email }) => {
      const [role] = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.name, roleName))
        .limit(1);
      const [user] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (role !== undefined || user !== undefined) {
        fail("TASK-105 L08 fixture identity already exists");
      }
    },
    createRole: async ({ name, description, permissions }) => {
      const role = await roles.createRole({ name, description, permissions: [...permissions] });
      if (role === null) fail("TASK-105 L08 role creation failed");
      return role.id;
    },
    createUser: async ({ email, roleId }) => {
      const user = await users.createUser({
        email,
        name: `task-105-l08 smoke ${email.split("@")[0] ?? "user"}`,
        roleIds: [roleId],
        status: "active",
      });
      if (user === null) fail("TASK-105 L08 user creation failed");
      return user.id;
    },
    createSession: async ({ userId, userAgent }) => {
      const created = await sessions.createSession({ userId, userAgent });
      return Object.freeze({ sessionId: created.session.id, token: created.token });
    },
    readSettingRow: async (key) => {
      const [row] = await db
        .select({
          value: schema.settings.value,
          xmin: sql<string>`xmin::text`.as("xmin"),
        })
        .from(schema.settings)
        .where(eq(schema.settings.key, key))
        .limit(1);
      return row === undefined ? null : Object.freeze({ value: row.value, xmin: row.xmin });
    },
    writeSetting: async ({ key, value }) => {
      await settings.setSetting(key, value);
      const [row] = await db
        .select({ xmin: sql<string>`xmin::text`.as("xmin") })
        .from(schema.settings)
        .where(eq(schema.settings.key, key))
        .limit(1);
      if (row === undefined || typeof row.xmin !== "string") {
        fail("TASK-105 L08 setting ownership could not be captured");
      }
      return Object.freeze({ key, xmin: row.xmin });
    },
    deleteSettingRow: async (key) => {
      await settings.deleteSetting(key);
    },
    createPage: async ({ title, slug, document, authorId }) => {
      const page = await pages.createPage({
        title,
        slug,
        data: document as Record<string, unknown>,
        authorId,
      });
      if (page === null) fail("TASK-105 L08 page creation failed");
      return Object.freeze({ id: page.id, title: page.title, slug: page.slug });
    },
    createPost: async ({ title, authorId }) => {
      const post = await posts.createPost({ title, authorId });
      if (post === null) fail("TASK-105 L08 post creation failed");
      return Object.freeze({ id: post.id, title: post.title, slug: post.slug });
    },
    writeStorageState: async ({ adminUrl, workspace, storageStatePath, sessionValue }) => {
      await writeAdminSessionStorageState({
        adminUrl,
        expectedAdminPath: new URL(adminUrl).pathname,
        workspace,
        storageStatePath,
        sessionValue,
      });
    },
  };
}

function parityPageDocument(heading: string): unknown {
  const document = createDefaultPageDocumentV2();
  const section = createPageSectionV2("content", {
    name: "Parity",
    blocks: [createPageBlockV2("heading", { props: { text: heading, level: 2 } })],
  });
  return { ...document, sections: [section] };
}

const PAGE_INSERT_SLUG = "l08-deep-insert";
const PAGE_PARITY_SLUG = "l08-device-parity";

function slugFor(session: string, leaf: string): string {
  return `/${session}-${leaf}`;
}

export async function createTask105L08Fixture(input: {
  readonly session: string;
  readonly workspace: string;
  readonly storageStatePath: string;
  readonly adminOrigin: string;
  readonly deps?: Partial<FixtureDeps>;
}): Promise<Task105L08FixtureHandle> {
  const session = requireTask105L08Session(input.session);
  const deps: FixtureDeps = { ...(await defaultFixtureDeps()), ...input.deps };
  const roleName = task105L08RoleName(session);
  const email = task105L08UserEmail(session);
  const adminBase = task105L08AdminBase(session);
  await deps.assertAbsent({ roleName, email });

  const baselines = new Map<Task105L08LeasedSettingKey, Task105L08SettingBaseline>();
  const owned = new Map<Task105L08LeasedSettingKey, Task105L08OwnedSetting>();
  let revoked = false;
  let removedUser: string | null = null;
  let removedRole: string | null = null;
  let closed = false;

  const roleId = await deps.createRole({
    name: roleName,
    description: `TASK-105 L08 synthetic role for ${session}`,
    permissions: TASK105_L08_PERMISSIONS,
  });
  const userId = await deps.createUser({ email, roleId });
  const created = await deps.createSession({
    userId,
    userAgent: `coderso-runtime-smoke/task-105-l08 (${session})`,
  });

  const cleanupRows: { readonly key: Task105L08LeasedSettingKey; readonly value: unknown }[] = [
    Object.freeze({ key: "site.adminPath" as const, value: adminBase }),
    Object.freeze({
      key: "site.contentRoutes" as const,
      value: [
        {
          type: "post",
          listPath: task105L08ContentListPath(session),
          detailPath: `${task105L08ContentListPath(session)}/:slug`,
          enabled: true,
        },
      ],
    }),
  ];
  for (const row of cleanupRows) {
    const before = await deps.readSettingRow(row.key);
    baselines.set(
      row.key,
      Object.freeze({
        key: row.key,
        value: before?.value ?? null,
        identity: before === null ? null : Object.freeze({ key: row.key, xmin: before.xmin }),
      })
    );
    owned.set(row.key, Object.freeze({ key: row.key, identity: await deps.writeSetting(row) }));
  }

  await deps.writeStorageState({
    adminUrl: `${input.adminOrigin}${adminBase}`,
    workspace: input.workspace,
    storageStatePath: input.storageStatePath,
    sessionValue: created.token,
  });
  // The raw session token is never retained beyond the storage-state write.
  void created.token;

  const authorId = userId;
  const insertPage = await deps.createPage({
    title: `TASK-105 L08 deep insert ${session}`,
    slug: slugFor(session, PAGE_INSERT_SLUG),
    document: parityPageDocument(`Deep insert ${session}`),
    authorId,
  });
  const parityPage = await deps.createPage({
    title: `TASK-105 L08 device parity ${session}`,
    slug: slugFor(session, PAGE_PARITY_SLUG),
    document: parityPageDocument(`Device parity ${session}`),
    authorId,
  });
  const blockPost = await deps.createPost({
    title: `TASK-105 L08 block post ${session}`,
    authorId,
  });
  const classicPost = await deps.createPost({
    title: `TASK-105 L08 classic post ${session}`,
    authorId,
  });
  const richtextPost = await deps.createPost({
    title: `TASK-105 L08 richtext post ${session}`,
    authorId,
  });

  const facts: Task105L08FixtureFacts = Object.freeze({
    roleId,
    userId,
    sessionId: created.sessionId,
    permissions: TASK105_L08_PERMISSIONS,
    adminBase,
    contentListPath: task105L08ContentListPath(session),
    content: Object.freeze({
      insertPage: Object.freeze(insertPage),
      parityPage: Object.freeze(parityPage),
      blockPost: Object.freeze(blockPost),
      classicPost: Object.freeze(classicPost),
      richtextPost: Object.freeze(richtextPost),
    }),
  });

  const cleanup: LifecycleResource = {
    name: "task-105-l08-fixture-cleanup",
    close: async () => {
      if (closed) return;
      closed = true;
      // 1. Settings are restored first, with an owned-identity CAS guard.
      for (const row of [...cleanupRows].reverse()) {
        const baseline = baselines.get(row.key);
        const ownedRow = owned.get(row.key);
        if (baseline === undefined || ownedRow === undefined) {
          fail("TASK-105 L08 setting ownership is unbound");
        }
        const current = await deps.readSettingRow(row.key);
        if (current === null || current.xmin !== ownedRow.identity.xmin) {
          fail("TASK-105 L08 owned setting drifted before restore");
        }
        if (baseline.identity === null) await deps.deleteSettingRow(row.key);
        else await deps.writeSetting({ key: row.key, value: baseline.value });
        const restored = await deps.readSettingRow(row.key);
        if (baseline.identity === null) {
          if (restored !== null) fail("TASK-105 L08 setting restore left an owned row");
        } else if (
          restored === null ||
          typeof restored.value !== typeof baseline.value ||
          JSON.stringify(restored.value) !== JSON.stringify(baseline.value)
        ) {
          fail("TASK-105 L08 setting restore did not re-create the baseline");
        }
      }
      // 2. Synthetic content rows are removed by id.
      const [{ db: database }, schema, drizzle] = await Promise.all([
        import("../../../../core/db/client"),
        import("../../../../core/db/schema"),
        import("drizzle-orm"),
      ]);
      const [pagesService, postsService, sessionsService, usersService, rolesService] =
        await Promise.all([
          import("../../../../core/services/pages/pageService"),
          import("../../../../core/services/content/postsService"),
          import("../../../../core/services/auth/sessionService"),
          import("../../../../core/services/admin/usersService"),
          import("../../../../core/services/admin/rolesService"),
        ]);
      for (const post of [
        facts.content.richtextPost,
        facts.content.classicPost,
        facts.content.blockPost,
      ]) {
        await postsService.deletePost(post.id);
      }
      for (const page of [facts.content.parityPage, facts.content.insertPage]) {
        await pagesService.deletePage(page.id);
      }
      if (!revoked) {
        await sessionsService.revokeSession(facts.sessionId);
        revoked = true;
      }
      await usersService.deleteUser(facts.userId);
      removedUser = facts.userId;
      await rolesService.deleteRole(facts.roleId);
      removedRole = facts.roleId;
      // 3. Fail closed if any owned identity survived.
      const survivors = await Promise.all([
        database
          .select({ id: schema.pages.id })
          .from(schema.pages)
          .where(drizzle.eq(schema.pages.id, facts.content.insertPage.id)),
        database
          .select({ id: schema.pages.id })
          .from(schema.pages)
          .where(drizzle.eq(schema.pages.id, facts.content.parityPage.id)),
        database
          .select({ id: schema.posts.id })
          .from(schema.posts)
          .where(drizzle.eq(schema.posts.id, facts.content.blockPost.id)),
        database
          .select({ id: schema.posts.id })
          .from(schema.posts)
          .where(drizzle.eq(schema.posts.id, facts.content.classicPost.id)),
        database
          .select({ id: schema.posts.id })
          .from(schema.posts)
          .where(drizzle.eq(schema.posts.id, facts.content.richtextPost.id)),
        database
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(drizzle.eq(schema.users.id, facts.userId)),
        database
          .select({ id: schema.roles.id })
          .from(schema.roles)
          .where(drizzle.eq(schema.roles.id, facts.roleId)),
      ]);
      if (survivors.some((rows) => rows.length > 0)) {
        fail("TASK-105 L08 fixture cleanup left owned rows behind");
      }
    },
    proveAbsent: async () => {
      if (!closed || removedUser !== facts.userId || removedRole !== facts.roleId || !revoked) {
        return false;
      }
      const [{ db: database }, schema, drizzle] = await Promise.all([
        import("../../../../core/db/client"),
        import("../../../../core/db/schema"),
        import("drizzle-orm"),
      ]);
      const [user] = await database
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(drizzle.eq(schema.users.id, facts.userId))
        .limit(1);
      const [role] = await database
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(drizzle.eq(schema.roles.id, facts.roleId))
        .limit(1);
      return user === undefined && role === undefined;
    },
  };

  return Object.freeze({ facts, cleanup });
}
