import { SmokeError } from "../../contracts";

/**
 * TASK-105 L05 synthetic fixture facts (contract: TASK-105-08-05-L04).
 *
 * One namespaced non-system role with exactly the seven canonical permissions,
 * one synthetic active admin user linked only to that role, one published
 * public page, and one bounded session. Creation first proves the owned
 * identities are absent. Core services load lazily so this module stays DB-free
 * at import time.
 */

export const TASK105_L05_CANONICAL_PERMISSIONS = Object.freeze([
  "menus:read",
  "menus:write",
  "settings:read",
  "settings:write",
  "content:read",
  "dashboard:write",
  "solution-kits:read",
] as const);

export function task105L05RoleName(session: string): string {
  return `task-105-l05-${session}-role`;
}

export function task105L05UserEmail(session: string): string {
  return `task-105-l05-${session}@smoke.invalid`;
}

/** Bounded fixture metadata safe for the browser semantic-driver contract. */
export interface Task105L05FixturePage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly relativePath: string;
}

export interface Task105L05FixtureFacts {
  readonly roleId: string;
  readonly roleDescription: string;
  readonly roleXmin: string;
  readonly userId: string;
  readonly permissions: readonly string[];
  readonly userRoleLink: { readonly userId: string; readonly roleId: string };
}

export interface FixtureRoleIdentity {
  readonly roleId: string;
  readonly roleDescription: string;
  readonly roleXmin: string;
}

interface FixtureDeps {
  readonly assertAbsent: (input: { roleName: string; email: string }) => Promise<void>;
  readonly createRoleWithId: (input: {
    name: string;
    description: string;
    permissions: readonly string[];
  }) => Promise<FixtureRoleIdentity>;
  readonly createUserWithRole: (input: {
    email: string;
    roleId: string;
  }) => Promise<{ userId: string; link: { userId: string; roleId: string } }>;
  readonly createSessionForUser: (input: {
    userId: string;
    userAgent: string;
  }) => Promise<{ sessionId: string; tokenHash: string }>;
  readonly createPublishedPage: (input: {
    session: string;
    userId: string;
  }) => Promise<Task105L05FixturePage>;
  /** Awaited worker-local receipt checkpoint before the next mutation begins. */
  readonly onRoleCreated?: (role: FixtureRoleIdentity) => Promise<void> | void;
  /** Awaited worker-local receipt checkpoint before the next mutation begins. */
  readonly onUserCreated?: (userId: string) => Promise<void> | void;
  /** Awaited worker-local receipt checkpoint before the next mutation begins. */
  readonly onSessionCreated?: (session: {
    readonly sessionId: string;
    readonly tokenHash: string;
  }) => Promise<void> | void;
  /** Awaited worker-local receipt checkpoint before the next mutation begins. */
  readonly onPageCreated?: (pageId: string) => Promise<void> | void;
}

export interface Task105L05FixtureOwnershipCallbacks {
  readonly onRoleCreated?: (role: FixtureRoleIdentity) => Promise<void> | void;
  readonly onUserCreated?: (userId: string) => Promise<void> | void;
  readonly onSessionCreated?: (session: {
    readonly sessionId: string;
    readonly tokenHash: string;
  }) => Promise<void> | void;
  readonly onPageCreated?: (pageId: string) => Promise<void> | void;
}

function ownershipCallbacks(input: Partial<FixtureDeps>): Task105L05FixtureOwnershipCallbacks {
  return {
    onRoleCreated: input.onRoleCreated,
    onUserCreated: input.onUserCreated,
    onSessionCreated: input.onSessionCreated,
    onPageCreated: input.onPageCreated,
  };
}

async function defaultFixtureDeps(): Promise<FixtureDeps> {
  const [roles, users, sessions] = await Promise.all([
    import("../../../../core/services/admin/rolesService"),
    import("../../../../core/services/admin/usersService"),
    import("../../../../core/services/auth/sessionService"),
  ]);
  void sessions;
  return {
    assertAbsent: async () => {
      /* proven against the live roles/users tables by the worker at smoke time */
    },
    createRoleWithId: async ({ name, description, permissions }) => {
      const role = await roles.createRole({ name, description, permissions: [...permissions] });
      if (role === null)
        throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 role creation failed");
      const [{ db }, schema] = await Promise.all([
        import("../../../../core/db/client"),
        import("../../../../core/db/schema"),
      ]);
      const { eq, sql } = await import("drizzle-orm");
      const [identity] = await db
        .select({
          id: schema.roles.id,
          description: schema.roles.description,
          xmin: sql<string>`xmin::text`.as("xmin"),
        })
        .from(schema.roles)
        .where(eq(schema.roles.id, role.id))
        .limit(1);
      if (
        identity === undefined ||
        identity.description !== description ||
        typeof identity.xmin !== "string"
      ) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 role identity could not be captured"
        );
      }
      return Object.freeze({
        roleId: identity.id,
        roleDescription: description,
        roleXmin: identity.xmin,
      });
    },
    createUserWithRole: async ({ email, roleId }) => {
      const user = await users.createUser({
        email,
        name: `task-105-l05 smoke ${email.split("@")[0] ?? "user"}`,
        roleIds: [roleId],
        status: "active",
      });
      if (user === null)
        throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 user creation failed");
      return { userId: user.id, link: { userId: user.id, roleId } };
    },
    createSessionForUser: async ({ userId, userAgent }) => {
      const created = await sessions.createSession({ userId, userAgent });
      const tokenHash = sessions.hashSessionToken(created.token);
      void created.token;
      return { sessionId: created.session.id, tokenHash };
    },
    createPublishedPage: async () => {
      throw new SmokeError(
        "smoke_adapter_unavailable",
        "TASK-105 L05 page creation requires the persistent worker"
      );
    },
  };
}

/**
 * Creates the namespaced synthetic fixture and returns only bounded facts.
 * The opaque session token never crosses a worker response; only its hash
 * identity is retained for cleanup ownership proofs.
 */
export async function createTask105L05Fixture(input: {
  readonly session: string;
  readonly deps?: Partial<FixtureDeps>;
}): Promise<{
  readonly facts: Task105L05FixtureFacts;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly fixturePage: Task105L05FixturePage;
}> {
  const defaults = await defaultFixtureDeps();
  const deps: FixtureDeps = { ...defaults, ...input.deps };
  const roleName = task105L05RoleName(input.session);
  const email = task105L05UserEmail(input.session);
  await deps.assertAbsent({ roleName, email });
  const callbacks = ownershipCallbacks(deps);
  const roleIdentity = await deps.createRoleWithId({
    name: roleName,
    description: `TASK-105 L05 synthetic role for ${input.session}`,
    permissions: TASK105_L05_CANONICAL_PERMISSIONS,
  });
  await callbacks.onRoleCreated?.(roleIdentity);
  const { userId, link } = await deps.createUserWithRole({ email, roleId: roleIdentity.roleId });
  await callbacks.onUserCreated?.(userId);
  const session = await deps.createSessionForUser({
    userId,
    userAgent: `coderso-runtime-smoke/task-105-l05 (${input.session})`,
  });
  await callbacks.onSessionCreated?.({
    sessionId: session.sessionId,
    tokenHash: session.tokenHash,
  });
  const fixturePage = await deps.createPublishedPage({ session: input.session, userId });
  await callbacks.onPageCreated?.(fixturePage.id);
  return Object.freeze({
    facts: Object.freeze({
      roleId: roleIdentity.roleId,
      roleDescription: roleIdentity.roleDescription,
      roleXmin: roleIdentity.roleXmin,
      userId,
      permissions: TASK105_L05_CANONICAL_PERMISSIONS,
      userRoleLink: Object.freeze(link),
    }),
    sessionId: session.sessionId,
    tokenHash: session.tokenHash,
    fixturePage: Object.freeze({ ...fixturePage }),
  });
}
