import { lstat } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import { sql } from "drizzle-orm";

import { SmokeError } from "../../contracts";
import {
  TASK105_L05_CANONICAL_PERMISSIONS,
  task105L05RoleName,
  task105L05UserEmail,
} from "./fixture";
import { TASK105_L05_LEASED_SETTING_KEYS } from "./settings-lease";
import type {
  Task105L05CleanupDeps,
  Task105L05CleanupOwnership,
  Task105L05CleanupOwnershipCell,
} from "./cleanup";

interface Task105L05CleanupCore {
  readonly db: typeof import("../../../../core/db/client").db;
  readonly schema: typeof import("../../../../core/db/schema");
  readonly acquireNativeCmsWriterFence: typeof import("../../../../core/db/nativeCmsWriterFence").acquireNativeCmsWriterFence;
}

type CleanupOwnershipResolver = (
  cell: Task105L05CleanupOwnershipCell
) => Task105L05CleanupOwnership | null;

async function task105L05CleanupCore(): Promise<Task105L05CleanupCore> {
  const [client, schema, fence] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
    import("../../../../core/db/nativeCmsWriterFence"),
  ]);
  return {
    db: client.db,
    schema,
    acquireNativeCmsWriterFence: fence.acquireNativeCmsWriterFence,
  };
}

function assertExpectedRole(
  row: Readonly<{
    id: string;
    name: string;
    description: string | null;
    permissions: unknown;
    xmin: string;
  }>,
  expected: Readonly<{
    roleId: string;
    roleDescription: string;
    roleXmin: string;
    permissions: readonly string[];
    session: string;
  }>
): void {
  if (
    row.id !== expected.roleId ||
    row.name !== task105L05RoleName(expected.session) ||
    row.description !== expected.roleDescription ||
    row.xmin !== expected.roleXmin ||
    !isDeepStrictEqual(row.permissions, [...TASK105_L05_CANONICAL_PERMISSIONS]) ||
    !isDeepStrictEqual(row.permissions, [...expected.permissions])
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 role ownership drifted");
  }
}

async function expectRowCount(query: Promise<readonly unknown[]>, label: string): Promise<void> {
  const rows = await query;
  if (rows.length > 0) {
    throw new SmokeError(
      "smoke_cleanup_failed",
      `TASK-105 L05 synthetic ${label} survived cleanup`
    );
  }
}

/** Concrete DB and filesystem operations used by the cleanup lifecycle facade. */
export function createTask105L05LiveCleanupDeps(
  cell: Task105L05CleanupOwnershipCell,
  overrides: Partial<Task105L05CleanupDeps>,
  ownershipForCleanup: CleanupOwnershipResolver
): Task105L05CleanupDeps {
  return {
    restoreLease: () =>
      Promise.reject(
        new SmokeError("smoke_cleanup_failed", "TASK-105 L05 lease restore was not supplied")
      ),

    async proveSessionIdentity(input) {
      const core = await task105L05CleanupCore();
      const { and, eq, isNull } = await import("drizzle-orm");
      const rows = await core.db
        .select({ id: core.schema.sessions.id })
        .from(core.schema.sessions)
        .where(
          and(
            eq(core.schema.sessions.id, input.sessionId),
            eq(core.schema.sessions.userId, input.userId),
            eq(core.schema.sessions.tokenHash, input.tokenHash),
            isNull(core.schema.sessions.revokedAt)
          )
        )
        .limit(1);
      if (rows.length === 0) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 session identity could not be proven"
        );
      }
    },

    async cleanupSession(input) {
      const core = await task105L05CleanupCore();
      const { and, eq, isNull } = await import("drizzle-orm");
      await core.db.transaction(async (tx) => {
        const rows = await tx
          .select({ id: core.schema.sessions.id })
          .from(core.schema.sessions)
          .where(
            and(
              eq(core.schema.sessions.id, input.sessionId),
              eq(core.schema.sessions.userId, input.userId),
              eq(core.schema.sessions.tokenHash, input.tokenHash),
              isNull(core.schema.sessions.revokedAt)
            )
          )
          .for("update")
          .limit(1);
        if (rows.length === 0) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-105 L05 session identity could not be proven"
          );
        }
        await tx
          .update(core.schema.sessions)
          .set({ revokedAt: sql`clock_timestamp()` })
          .where(eq(core.schema.sessions.id, input.sessionId));
        await tx.delete(core.schema.sessions).where(eq(core.schema.sessions.id, input.sessionId));
      });
    },

    async revokeSession(sessionId) {
      const service = await import("../../../../core/services/auth/sessionService");
      if ((await service.revokeSession(sessionId)) === null) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 session revoke found no row");
      }
    },

    async deleteRevokedSession(sessionId) {
      const core = await task105L05CleanupCore();
      const { and, eq, isNotNull } = await import("drizzle-orm");
      await core.db.transaction(async (tx) => {
        const rows = await tx
          .select({ id: core.schema.sessions.id })
          .from(core.schema.sessions)
          .where(
            and(eq(core.schema.sessions.id, sessionId), isNotNull(core.schema.sessions.revokedAt))
          )
          .for("update")
          .limit(1);
        if (rows.length === 0) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-105 L05 revoked session row is absent"
          );
        }
        await tx.delete(core.schema.sessions).where(eq(core.schema.sessions.id, sessionId));
      });
    },

    async deleteOwnedContent() {
      const owner = ownershipForCleanup(cell);
      if (owner === null) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 content cleanup lacks fixture ownership"
        );
      }
      const pageId = cell.fixturePageId ?? cell.partialOwnership?.fixturePageId ?? null;
      const menuId = cell.uiMenuId;
      const [pages, menus] = await Promise.all([
        import("../../../../core/services/pages/pageService"),
        import("../../../../core/services/menus/menuService"),
      ]);

      // The UI-created menu must be removed first: page lifecycle deletion
      // deliberately refuses to delete a page with a live menu-item reference.
      if (menuId !== null) {
        const snapshot = await menus.captureMenuAggregateNativeSnapshot(menuId);
        if (snapshot !== null) {
          const expectedMenuName = `TASK-105 L05 navigation ${owner.session}`;
          const hasOnlyFixturePage =
            snapshot.desired.items.length === 1 && snapshot.desired.items[0]?.pageId === pageId;
          if (
            snapshot.desired.name !== expectedMenuName ||
            snapshot.desired.status !== "published" ||
            !hasOnlyFixturePage
          ) {
            throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 UI menu ownership drifted");
          }
          await menus.mutateMenuAggregateAtomic({
            operation: "delete",
            id: menuId,
            expectedCurrent: snapshot,
            actorId: owner.userId,
          });
        }
      }

      if (pageId !== null) {
        const snapshot = await pages.capturePageLifecycleNativeSnapshot(pageId);
        if (snapshot !== null) {
          const expectedSlug = `task-105-l05-${owner.session}-home`;
          const expectedTitle = `TASK-105 L05 homepage ${owner.session}`;
          if (
            snapshot.id !== pageId ||
            snapshot.desired.title !== expectedTitle ||
            snapshot.desired.slug !== expectedSlug ||
            snapshot.desired.status !== "published" ||
            snapshot.desired.authorId !== owner.userId
          ) {
            throw new SmokeError(
              "smoke_cleanup_failed",
              "TASK-105 L05 fixture page ownership drifted"
            );
          }
          await pages.mutatePageLifecycleAtomic({
            operation: "delete",
            id: pageId,
            expectedCurrent: snapshot,
            actorId: owner.userId,
          });
        }
      }
    },

    async deleteUserWithLink(input) {
      const core = await task105L05CleanupCore();
      const { and, asc, eq, sql } = await import("drizzle-orm");
      const { hashEmail } = await import("../../../../core/services/security/piiEmail");
      const emailHash = hashEmail(task105L05UserEmail(input.session));
      await core.db.transaction(async (tx) => {
        await core.acquireNativeCmsWriterFence(tx);
        const roleRows = await tx
          .select({
            id: core.schema.roles.id,
            name: core.schema.roles.name,
            description: core.schema.roles.description,
            permissions: core.schema.roles.permissions,
            xmin: sql<string>`xmin::text`.as("xmin"),
          })
          .from(core.schema.roles)
          .where(eq(core.schema.roles.id, input.roleId))
          .for("update");
        const role = roleRows[0];
        if (role === undefined) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 owned role is absent");
        }
        assertExpectedRole(role, {
          roleId: input.roleId,
          roleDescription: input.description,
          roleXmin: input.roleXmin,
          permissions: input.permissions,
          session: input.session,
        });

        const userRows = await tx
          .select({
            id: core.schema.users.id,
            emailHash: core.schema.users.emailHash,
            status: core.schema.users.status,
            xmin: sql<string>`xmin::text`.as("xmin"),
          })
          .from(core.schema.users)
          .where(
            and(
              eq(core.schema.users.id, input.userId),
              eq(core.schema.users.emailHash, emailHash),
              eq(core.schema.users.status, "active")
            )
          )
          .for("update");
        const user = userRows[0];
        if (user === undefined || user.emailHash !== emailHash || user.status !== "active") {
          throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 owned user identity drifted");
        }

        const links = await tx
          .select({ userId: core.schema.userRoles.userId, roleId: core.schema.userRoles.roleId })
          .from(core.schema.userRoles)
          .where(eq(core.schema.userRoles.userId, input.userId))
          .orderBy(asc(core.schema.userRoles.roleId))
          .for("update");
        if (
          links.length !== 1 ||
          links[0]?.userId !== input.userId ||
          links[0]?.roleId !== input.roleId
        ) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 user-role ownership drifted");
        }
        const deleted = await tx
          .delete(core.schema.users)
          .where(
            and(
              eq(core.schema.users.id, input.userId),
              eq(core.schema.users.emailHash, emailHash),
              eq(core.schema.users.status, "active"),
              sql`xmin = ${user.xmin}::xid`
            )
          )
          .returning({ id: core.schema.users.id });
        if (deleted.length !== 1) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 owned user CAS delete failed");
        }
      });
    },

    async deleteRoleIfOwned(input) {
      const core = await task105L05CleanupCore();
      const { and, asc, eq, sql } = await import("drizzle-orm");
      await core.db.transaction(async (tx) => {
        await core.acquireNativeCmsWriterFence(tx);
        const roleRows = await tx
          .select({
            id: core.schema.roles.id,
            name: core.schema.roles.name,
            description: core.schema.roles.description,
            permissions: core.schema.roles.permissions,
            xmin: sql<string>`xmin::text`.as("xmin"),
          })
          .from(core.schema.roles)
          .where(eq(core.schema.roles.id, input.roleId))
          .for("update");
        const role = roleRows[0];
        if (role === undefined) return;
        assertExpectedRole(role, {
          roleId: input.roleId,
          roleDescription: input.description,
          roleXmin: input.xmin,
          permissions: input.permissions,
          session: input.session,
        });
        const links = await tx
          .select({ userId: core.schema.userRoles.userId, roleId: core.schema.userRoles.roleId })
          .from(core.schema.userRoles)
          .where(eq(core.schema.userRoles.roleId, input.roleId))
          .orderBy(asc(core.schema.userRoles.userId))
          .for("update");
        if (links.length !== 0) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-105 L05 role still has user-role links"
          );
        }
        const deleted = await tx
          .delete(core.schema.roles)
          .where(and(eq(core.schema.roles.id, input.roleId), sql`xmin = ${input.xmin}::xid`))
          .returning({ id: core.schema.roles.id });
        if (deleted.length !== 1) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 owned role CAS delete failed");
        }
      });
    },

    async deleteStorageState(path) {
      try {
        await lstat(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      await (await import("node:fs/promises")).rm(path, { force: false });
    },

    async invalidateSiteShellCaches() {
      const settings = await import("../../../../core/services/settings/settingsService");
      settings.invalidateSiteShellCachesForKeys(
        TASK105_L05_LEASED_SETTING_KEYS as unknown as Parameters<
          typeof settings.invalidateSiteShellCachesForKeys
        >[0]
      );
    },

    async proveAbsent(names) {
      const core = await task105L05CleanupCore();
      const { and, eq } = await import("drizzle-orm");
      const partial = cell.partialOwnership;
      const owner = ownershipForCleanup(cell);
      const session = owner?.session ?? partial?.session;
      const userId = owner?.userId ?? partial?.userId;
      const roleId = owner?.roleId ?? partial?.role?.roleId;
      const sessionId = owner?.sessionId ?? partial?.sessionId;
      const fixturePageId = cell.fixturePageId ?? partial?.fixturePageId;
      const storageStatePath = cell.storageStatePath ?? partial?.storageStatePath;
      const roleName = session === undefined ? null : task105L05RoleName(session);
      const emailHash =
        session === undefined
          ? null
          : (await import("../../../../core/services/security/piiEmail")).hashEmail(
              task105L05UserEmail(session)
            );
      for (const name of names) {
        switch (name) {
          case "user-role-link": {
            if (userId == null && roleId == null) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 user-role absence identity is unavailable"
              );
            }
            let linkCount: number;
            if (userId != null && roleId != null) {
              linkCount = (
                await core.db
                  .select({ userId: core.schema.userRoles.userId })
                  .from(core.schema.userRoles)
                  .where(
                    and(
                      eq(core.schema.userRoles.userId, userId),
                      eq(core.schema.userRoles.roleId, roleId)
                    )
                  )
              ).length;
            } else if (userId != null) {
              linkCount = (
                await core.db
                  .select({ userId: core.schema.userRoles.userId })
                  .from(core.schema.userRoles)
                  .where(eq(core.schema.userRoles.userId, userId))
              ).length;
            } else if (roleId != null) {
              linkCount = (
                await core.db
                  .select({ roleId: core.schema.userRoles.roleId })
                  .from(core.schema.userRoles)
                  .where(eq(core.schema.userRoles.roleId, roleId))
              ).length;
            } else {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 user-role absence identity is unavailable"
              );
            }
            if (linkCount > 0) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 synthetic user-role link survived cleanup"
              );
            }
            break;
          }
          case "user":
            if (emailHash === null) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 user absence identity is unavailable"
              );
            }
            await expectRowCount(
              core.db
                .select({ id: core.schema.users.id })
                .from(core.schema.users)
                .where(eq(core.schema.users.emailHash, emailHash))
                .limit(1),
              name
            );
            break;
          case "role":
            if (roleName === null) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 role absence identity is unavailable"
              );
            }
            await expectRowCount(
              core.db
                .select({ id: core.schema.roles.id })
                .from(core.schema.roles)
                .where(eq(core.schema.roles.name, roleName))
                .limit(1),
              name
            );
            break;
          case "session":
            if (sessionId === null || sessionId === undefined) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 session absence identity is unavailable"
              );
            }
            await expectRowCount(
              core.db
                .select({ id: core.schema.sessions.id })
                .from(core.schema.sessions)
                .where(eq(core.schema.sessions.id, sessionId))
                .limit(1),
              name
            );
            break;
          case "menu":
            if (cell.uiMenuId === null) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 menu absence identity is unavailable"
              );
            }
            await expectRowCount(
              core.db
                .select({ id: core.schema.menus.id })
                .from(core.schema.menus)
                .where(eq(core.schema.menus.id, cell.uiMenuId))
                .limit(1),
              name
            );
            break;
          case "page":
            if (fixturePageId === null || fixturePageId === undefined) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 page absence identity is unavailable"
              );
            }
            await expectRowCount(
              core.db
                .select({ id: core.schema.pages.id })
                .from(core.schema.pages)
                .where(eq(core.schema.pages.id, fixturePageId))
                .limit(1),
              name
            );
            break;
          case "dashboard-layout":
            if (userId === null || userId === undefined) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 dashboard absence identity is unavailable"
              );
            }
            await expectRowCount(
              core.db
                .select({ userId: core.schema.dashboardLayouts.userId })
                .from(core.schema.dashboardLayouts)
                .where(eq(core.schema.dashboardLayouts.userId, userId))
                .limit(1),
              name
            );
            break;
          case "private-storage-state":
            if (storageStatePath === null || storageStatePath === undefined) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                "TASK-105 L05 storage absence identity is unavailable"
              );
            }
            try {
              await lstat(storageStatePath);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
              throw error;
            }
            throw new SmokeError(
              "smoke_cleanup_failed",
              "TASK-105 L05 private storage state survived cleanup"
            );
          default:
            throw new SmokeError("smoke_output_invalid", "TASK-105 L05 absence kind is invalid");
        }
      }
    },

    ...overrides,
  };
}
