import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { db } from "../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../db/schema";
import {
  assertNativeCmsWriterOwnerContextAbsent,
  createNativeCmsWriterOwnerLease,
  markNativeCmsWriterOwnerLost,
  resolveFenceNamespace,
  revokeNativeCmsWriterOwnerLease,
  runWithNativeCmsWriterOwnerContext,
  NATIVE_CMS_WRITER_FENCE_KEY,
  NATIVE_CMS_WRITER_FENCE_OPTION_KEY,
  type NativeCmsWriterOwnerLease,
} from "../../db/nativeCmsWriterFence";
import {
  readStrictInitializationPlanV1,
  type FullSiteInstallLockContext,
  type FullSiteInstallLockReservation,
} from "./fullSiteInstallTypes";
import { createDiagnosticCollector, readPackageKey } from "./fullSitePackage/schema";
import { PACKAGE_LIMITS, type JsonObject, type JsonValue } from "./fullSitePackage/types";

export const FULL_SITE_PACKAGE_LOCK_NAMESPACE = 547 as const;

const requireCanonicalPackageKey = (value: string): string => {
  const diagnostics = createDiagnosticCollector();
  const packageKey = readPackageKey(value, "$.key", diagnostics);
  const batch = diagnostics.read();
  if (batch.overflowed || batch.diagnostics.length > 0) {
    throw new Error("site_package_invalid");
  }
  if (packageKey !== value) throw new Error("site_package_invalid");
  return packageKey;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reservationAuthorities = new WeakSet<object>();

const canonicalJson = (value: JsonValue): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const cloneReservationJson = (value: unknown, seen = new Set<object>()): JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (!value || typeof value !== "object" || seen.has(value))
    throw new Error("site_package_invalid");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const output = value.map((item, index) => {
        if (!Object.prototype.hasOwnProperty.call(value, index))
          throw new Error("site_package_invalid");
        return cloneReservationJson(item, seen);
      });
      return output;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) {
      throw new Error("site_package_invalid");
    }
    const output: JsonObject = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (
        !("value" in descriptor) ||
        descriptor.enumerable !== true ||
        key === NATIVE_CMS_WRITER_FENCE_OPTION_KEY
      )
        throw new Error("site_package_invalid");
      output[key] = cloneReservationJson(descriptor.value, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
};

const readLockReservation = (
  value: FullSiteInstallLockReservation
): FullSiteInstallLockReservation => {
  try {
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    const expected =
      value.intent === "apply"
        ? ["intent", "packageKey", "actorId", "dryRun", "options"]
        : ["intent", "packageKey", "actorId", "sourceRunId", "options"];
    if (
      Object.keys(value).length !== expected.length ||
      Object.keys(value).some((key) => !expected.includes(key))
    )
      throw new Error();
    const packageKey = requireCanonicalPackageKey(value.packageKey);
    if (!UUID_PATTERN.test(value.actorId)) throw new Error();
    const options = cloneReservationJson(value.options);
    if (!options || Array.isArray(options) || typeof options !== "object") throw new Error();
    if (value.intent === "apply") {
      if (typeof value.dryRun !== "boolean") throw new Error();
      return Object.freeze({ ...value, packageKey, options });
    }
    if (value.intent !== "explicit_rollback" || !UUID_PATTERN.test(value.sourceRunId))
      throw new Error();
    return Object.freeze({ ...value, packageKey, options });
  } catch {
    throw new Error("site_package_invalid");
  }
};

const mintReservationAuthority = (): object => {
  const authority = Object.freeze({});
  reservationAuthorities.add(authority);
  return authority;
};

const publicRequestOptions = (value: unknown): JsonObject => {
  const options =
    value && !Array.isArray(value) && typeof value === "object"
      ? { ...(value as Record<string, JsonValue>) }
      : {};
  delete options[NATIVE_CMS_WRITER_FENCE_OPTION_KEY];
  delete options.initializationPlanV1;
  return options;
};

const OWNER_RESERVATION_SELECTION = {
  id: solutionKitInstallRuns.id,
  kitId: solutionKitInstallRuns.kitId,
  mode: solutionKitInstallRuns.mode,
  status: solutionKitInstallRuns.status,
  actorId: solutionKitInstallRuns.actorId,
  rollbackOfRunId: solutionKitInstallRuns.rollbackOfRunId,
  options: solutionKitInstallRuns.options,
} as const;

type ReservedOwnerRow = Pick<
  typeof solutionKitInstallRuns.$inferSelect,
  "id" | "kitId" | "mode" | "status" | "actorId" | "rollbackOfRunId" | "options"
>;

const deriveResumePhase = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  owner: ReservedOwnerRow
): Promise<"reserved" | "initialized"> => {
  const items = await tx
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, owner.id))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id))
    .limit(PACKAGE_LIMITS.resourcesTotal + 1);
  if (items.length > PACKAGE_LIMITS.resourcesTotal)
    throw new Error("native_cms_writer_recovery_required");
  const rawPlan = (owner.options as Record<string, unknown>).initializationPlanV1;
  if (rawPlan === undefined && items.length === 0) return "reserved";
  let plan;
  try {
    plan = readStrictInitializationPlanV1(rawPlan);
  } catch {
    throw new Error("native_cms_writer_recovery_required");
  }
  if (
    plan.length !== items.length ||
    items.some((item, index) => {
      const expected = plan[index];
      return (
        item.position !== expected.position ||
        item.resourceType !== expected.kind ||
        item.resourceKey !== expected.key ||
        item.operation !== expected.operation
      );
    })
  )
    throw new Error("native_cms_writer_recovery_required");
  return "initialized";
};

const reserveOrTakeOverActualOwner = async (
  input: FullSiteInstallLockReservation,
  authority: object
): Promise<
  Readonly<{
    lease: NativeCmsWriterOwnerLease;
    context: FullSiteInstallLockContext;
  }>
> => {
  if (!reservationAuthorities.delete(authority)) throw new Error("native_cms_writer_fence_failed");
  return db.transaction(
    async (tx) => {
      const candidates = await tx
        .select(OWNER_RESERVATION_SELECTION)
        .from(solutionKitInstallRuns)
        .where(sql`${solutionKitInstallRuns.options} ? ${NATIVE_CMS_WRITER_FENCE_OPTION_KEY}`)
        .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id))
        .limit(2)
        .for("update");
      if (candidates.length > 1) throw new Error("native_cms_writer_recovery_required");
      const generation = randomUUID();
      let owner: ReservedOwnerRow | undefined = candidates[0];
      let interruptedApplySource: ReservedOwnerRow | undefined;
      if (owner) {
        if (
          input.intent === "explicit_rollback" &&
          owner.id === input.sourceRunId &&
          owner.kitId === input.packageKey &&
          owner.mode === "apply" &&
          owner.status === "running" &&
          owner.rollbackOfRunId === null &&
          typeof owner.actorId === "string" &&
          UUID_PATTERN.test(owner.actorId)
        ) {
          interruptedApplySource = owner;
          owner = undefined;
        } else {
          const expectedMode =
            input.intent === "apply" ? (input.dryRun ? "dry_run" : "apply") : "rollback";
          if (
            owner.kitId !== input.packageKey ||
            owner.mode !== expectedMode ||
            owner.status !== "running" ||
            owner.actorId !== input.actorId ||
            (input.intent === "explicit_rollback" && owner.rollbackOfRunId !== input.sourceRunId) ||
            canonicalJson(publicRequestOptions(owner.options)) !== canonicalJson(input.options)
          ) {
            throw new Error("site_package_recovery_conflict");
          }
          const resumePhase = input.intent === "apply" ? await deriveResumePhase(tx, owner) : null;
          const [updated] = await tx
            .update(solutionKitInstallRuns)
            .set({
              options: {
                ...(owner.options as JsonObject),
                [NATIVE_CMS_WRITER_FENCE_OPTION_KEY]: { schemaVersion: 1, generation },
              },
              updatedAt: new Date(),
            })
            .where(eq(solutionKitInstallRuns.id, owner.id))
            .returning(OWNER_RESERVATION_SELECTION);
          if (!updated) throw new Error("native_cms_writer_fence_failed");
          owner = updated;
          const lease = createNativeCmsWriterOwnerLease(owner.id, generation);
          return Object.freeze({
            lease,
            context:
              input.intent === "apply"
                ? Object.freeze({
                    intent: "apply" as const,
                    ownerRunId: owner.id,
                    resumePhase: resumePhase!,
                  })
                : Object.freeze({ intent: "explicit_rollback" as const, ownerRunId: owner.id }),
          });
        }
      }

      if (input.intent === "explicit_rollback") {
        const [source] = await tx
          .select(OWNER_RESERVATION_SELECTION)
          .from(solutionKitInstallRuns)
          .where(eq(solutionKitInstallRuns.id, input.sourceRunId))
          .limit(1)
          .for("update");
        if (
          !source ||
          source.kitId !== input.packageKey ||
          source.mode !== "apply" ||
          !["running", "success", "failed"].includes(source.status)
        ) {
          throw new Error("site_package_rollback_invalid_source");
        }
        const existing = await tx
          .select(OWNER_RESERVATION_SELECTION)
          .from(solutionKitInstallRuns)
          .where(
            and(
              eq(solutionKitInstallRuns.rollbackOfRunId, source.id),
              eq(solutionKitInstallRuns.mode, "rollback")
            )
          )
          .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id));
        if (existing.some((run) => run.status === "success")) {
          throw new Error("site_package_already_rolled_back");
        }
        owner = existing.find((run) => run.status === "running" || run.status === "failed");
        if (
          owner &&
          (owner.actorId !== input.actorId ||
            canonicalJson(publicRequestOptions(owner.options)) !== canonicalJson(input.options))
        ) {
          throw new Error("site_package_recovery_conflict");
        }
        if (interruptedApplySource) {
          if (source.id !== interruptedApplySource.id) {
            throw new Error("native_cms_writer_recovery_required");
          }
          const sourceOptions = { ...(source.options as JsonObject) };
          delete sourceOptions[NATIVE_CMS_WRITER_FENCE_OPTION_KEY];
          const [unmarked] = await tx
            .update(solutionKitInstallRuns)
            .set({
              options: sourceOptions,
              updatedAt: new Date(),
            })
            .where(eq(solutionKitInstallRuns.id, source.id))
            .returning({ id: solutionKitInstallRuns.id });
          if (!unmarked) throw new Error("native_cms_writer_fence_failed");
        }
      }
      const ownerId = owner?.id ?? randomUUID();
      const options = {
        ...(owner ? (owner.options as JsonObject) : input.options),
        [NATIVE_CMS_WRITER_FENCE_OPTION_KEY]: { schemaVersion: 1, generation },
      };
      if (owner) {
        const [updated] = await tx
          .update(solutionKitInstallRuns)
          .set({
            status: "running",
            error: null,
            finishedAt: null,
            options,
            updatedAt: new Date(),
          })
          .where(eq(solutionKitInstallRuns.id, owner.id))
          .returning(OWNER_RESERVATION_SELECTION);
        if (!updated) throw new Error("native_cms_writer_fence_failed");
        owner = updated;
      } else {
        const [created] = await tx
          .insert(solutionKitInstallRuns)
          .values({
            id: ownerId,
            kitId: input.packageKey,
            mode: input.intent === "apply" ? (input.dryRun ? "dry_run" : "apply") : "rollback",
            status: "running",
            actorId: input.actorId,
            rollbackOfRunId: input.intent === "explicit_rollback" ? input.sourceRunId : null,
            options,
            summary: {},
            error: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            finishedAt: null,
          })
          .returning(OWNER_RESERVATION_SELECTION);
        if (!created) throw new Error("native_cms_writer_fence_failed");
        owner = created;
      }
      const lease = createNativeCmsWriterOwnerLease(owner.id, generation);
      return Object.freeze({
        lease,
        context:
          input.intent === "apply"
            ? Object.freeze({
                intent: "apply" as const,
                ownerRunId: owner.id,
                resumePhase: "reserved" as const,
              })
            : Object.freeze({ intent: "explicit_rollback" as const, ownerRunId: owner.id }),
      });
    },
    { isolationLevel: "read committed" }
  );
};

export const withFullSiteInstallLocks = async <T>(
  reservation: FullSiteInstallLockReservation,
  execute: (context: FullSiteInstallLockContext) => Promise<T>
): Promise<T> => {
  assertNativeCmsWriterOwnerContextAbsent();
  const input = readLockReservation(reservation);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  let lease: NativeCmsWriterOwnerLease | null = null;
  let callbackPromise: Promise<T> | null = null;
  let signalClosed: (() => void) | null = null;
  const closed = new Promise<never>((_resolve, reject) => {
    signalClosed = () => reject(new Error("native_cms_writer_fence_lost"));
  });
  const lockClient = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    onclose: () => {
      if (lease) markNativeCmsWriterOwnerLost(lease);
      signalClosed?.();
    },
  });
  let primary: Error | null = null;
  let result: Readonly<{ value: T }> | null = null;
  try {
    const holder = lockClient.begin(async (lockTransaction) => {
      const namespace = resolveFenceNamespace();
      await lockTransaction`select pg_advisory_xact_lock(${namespace}, ${NATIVE_CMS_WRITER_FENCE_KEY})`;
      await lockTransaction`select pg_advisory_xact_lock(${FULL_SITE_PACKAGE_LOCK_NAMESPACE}, hashtext(${input.packageKey}))`;
      const authority = mintReservationAuthority();
      const reserved = await reserveOrTakeOverActualOwner(input, authority);
      lease = reserved.lease;
      callbackPromise = runWithNativeCmsWriterOwnerContext(lease, () => execute(reserved.context));
      const value = await callbackPromise;
      revokeNativeCmsWriterOwnerLease(lease);
      return { value };
    });
    result = await Promise.race([holder, closed]);
  } catch (error) {
    primary =
      error instanceof Error
        ? new Error(error.message)
        : new Error("native_cms_writer_fence_failed");
  }
  if (callbackPromise) {
    try {
      await callbackPromise;
    } catch (error) {
      if (!primary) {
        primary =
          error instanceof Error
            ? new Error(error.message)
            : new Error("native_cms_writer_fence_failed");
      }
    }
  }
  try {
    await lockClient.end();
  } catch {
    if (!primary) primary = new Error("native_cms_writer_fence_failed");
  }
  if (primary) throw primary;
  if (!result) throw new Error("native_cms_writer_fence_failed");
  return result.value;
};
