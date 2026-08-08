import { eq, inArray } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../../core/db/client";
import {
  contentRevisions,
  detailPageRevisions,
  formActionRuns,
  formSubmissions,
  pageRevisions,
  solutionKitInstallRuns,
  users,
} from "../../../core/db/schema";
import {
  FULL_SITE_RESOURCE_ADAPTERS,
  type FullSiteNativeSnapshot,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import {
  applyFullSitePackage,
  type ApplyFullSitePackageResult,
  type FullSiteInstallExecutorDeps,
} from "../../../core/services/kits/fullSiteInstall/execute";
import { rollbackFullSiteInstall } from "../../../core/services/kits/fullSiteInstall/rollback";
import {
  readFullSiteDurableAfterSnapshotV1,
  readSagaSnapshot,
} from "../../../core/services/kits/fullSiteInstall/staging";
import type {
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type {
  FullSitePackageV1,
  JsonObject,
  JsonValue,
  ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";
import { PACKAGE_RESOURCE_COLLECTIONS } from "../../../core/services/kits/fullSitePackage/types";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import {
  captureFullSiteSettingsBatchRaw,
  restoreFullSiteSettingsBatchRawAtomic,
  type FullSiteRawSettingState,
} from "../../../core/services/settings/fullSiteSettingsAtomicService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";

export const INSTALLED_SITE_SHELL_KEYS = [
  "design.tokens",
  "site.contentRoutes",
  "site.footerTemplateId",
  "site.homepageId",
  "site.locale",
  "site.name",
  "site.navigationMenuId",
] as const;

export const INSTALLED_RESOURCE_KIND_BY_COLLECTION = {
  contentTypes: "content_type",
  forms: "form",
  pageTemplates: "page_template",
  listingTemplates: "listing_template",
  entries: "content_entry",
  listingQueries: "listing_query",
  detailPages: "detail_page",
  pages: "page",
  menus: "menu",
  settings: "setting",
} as const;

export type LedgerWrite = Parameters<FullSiteInstallLedgerPort["recordItem"]>[0];

export const createRecordingInstallLedger = () => {
  const durable = createLegacyInstallLedger();
  const writes: LedgerWrite[] = [];
  const ledger: FullSiteInstallLedgerPort = {
    ...durable,
    async initializeReservedRun(input) {
      const result = await durable.initializeReservedRun(input);
      for (const item of input.items) {
        writes.push({
          runId: input.ownerRunId,
          ...structuredClone(item),
          status: "planned",
          error: null,
        });
      }
      return result;
    },
    async recordItem(input) {
      await durable.recordItem(input);
      writes.push(structuredClone(input));
    },
  };
  return { ledger, writes };
};

export const readInstalledShellState = () =>
  captureFullSiteSettingsBatchRaw(INSTALLED_SITE_SHELL_KEYS);

export const containsPackageRef = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsPackageRef);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.ref === "string" && typeof record.key === "string") return true;
  return Object.values(record).some(containsPackageRef);
};

export const readSagaPhase = (snapshot: unknown): string | null => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const recovery = (snapshot as Record<string, unknown>).recovery;
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery)) return null;
  const phase = (recovery as Record<string, unknown>).phase;
  return typeof phase === "string" ? phase : null;
};

export const lifecyclePhases = (
  writes: readonly LedgerWrite[],
  runId: string,
  identity: string
): string[] => {
  const separator = identity.indexOf(":");
  const kind = identity.slice(0, separator);
  const key = identity.slice(separator + 1);
  return writes
    .filter((write) => write.runId === runId && write.kind === kind && write.key === key)
    .map((write) => readSagaPhase(write.afterSnapshot))
    .filter((phase): phase is string => phase !== null);
};

export const getInstalledResourceId = (
  resources: readonly { identity: string; id: string | null }[],
  identity: string
): string => {
  const id = resources.find((resource) => resource.identity === identity)?.id;
  if (!id) throw new Error(`site_package_acceptance_resource_missing:${identity}`);
  return id;
};

export const getHtmlAttribute = (tag: string, name: string): string | null => {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match?.[1] ?? null;
};

const rewriteRefs = (value: JsonValue, keys: ReadonlyMap<string, string>): JsonValue => {
  if (Array.isArray(value)) return value.map((entry) => rewriteRefs(entry, keys));
  if (!value || typeof value !== "object") return value;
  if (
    Object.keys(value).length === 2 &&
    typeof value.ref === "string" &&
    typeof value.key === "string"
  ) {
    return { ref: value.ref, key: keys.get(`${value.ref}:${value.key}`) ?? value.key };
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, rewriteRefs(entry, keys)])
  );
};

export type ScopedFormaDomPackageOptions = Readonly<{
  canonicalDetailRoutes?: boolean;
}>;

export const buildScopedFormaDomPackage = (
  scope: string,
  options: ScopedFormaDomPackageOptions = {}
): FullSitePackageV1 => {
  const source = buildFormaDomPackage();
  const keyMap = new Map<string, string>();
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    if (collection === "settings") continue;
    for (const seed of source.resources[collection]) {
      keyMap.set(
        `${INSTALLED_RESOURCE_KIND_BY_COLLECTION[collection]}:${seed.key}`,
        `${seed.key}-${scope}`
      );
    }
  }

  const resources = Object.fromEntries(
    PACKAGE_RESOURCE_COLLECTIONS.map((collection) => {
      const kind = INSTALLED_RESOURCE_KIND_BY_COLLECTION[collection];
      const seeds = source.resources[collection].map((seed) => {
        const desired = rewriteRefs(seed.desired, keyMap) as Record<string, JsonValue>;
        const keepCanonicalEntry = options.canonicalDetailRoutes && collection === "entries";
        if (collection !== "settings") {
          if (typeof desired.slug === "string" && !keepCanonicalEntry) {
            desired.slug = desired.slug === "/" ? `/task-547-${scope}` : `${desired.slug}-${scope}`;
          }
          if (typeof desired.name === "string") desired.name = `${desired.name} ${scope}`;
          if (typeof desired.title === "string" && !keepCanonicalEntry) {
            desired.title = `${desired.title} ${scope}`;
          }
        }
        if (collection === "contentTypes") desired.slug = `house-project-${scope}`;
        if (collection === "contentTypes" && !options.canonicalDetailRoutes) {
          const schema = desired.schema as Record<string, JsonValue>;
          const properties = schema.properties as Record<string, JsonValue>;
          const cardHref = properties.cardHref as Record<string, JsonValue>;
          const allowedHrefs = cardHref.enum;
          if (!Array.isArray(allowedHrefs)) {
            throw new Error("site_package_acceptance_card_href_schema_missing");
          }
          cardHref.enum = allowedHrefs.map((href) => {
            if (href === "/projekty/aurora") return `/projekty-${scope}/aurora-${scope}`;
            if (href === "/projekty") return `/projekty-${scope}`;
            return href;
          });
        }
        if (collection === "detailPages") desired.contentTypeSlug = `house-project-${scope}`;
        if (collection === "entries" && !options.canonicalDetailRoutes) {
          const data = desired.data as Record<string, JsonValue>;
          if (data.cardHref === "/projekty/aurora") {
            data.cardHref = `/projekty-${scope}/aurora-${scope}`;
          } else if (data.cardHref === "/projekty") {
            data.cardHref = `/projekty-${scope}`;
          }
        }
        if (collection === "detailPages" && !options.canonicalDetailRoutes) {
          const blocks = desired.blocks as Array<Record<string, JsonValue>>;
          const backLink = blocks.find((block) => block.id === "project-back-link");
          const body = backLink?.data as Record<string, JsonValue> | undefined;
          if (body?.body && typeof body.body === "object" && !Array.isArray(body.body)) {
            const richText = body.body as Record<string, JsonValue>;
            if (typeof richText.html === "string") {
              richText.html = richText.html.replace(
                'href="/projekty"',
                `href="/projekty-${scope}"`
              );
            }
          }
        }
        if (collection === "menus") {
          desired.location = `task-547-${scope}`;
          (desired.items as Array<Record<string, JsonValue>>).forEach((item, index) => {
            item.id = `00000000-0000-4000-8000-${scope}${String(index + 1).padStart(4, "0")}`;
          });
        }
        if (collection === "forms") {
          (desired.fields as Array<Record<string, JsonValue>>).forEach((field, index) => {
            field.id = `00000000-0000-4000-8000-${scope}${String(index + 1).padStart(4, "0")}`;
          });
          (desired.actions as Array<Record<string, JsonValue>>).forEach((action, index) => {
            action.id = `00000000-0000-4000-8000-${scope}${String(index + 101).padStart(4, "0")}`;
          });
        }
        if (collection === "settings" && seed.key === "site.contentRoutes") {
          const routes = (desired.value as Array<Record<string, JsonValue>>) ?? [];
          routes.forEach((route) => {
            route.type = `house-project-${scope}`;
            route.listPath = options.canonicalDetailRoutes ? "/projekty" : `/projekty-${scope}`;
            route.detailPath = options.canonicalDetailRoutes
              ? "/projekty/:slug"
              : `/projekty-${scope}/:slug`;
          });
        }
        return {
          key: collection === "settings" ? seed.key : keyMap.get(`${kind}:${seed.key}`)!,
          desired,
        };
      });
      return [collection, seeds];
    })
  ) as FullSitePackageV1["resources"];

  return {
    ...source,
    key: `formadom-studio-${scope}`,
    metadata: { ...source.metadata, name: `FormaDom ${scope}` },
    resources,
  };
};

type NativeSnapshot = Readonly<{ id: string; desired: JsonObject }>;

const readNativeSnapshot = (value: JsonObject | null, code: string): NativeSnapshot => {
  const durable = readFullSiteDurableAfterSnapshotV1(value);
  if (durable) return { id: durable.id, desired: durable.desired };
  const saga = readSagaSnapshot(value);
  if (saga?.id) return { id: saga.id, desired: saga.desired };
  if (
    value &&
    typeof value.id === "string" &&
    value.desired &&
    typeof value.desired === "object" &&
    !Array.isArray(value.desired)
  ) {
    return { id: value.id, desired: value.desired as JsonObject };
  }
  throw new Error(code);
};

const normalizeInstalledSettingState = (
  item: FullSiteInstallLedgerItem
): FullSiteRawSettingState => {
  const snapshot = readNativeSnapshot(item.afterSnapshot, "site_package_cleanup_snapshot_invalid");
  if (snapshot.id !== item.key) throw new Error("site_package_cleanup_snapshot_invalid");
  const present = snapshot.desired.present;
  if (present === false) return { key: item.key, present: false } as FullSiteRawSettingState;
  const value = snapshot.desired.value;
  if ((present !== true && present !== undefined) || value === undefined) {
    throw new Error("site_package_cleanup_snapshot_invalid");
  }
  return { key: item.key, present: true, value } as FullSiteRawSettingState;
};

const emergencyRestoreFromDurableEvidence = async (input: {
  sourceRunId: string;
  actorId: string;
  ledger: FullSiteInstallLedgerPort;
  shellBefore: readonly FullSiteRawSettingState[];
  packageKey: string;
}) => {
  const items = (await input.ledger.listItems(input.sourceRunId))
    .filter((item) => item.status === "success" && item.operation !== "noop")
    .sort((left, right) => right.position - left.position);
  const settingItems = items
    .filter((item) => item.kind === "setting")
    .sort((left, right) => left.key.localeCompare(right.key));
  const installedShell = settingItems.map(normalizeInstalledSettingState);
  const currentShell = await readInstalledShellState();
  if (!isDeepStrictEqual(currentShell, input.shellBefore)) {
    if (!isDeepStrictEqual(currentShell, installedShell)) {
      throw new Error("site_package_cleanup_shell_conflict");
    }
    await restoreFullSiteSettingsBatchRawAtomic({
      expectedCurrent: installedShell,
      target: input.shellBefore,
    });
  }

  const resolver = createFullSiteCurrentResourceResolver(input.packageKey, input.ledger);
  for (const item of items.filter((candidate) => candidate.kind !== "setting")) {
    const after = readNativeSnapshot(item.afterSnapshot, "site_package_cleanup_snapshot_invalid");
    const before =
      item.operation === "update"
        ? readNativeSnapshot(item.beforeSnapshot, "site_package_cleanup_snapshot_invalid")
        : null;
    const current = await resolver(item.kind, { key: item.key, desired: after.desired }, after.id);
    if (item.operation === "create" && current === null) continue;
    if (
      item.operation === "update" &&
      before &&
      current?.id === before.id &&
      isDeepStrictEqual(current.desired, before.desired)
    ) {
      continue;
    }
    if (current?.id !== after.id || !isDeepStrictEqual(current.desired, after.desired)) {
      throw new Error("site_package_cleanup_resource_conflict");
    }
    const adapter: ResourceAdapter = FULL_SITE_RESOURCE_ADAPTERS[item.kind];
    const expectedCurrent: FullSiteNativeSnapshot = after;
    if (item.operation === "create") {
      if (!adapter.deleteSnapshotAtomic) {
        throw new Error("site_package_cleanup_atomic_adapter_missing");
      }
      await adapter.deleteSnapshotAtomic({ id: after.id, expectedCurrent, actorId: input.actorId });
    } else {
      if (!before || !adapter.restoreSnapshotAtomic) {
        throw new Error("site_package_cleanup_atomic_adapter_missing");
      }
      await adapter.restoreSnapshotAtomic({
        id: after.id,
        expectedCurrent,
        target: before,
        actorId: input.actorId,
      });
    }
  }
};

export type ProjektyDomowInstalledHarness = Readonly<{
  scope: string;
  package: FullSitePackageV1;
  actorId: string;
  ledger: FullSiteInstallLedgerPort;
  ledgerWrites: LedgerWrite[];
  shellBefore: readonly FullSiteRawSettingState[];
  apply(overrides?: FullSiteInstallExecutorDeps): Promise<ApplyFullSitePackageResult>;
  rollback(): Promise<{ runId: string }>;
  deleteFormArtifacts(): Promise<void>;
  cleanup(): Promise<void>;
}>;

export const createProjektyDomowInstalledHarness = async (
  options: ScopedFormaDomPackageOptions = {}
): Promise<ProjektyDomowInstalledHarness> => {
  const scope = crypto.randomUUID().slice(0, 8);
  const pkg = buildScopedFormaDomPackage(scope, options);
  const { ledger, writes: ledgerWrites } = createRecordingInstallLedger();
  const shellBefore = await readInstalledShellState();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${scope}@task-547.invalid`,
      passwordHash: "task-547-not-a-login",
      status: "inactive",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("site_package_test_actor_create_failed");

  let sourceRunId: string | null = null;
  let rollbackCompleted = false;
  let closed = false;
  const installedFormIds = new Set<string>();

  const apply = async (overrides: FullSiteInstallExecutorDeps = {}) => {
    const result = await applyFullSitePackage(
      { package: pkg, actorId: actor.id, allowSettingTakeover: true },
      {
        ...overrides,
        ledger,
        resolveCurrentResource:
          overrides.resolveCurrentResource ??
          createFullSiteCurrentResourceResolver(pkg.key, ledger),
      }
    );
    sourceRunId ??= result.runId;
    for (const resource of result.resources) {
      if (resource.identity.startsWith("form:") && resource.id) {
        installedFormIds.add(resource.id);
      }
    }
    return result;
  };

  const deleteFormArtifacts = async () => {
    if (installedFormIds.size === 0) return;
    const ids = [...installedFormIds];
    await db.transaction(async (tx) => {
      await tx.delete(formActionRuns).where(inArray(formActionRuns.formId, ids));
      await tx.delete(formSubmissions).where(inArray(formSubmissions.formId, ids));
    });
  };

  const resolveSourceRunId = async () => {
    if (sourceRunId) return sourceRunId;
    const scopedRuns = await db
      .select({ id: solutionKitInstallRuns.id, mode: solutionKitInstallRuns.mode })
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.kitId, pkg.key));
    const applyRuns = scopedRuns.filter((run) => run.mode === "apply");
    if (applyRuns.length > 1) throw new Error("site_package_test_cleanup_run_ambiguous");
    sourceRunId = applyRuns[0]?.id ?? null;
    return sourceRunId;
  };

  const rollback = async () => {
    const runId = await resolveSourceRunId();
    if (!runId) throw new Error("site_package_test_cleanup_run_missing");
    const result = await rollbackFullSiteInstall({
      sourceRunId: runId,
      actorId: actor.id,
      ledger,
    });
    rollbackCompleted = true;
    if (!isDeepStrictEqual(await readInstalledShellState(), shellBefore)) {
      throw new Error("site_package_test_cleanup_shell_mismatch");
    }
    return result;
  };

  const cleanup = async () => {
    if (closed) return;
    clearSiteCache();
    resetRateLimitBuckets();
    const failures: Error[] = [];
    try {
      await deleteFormArtifacts();
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error("site_package_test_cleanup_failed"));
    }

    let runId: string | null = null;
    try {
      runId = await resolveSourceRunId();
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error("site_package_test_cleanup_failed"));
    }

    if (!rollbackCompleted && runId) {
      try {
        await rollback();
      } catch (error) {
        const officialFailure =
          error instanceof Error ? error : new Error("site_package_test_official_recovery_failed");
        if (officialFailure.message === "site_package_already_rolled_back") {
          rollbackCompleted = true;
        } else {
          failures.push(officialFailure);
          try {
            await emergencyRestoreFromDurableEvidence({
              sourceRunId: runId,
              actorId: actor.id,
              ledger,
              shellBefore,
              packageKey: pkg.key,
            });
          } catch (emergencyError) {
            failures.push(
              emergencyError instanceof Error
                ? emergencyError
                : new Error("site_package_test_emergency_recovery_failed")
            );
          }
        }
      }
    }

    let verified = false;
    try {
      const resolver = createFullSiteCurrentResourceResolver(pkg.key, ledger);
      for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
        if (collection === "settings") continue;
        for (const seed of pkg.resources[collection]) {
          if (await resolver(INSTALLED_RESOURCE_KIND_BY_COLLECTION[collection], seed)) {
            throw new Error("site_package_test_cleanup_resource_present");
          }
        }
      }
      if (!isDeepStrictEqual(await readInstalledShellState(), shellBefore)) {
        throw new Error("site_package_test_cleanup_shell_mismatch");
      }
      verified = true;
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error("site_package_test_cleanup_failed"));
    }

    if (verified) {
      try {
        await db.transaction(async (tx) => {
          await tx.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, pkg.key));
          await tx.delete(pageRevisions).where(eq(pageRevisions.createdBy, actor.id));
          await tx.delete(contentRevisions).where(eq(contentRevisions.createdBy, actor.id));
          await tx.delete(detailPageRevisions).where(eq(detailPageRevisions.createdBy, actor.id));
          await tx.delete(users).where(eq(users.id, actor.id));
        });
        closed = true;
      } catch (error) {
        failures.push(
          error instanceof Error ? error : new Error("site_package_test_cleanup_failed")
        );
      }
    }
    clearSiteCache();
    resetRateLimitBuckets();
    if (failures.length > 0) {
      throw new AggregateError(failures, "site_package_test_cleanup_failed");
    }
  };

  return {
    scope,
    package: pkg,
    actorId: actor.id,
    ledger,
    ledgerWrites,
    shellBefore,
    apply,
    rollback,
    deleteFormArtifacts,
    cleanup,
  };
};

export type ScopedInstalledSeed = Readonly<{
  kind: Exclude<FullSiteInstallResourceKind, "setting">;
  seed: ResourceSeed;
}>;
