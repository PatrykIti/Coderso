import { SmokeError } from "../../contracts";
import type { LifecycleResource } from "../../lifecycle";
import { task105L05RoleName, task105L05UserEmail } from "./fixture";
import { createTask105L05LiveCleanupDeps } from "./cleanup-deps";

/**
 * TASK-105 L05 aggregate fixture cleanup (contract: TASK-105-08-05-L04).
 *
 * Cleanup is deliberately fail-closed. A session identity proof gates every
 * destructive operation that could cascade through the user, and role removal
 * also verifies that no user-role link remains under the same row lock.
 */

export const TASK105_L05_SYNTHETIC_KINDS = Object.freeze([
  "user-role-link",
  "user",
  "role",
  "menu",
  "page",
  "dashboard-layout",
  "private-storage-state",
  "session",
] as const);

export interface Task105L05CleanupDeps {
  readonly restoreLease: () => Promise<void>;
  readonly proveSessionIdentity: (input: {
    sessionId: string;
    userId: string;
    tokenHash: string;
  }) => Promise<void>;
  readonly cleanupSession?: (input: {
    sessionId: string;
    userId: string;
    tokenHash: string;
  }) => Promise<void>;
  readonly revokeSession: (sessionId: string) => Promise<void>;
  readonly deleteRevokedSession: (sessionId: string) => Promise<void>;
  readonly proveAbsent: (names: readonly string[]) => Promise<void>;
  readonly deleteStorageState?: (path: string) => Promise<void>;
  readonly deleteUserWithLink: (input: {
    readonly userId: string;
    readonly roleId: string;
    readonly session: string;
    readonly description: string;
    readonly permissions: readonly string[];
    readonly roleXmin: string;
  }) => Promise<void>;
  readonly deleteOwnedContent?: () => Promise<void>;
  readonly deleteRoleIfOwned: (input: {
    roleId: string;
    session: string;
    description: string;
    permissions: readonly string[];
    xmin: string;
  }) => Promise<void>;
  readonly invalidateSiteShellCaches: () => Promise<void>;
}

export interface Task105L05FinalizationFailure {
  readonly step: string;
  readonly code: "smoke_cleanup_failed";
}

export interface Task105L05FinalizationResult {
  readonly pass: boolean;
  readonly failures: readonly Task105L05FinalizationFailure[];
}

/** Private worker-backed recovery cleanup; its callbacks expose no receipt data. */
export interface Task105L05ReceiptRecoveryCleanup {
  readonly recover: () => Promise<void>;
  readonly proveAbsent: () => Promise<void>;
  readonly invalidateSiteShellCaches: () => Promise<void>;
}

interface CleanupOwnership {
  readonly session: string;
  readonly sessionId: string;
  readonly roleId: string;
  readonly roleDescription: string;
  readonly roleXmin: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly permissions: readonly string[];
  readonly syntheticNames: readonly string[];
}

export interface Task105L05PartialCleanupOwnership {
  readonly session: string;
  readonly role: Readonly<{
    readonly roleId: string;
    readonly roleDescription: string;
    readonly roleXmin: string;
    readonly permissions: readonly string[];
  }> | null;
  readonly userId: string | null;
  readonly sessionId: string | null;
  readonly tokenHash: string | null;
  readonly fixturePageId: string | null;
  readonly storageStatePath: string | null;
}

export interface Task105L05CleanupOwnershipCell {
  ownership: CleanupOwnership | null;
  partialOwnership: Task105L05PartialCleanupOwnership | null;
  fixturePageId: string | null;
  uiMenuId: string | null;
  storageStatePath: string | null;
  leaseApplied: boolean;
}

export function createTask105L05PartialCleanupOwnership(
  session: string
): Task105L05PartialCleanupOwnership {
  return Object.freeze({
    session,
    role: null,
    userId: null,
    sessionId: null,
    tokenHash: null,
    fixturePageId: null,
    storageStatePath: null,
  });
}

export function createTask105L05CleanupOwnershipCell(): Task105L05CleanupOwnershipCell {
  return {
    ownership: null,
    partialOwnership: null,
    fixturePageId: null,
    uiMenuId: null,
    storageStatePath: null,
    leaseApplied: false,
  };
}

export function bindTask105L05PartialOwnership(
  cell: Task105L05CleanupOwnershipCell,
  partial: Task105L05PartialCleanupOwnership
): void {
  if (cell.partialOwnership !== null || cell.ownership !== null) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 cleanup ownership was rebound");
  }
  cell.partialOwnership = partial;
}

export function updateTask105L05PartialOwnership(
  cell: Task105L05CleanupOwnershipCell,
  next: Partial<Task105L05PartialCleanupOwnership>
): void {
  const current = cell.partialOwnership;
  if (current === null || cell.ownership !== null) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 partial ownership was never bound");
  }
  cell.partialOwnership = Object.freeze({
    session: current.session,
    role: next.role === undefined ? current.role : next.role,
    userId: next.userId === undefined ? current.userId : next.userId,
    sessionId: next.sessionId === undefined ? current.sessionId : next.sessionId,
    tokenHash: next.tokenHash === undefined ? current.tokenHash : next.tokenHash,
    fixturePageId: next.fixturePageId === undefined ? current.fixturePageId : next.fixturePageId,
    storageStatePath:
      next.storageStatePath === undefined ? current.storageStatePath : next.storageStatePath,
  });
}

function fullOwnershipFromPartial(
  partial: Task105L05PartialCleanupOwnership
): CleanupOwnership | null {
  if (
    partial.role === null ||
    partial.userId === null ||
    partial.sessionId === null ||
    partial.tokenHash === null
  )
    return null;
  return Object.freeze({
    session: partial.session,
    sessionId: partial.sessionId,
    roleId: partial.role.roleId,
    roleDescription: partial.role.roleDescription,
    roleXmin: partial.role.roleXmin,
    userId: partial.userId,
    tokenHash: partial.tokenHash,
    permissions: Object.freeze([...partial.role.permissions]),
    syntheticNames: Object.freeze([
      task105L05RoleName(partial.session),
      task105L05UserEmail(partial.session),
    ]),
  });
}

function hasPartialResources(cell: Task105L05CleanupOwnershipCell): boolean {
  const partial = cell.partialOwnership;
  return (
    partial !== null &&
    (partial.role !== null ||
      partial.userId !== null ||
      partial.sessionId !== null ||
      partial.fixturePageId !== null ||
      partial.storageStatePath !== null ||
      cell.uiMenuId !== null ||
      cell.leaseApplied)
  );
}

function isCompleteOwnership(cell: Task105L05CleanupOwnershipCell): boolean {
  return cell.ownership !== null;
}

function ownerForCleanup(cell: Task105L05CleanupOwnershipCell): CleanupOwnership | null {
  return (
    cell.ownership ??
    (cell.partialOwnership === null ? null : fullOwnershipFromPartial(cell.partialOwnership))
  );
}

export function requireOwnership(cell: Task105L05CleanupOwnershipCell): CleanupOwnership {
  const owner = ownerForCleanup(cell);
  if (owner === null) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 cleanup ownership is incomplete");
  }
  return owner;
}

function failureResult(
  failures: readonly Task105L05FinalizationFailure[]
): Task105L05FinalizationResult {
  return Object.freeze({ pass: failures.length === 0, failures: Object.freeze([...failures]) });
}

function recordFailure(failures: Task105L05FinalizationFailure[], step: string): void {
  failures.push({ step, code: "smoke_cleanup_failed" });
}

async function attempt(
  failures: Task105L05FinalizationFailure[],
  step: string,
  action: () => Promise<void>
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch {
    recordFailure(failures, step);
    return false;
  }
}

async function proveKinds(
  deps: Task105L05CleanupDeps,
  failures: Task105L05FinalizationFailure[]
): Promise<boolean> {
  return attempt(failures, "terminal-absence-proof", () =>
    deps.proveAbsent(TASK105_L05_SYNTHETIC_KINDS)
  );
}

/**
 * Runs the complete cleanup for an installed fixture. The user and role are
 * never deleted when exact session identity or session absence is unproven.
 */
export async function runTask105L05AggregateCleanup(input: {
  readonly deps: Task105L05CleanupDeps;
  readonly ownership: CleanupOwnership;
}): Promise<Task105L05FinalizationResult> {
  const { deps, ownership } = input;
  const failures: Task105L05FinalizationFailure[] = [];

  await attempt(failures, "settings-lease-restore", async () => {
    await deps.restoreLease();
    await deps.invalidateSiteShellCaches();
  });

  let sessionSafe = false;
  if (deps.cleanupSession !== undefined) {
    if (
      await attempt(failures, "session-cleanup", () =>
        deps.cleanupSession!({
          sessionId: ownership.sessionId,
          userId: ownership.userId,
          tokenHash: ownership.tokenHash,
        })
      )
    ) {
      sessionSafe = await attempt(failures, "session-absence-proof", () =>
        deps.proveAbsent(["session"])
      );
    }
  } else if (
    await attempt(failures, "session-identity-proof", () =>
      deps.proveSessionIdentity({
        sessionId: ownership.sessionId,
        userId: ownership.userId,
        tokenHash: ownership.tokenHash,
      })
    )
  ) {
    // Legacy seams are retained only with a successful exact proof. No ID-only
    // revoke or delete is attempted after a failed proof.
    const revoked = await attempt(failures, "session-revoke", () =>
      deps.revokeSession(ownership.sessionId)
    );
    const deleted =
      revoked &&
      (await attempt(failures, "session-delete", () =>
        deps.deleteRevokedSession(ownership.sessionId)
      ));
    sessionSafe =
      Boolean(deleted) &&
      (await attempt(failures, "session-absence-proof", () => deps.proveAbsent(["session"])));
  }

  let userSafe = false;
  if (sessionSafe) {
    userSafe = await attempt(failures, "owned-content-delete", async () => {
      await deps.deleteOwnedContent?.();
      await deps.deleteUserWithLink({
        userId: ownership.userId,
        roleId: ownership.roleId,
        session: ownership.session,
        description: ownership.roleDescription,
        permissions: ownership.permissions,
        roleXmin: ownership.roleXmin,
      });
    });
  }
  if (userSafe) {
    await attempt(failures, "role-cas-delete", () =>
      deps.deleteRoleIfOwned({
        roleId: ownership.roleId,
        session: ownership.session,
        description: ownership.roleDescription,
        permissions: ownership.permissions,
        xmin: ownership.roleXmin,
      })
    );
  }
  await proveKinds(deps, failures);
  return failureResult(failures);
}

async function runTask105L05PartialCleanup(input: {
  readonly deps: Task105L05CleanupDeps;
  readonly cell: Task105L05CleanupOwnershipCell;
}): Promise<Task105L05FinalizationResult> {
  const partial = input.cell.partialOwnership;
  if (partial === null || !hasPartialResources(input.cell)) return failureResult([]);
  const failures: Task105L05FinalizationFailure[] = [];

  if (input.cell.leaseApplied) {
    await attempt(failures, "settings-lease-restore", async () => {
      await input.deps.restoreLease();
      await input.deps.invalidateSiteShellCaches();
    });
  }
  if (partial.storageStatePath !== null) {
    await attempt(failures, "private-storage-state-delete", async () => {
      if (input.deps.deleteStorageState !== undefined)
        await input.deps.deleteStorageState(partial.storageStatePath!);
    });
  }

  let sessionSafe = partial.sessionId === null && partial.tokenHash === null;
  if (partial.sessionId !== null || partial.tokenHash !== null) {
    if (partial.userId === null || partial.tokenHash === null || partial.sessionId === null) {
      recordFailure(failures, "session-identity-incomplete");
    } else if (
      input.deps.cleanupSession !== undefined &&
      (await attempt(failures, "session-cleanup", () =>
        input.deps.cleanupSession!({
          sessionId: partial.sessionId!,
          userId: partial.userId!,
          tokenHash: partial.tokenHash!,
        })
      ))
    ) {
      sessionSafe = await attempt(failures, "session-absence-proof", () =>
        input.deps.proveAbsent(["session"])
      );
    } else if (
      input.deps.cleanupSession === undefined &&
      (await attempt(failures, "session-identity-proof", () =>
        input.deps.proveSessionIdentity({
          sessionId: partial.sessionId!,
          userId: partial.userId!,
          tokenHash: partial.tokenHash!,
        })
      ))
    ) {
      const revoked = await attempt(failures, "session-revoke", () =>
        input.deps.revokeSession(partial.sessionId!)
      );
      const deleted =
        revoked &&
        (await attempt(failures, "session-delete", () =>
          input.deps.deleteRevokedSession(partial.sessionId!)
        ));
      sessionSafe =
        Boolean(deleted) &&
        (await attempt(failures, "session-absence-proof", () =>
          input.deps.proveAbsent(["session"])
        ));
    }
  }

  let userSafe = partial.userId === null;
  if (partial.userId !== null && sessionSafe) {
    userSafe = await attempt(failures, "owned-content-delete", async () => {
      const role = partial.role;
      if (role === null) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 user cleanup lacks role ownership"
        );
      }
      await input.deps.deleteOwnedContent?.();
      await input.deps.deleteUserWithLink({
        userId: partial.userId!,
        roleId: role.roleId,
        session: partial.session,
        description: role.roleDescription,
        permissions: role.permissions,
        roleXmin: role.roleXmin,
      });
    });
  }
  if (partial.role !== null && userSafe) {
    await attempt(failures, "role-cas-delete", () =>
      input.deps.deleteRoleIfOwned!({
        roleId: partial.role!.roleId,
        session: partial.session,
        description: partial.role!.roleDescription,
        permissions: partial.role!.permissions,
        xmin: partial.role!.roleXmin,
      })
    );
  }
  await proveKinds(input.deps, failures);
  return failureResult(failures);
}

/** Lifecycle resource wrapper registered before fixture install starts. */
export class Task105L05FixtureCleanup implements LifecycleResource {
  readonly name = "task-105-l05-fixture-cleanup";
  readonly #deps: Task105L05CleanupDeps;
  readonly #ownership: CleanupOwnership | null;
  readonly #cell: Task105L05CleanupOwnershipCell | null;
  readonly #recovery: Task105L05ReceiptRecoveryCleanup | null;
  #result: Task105L05FinalizationResult | null = null;
  #closePromise: Promise<void> | null = null;

  constructor(input: {
    readonly deps: Task105L05CleanupDeps;
    readonly ownership?: CleanupOwnership;
    readonly cell?: Task105L05CleanupOwnershipCell;
    readonly recovery?: Task105L05ReceiptRecoveryCleanup;
  }) {
    this.#deps = input.deps;
    this.#ownership = input.ownership ?? null;
    this.#cell = input.cell ?? null;
    this.#recovery = input.recovery ?? null;
  }

  close(): Promise<void> {
    this.#closePromise ??= this.#closeOnce();
    return this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    const result =
      this.#recovery !== null
        ? await this.#runReceiptRecovery()
        : this.#cell !== null
          ? isCompleteOwnership(this.#cell)
            ? await runTask105L05AggregateCleanup({
                deps: this.#deps,
                ownership: requireOwnership(this.#cell),
              })
            : await runTask105L05PartialCleanup({ deps: this.#deps, cell: this.#cell })
          : this.#ownership !== null
            ? await runTask105L05AggregateCleanup({ deps: this.#deps, ownership: this.#ownership })
            : failureResult([{ step: "ownership-proof", code: "smoke_cleanup_failed" }]);
    this.#result = result;
    if (!result.pass) {
      throw new SmokeError(
        "smoke_cleanup_failed",
        `TASK-105 L05 aggregate cleanup failed at ${result.failures.map(({ step }) => step).join(",")}`
      );
    }
  }

  async proveAbsent(): Promise<boolean> {
    try {
      if (this.#recovery !== null) {
        await this.#recovery.proveAbsent();
        return true;
      }
      await this.#deps.proveAbsent(TASK105_L05_SYNTHETIC_KINDS);
      return true;
    } catch {
      return false;
    }
  }

  result(): Task105L05FinalizationResult | null {
    return this.#result;
  }

  async #runReceiptRecovery(): Promise<Task105L05FinalizationResult> {
    const failures: Task105L05FinalizationFailure[] = [];
    const recovered = await attempt(failures, "receipt-recovery", () => this.#recovery!.recover());
    if (recovered) {
      await attempt(failures, "site-shell-cache-invalidate", () =>
        this.#recovery!.invalidateSiteShellCaches()
      );
    }
    await attempt(failures, "terminal-absence-proof", () => this.#recovery!.proveAbsent());
    return failureResult(failures);
  }
}

export type Task105L05CleanupOwnership = CleanupOwnership;

/** Concrete live DB/filesystem cleanup dependencies. */
export function createTask105L05CleanupDeps(
  cell: Task105L05CleanupOwnershipCell,
  overrides: Partial<Task105L05CleanupDeps> = {}
): Task105L05CleanupDeps {
  return createTask105L05LiveCleanupDeps(cell, overrides, ownerForCleanup);
}
