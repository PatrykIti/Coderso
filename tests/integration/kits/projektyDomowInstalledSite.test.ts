import { expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../../core/db/client";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import {
  contentEntries,
  contentRevisions,
  detailPageDocuments,
  detailPageRevisions,
  formActionRuns,
  formActions,
  forms,
  formSubmissions,
  listingTemplates,
  menuItems,
  menus,
  pageRevisions,
  pages,
  settings,
  solutionKitInstallRuns,
  users,
} from "../../../core/db/schema";
import { applyFullSitePackage } from "../../../core/services/kits/fullSiteInstall/execute";
import {
  FULL_SITE_RESOURCE_ADAPTERS,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import { rollbackFullSiteInstall } from "../../../core/services/kits/fullSiteInstall/rollback";
import { FULL_SITE_ROLLBACK_ADAPTERS } from "../../../core/services/kits/fullSiteInstall/compensation";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type {
  FullSitePackageV1,
  JsonValue,
  ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";
import { PACKAGE_RESOURCE_COLLECTIONS } from "../../../core/services/kits/fullSitePackage/types";
import {
  buildListingRuntimeParamName,
  resolveFacetToken,
} from "../../../core/services/search/filterContract";
import { restoreSettingsBatchRaw } from "../../../core/services/settings/settingsService";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";
import { PROJECT_FACET_FIELDS } from "../../../scripts/projekty-domow/content/projectListing";
import { PROJECT_BRIEF_SUCCESS_MESSAGE } from "../../../scripts/projekty-domow/content/projectForm";
import { clearSiteCache } from "../../../core/site/cache/siteCache";

const SHELL_KEYS = [
  "site.name",
  "site.locale",
  "site.homepageId",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.contentRoutes",
  "design.tokens",
] as const;

const RESOURCE_KIND_BY_COLLECTION = {
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

const readShellState = async () =>
  new Map(
    (
      await db
        .select({ key: settings.key, value: settings.value })
        .from(settings)
        .where(inArray(settings.key, [...SHELL_KEYS]))
    ).map(({ key, value }) => [key, value] as const)
  );

const containsPackageRef = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsPackageRef);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.ref === "string" && typeof record.key === "string") return true;
  return Object.values(record).some(containsPackageRef);
};

type LedgerWrite = Parameters<FullSiteInstallLedgerPort["recordItem"]>[0];
type ObservedStagedResource = {
  identity: string;
  kind: "content_entry" | "detail_page" | "page" | "menu";
  id: string;
  desired: Record<string, JsonValue>;
};

const assertObservedLifecycleState = async (
  staged: readonly ObservedStagedResource[],
  status: "draft" | "published"
) => {
  const ids = (kind: ObservedStagedResource["kind"]) =>
    staged.filter((item) => item.kind === kind).map((item) => item.id);
  const [pageRows, entryRows, detailRows, menuRows] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(inArray(pages.id, ids("page"))),
    db
      .select()
      .from(contentEntries)
      .where(inArray(contentEntries.id, ids("content_entry"))),
    db
      .select()
      .from(detailPageDocuments)
      .where(inArray(detailPageDocuments.id, ids("detail_page"))),
    db
      .select()
      .from(menus)
      .where(inArray(menus.id, ids("menu"))),
  ]);
  expect(pageRows).toHaveLength(ids("page").length);
  expect(entryRows).toHaveLength(ids("content_entry").length);
  expect(detailRows).toHaveLength(ids("detail_page").length);
  expect(menuRows).toHaveLength(ids("menu").length);
  expect(
    [...pageRows, ...entryRows, ...detailRows, ...menuRows].every((row) => row.status === status)
  ).toBe(true);
  const published = status === "published";
  expect(pageRows.every((row) => Boolean(row.publishedData) === published)).toBe(true);
  expect(entryRows.every((row) => Boolean(row.publishedAt) === published)).toBe(true);
  expect(detailRows.every((row) => Boolean(row.publishedDocument) === published)).toBe(true);
  expect(menuRows.every((row) => Boolean(row.publishedAt) === published)).toBe(true);
};

const createRecordingLedger = () => {
  const durable = createLegacyInstallLedger();
  const writes: LedgerWrite[] = [];
  const ledger: FullSiteInstallLedgerPort = {
    ...durable,
    async recordItem(input) {
      await durable.recordItem(input);
      writes.push(structuredClone(input));
    },
  };
  return { ledger, writes };
};

const readSagaPhase = (snapshot: unknown): string | null => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const recovery = (snapshot as Record<string, unknown>).recovery;
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery)) return null;
  const phase = (recovery as Record<string, unknown>).phase;
  return typeof phase === "string" ? phase : null;
};

const lifecyclePhases = (
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

const getResourceId = (
  resources: readonly { identity: string; id: string | null }[],
  identity: string
): string => {
  const id = resources.find((resource) => resource.identity === identity)?.id;
  if (!id) throw new Error(`site_package_acceptance_resource_missing:${identity}`);
  return id;
};

const getHtmlAttribute = (tag: string, name: string): string | null => {
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

const fixturePackage = (scope: string): FullSitePackageV1 => {
  const source = buildFormaDomPackage();
  const keyMap = new Map<string, string>();
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    if (collection === "settings") continue;
    for (const seed of source.resources[collection]) {
      keyMap.set(`${RESOURCE_KIND_BY_COLLECTION[collection]}:${seed.key}`, `${seed.key}-${scope}`);
    }
  }

  const resources = Object.fromEntries(
    PACKAGE_RESOURCE_COLLECTIONS.map((collection) => {
      const kind = RESOURCE_KIND_BY_COLLECTION[collection];
      const seeds = source.resources[collection].map((seed) => {
        const desired = rewriteRefs(seed.desired, keyMap) as Record<string, JsonValue>;
        if (collection !== "settings") {
          if (typeof desired.slug === "string") {
            desired.slug = desired.slug === "/" ? `/task-547-${scope}` : `${desired.slug}-${scope}`;
          }
          if (typeof desired.name === "string") desired.name = `${desired.name} ${scope}`;
          if (typeof desired.title === "string") desired.title = `${desired.title} ${scope}`;
        }
        if (collection === "contentTypes") desired.slug = `house-project-${scope}`;
        if (collection === "detailPages") desired.contentTypeSlug = `house-project-${scope}`;
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
            route.listPath = `/projekty-${scope}`;
            route.detailPath = `/projekty-${scope}/:slug`;
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

test("installs, reapplies idempotently, exposes every native resource, and rolls back shell exactly", async () => {
  const scope = crypto.randomUUID().slice(0, 8);
  const pkg = fixturePackage(scope);
  const { ledger, writes: ledgerWrites } = createRecordingLedger();
  const shellBefore = await readShellState();
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
  const createdResources: Array<{ identity: string; id: string }> = [];
  let installedFormId: string | null = null;
  const scopedSeeds = new Map<
    string,
    { kind: Exclude<FullSiteInstallResourceKind, "setting">; seed: ResourceSeed }
  >();
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    if (collection === "settings") continue;
    const kind = RESOURCE_KIND_BY_COLLECTION[collection];
    for (const seed of pkg.resources[collection])
      scopedSeeds.set(`${kind}:${seed.key}`, { kind, seed });
  }
  const stagedResources = new Map<string, ObservedStagedResource>();
  const publishedResources = new Set<string>();
  const observation = { firstDraftChecks: 0, menuPreparedChecks: 0, shellBoundaryChecks: 0 };
  const expectedLifecycleCount =
    pkg.resources.entries.length +
    pkg.resources.detailPages.length +
    pkg.resources.pages.length +
    pkg.resources.menus.length;

  const adapters = Object.fromEntries(
    Object.entries(FULL_SITE_RESOURCE_ADAPTERS).map(([rawKind, delegate]) => {
      const kind = rawKind as FullSiteInstallResourceKind;
      const rememberCreate = (input: { operation: string; key: string }, id: string) => {
        if (input.operation === "create")
          createdResources.push({ identity: `${kind}:${input.key}`, id });
      };
      const adapter: ResourceAdapter = {
        ...delegate,
        async applyDesired(input) {
          const result = await delegate.applyDesired(input);
          rememberCreate(input, result.id);
          return result;
        },
        async applyStaged(input) {
          const result = await delegate.applyStaged(input);
          if (
            kind !== "content_entry" &&
            kind !== "detail_page" &&
            kind !== "page" &&
            kind !== "menu"
          ) {
            throw new Error("site_package_test_unexpected_staged_kind");
          }
          const observed = {
            identity: `${kind}:${input.key}`,
            kind,
            id: result.id,
            desired: result.desired,
          };
          stagedResources.set(observed.identity, observed);
          rememberCreate(input, result.id);
          return result;
        },
        async publish(id, actorId) {
          if (observation.firstDraftChecks === 0) {
            expect(stagedResources.size).toBe(expectedLifecycleCount);
            await assertObservedLifecycleState([...stagedResources.values()], "draft");
            observation.firstDraftChecks += 1;
          }
          const observed = [...stagedResources.values()].find(
            (item) => item.kind === kind && item.id === id
          );
          if (kind === "menu") {
            const [row, items] = await Promise.all([
              db
                .select()
                .from(menus)
                .where(eq(menus.id, id))
                .then((rows) => rows[0]),
              db
                .select({
                  id: menuItems.id,
                  label: menuItems.label,
                  href: menuItems.href,
                  pageId: menuItems.pageId,
                  parentId: menuItems.parentId,
                  orderIndex: menuItems.orderIndex,
                  settings: menuItems.settings,
                })
                .from(menuItems)
                .where(eq(menuItems.menuId, id))
                .orderBy(menuItems.orderIndex),
            ]);
            const envelope = row?.settings as Record<string, unknown> | null;
            expect(row?.status).toBe("draft");
            expect(items).toEqual(observed?.desired.items);
            expect(envelope?.document).toEqual(observed?.desired.document);
            expect(envelope?.appearance).toEqual(observed?.desired.appearance);
            observation.menuPreparedChecks += 1;
          }
          await delegate.publish(id, actorId);
          if (!observed) throw new Error("site_package_test_publish_without_stage");
          publishedResources.add(observed.identity);
        },
        ...(delegate.applyBatch
          ? {
              async applyBatch(inputs) {
                if (kind === "setting") {
                  expect(publishedResources.size).toBe(expectedLifecycleCount);
                  await assertObservedLifecycleState([...stagedResources.values()], "published");
                  observation.shellBoundaryChecks += 1;
                }
                return delegate.applyBatch!(inputs);
              },
            }
          : {}),
      };
      return [kind, adapter];
    })
  ) as Record<FullSiteInstallResourceKind, ResourceAdapter>;

  const deleteScopedFormArtifacts = async () => {
    if (!installedFormId) return;
    await db.delete(formActionRuns).where(eq(formActionRuns.formId, installedFormId));
    await db.delete(formSubmissions).where(eq(formSubmissions.formId, installedFormId));
  };

  const cleanupScopedFixture = async () => {
    clearSiteCache();
    resetRateLimitBuckets();
    try {
      await deleteScopedFormArtifacts();
      let cleanupSourceRunId = sourceRunId;
      if (!cleanupSourceRunId) {
        const scopedRuns = await db
          .select({ id: solutionKitInstallRuns.id, mode: solutionKitInstallRuns.mode })
          .from(solutionKitInstallRuns)
          .where(eq(solutionKitInstallRuns.kitId, pkg.key));
        const applyRuns = scopedRuns.filter((run) => run.mode === "apply");
        if (applyRuns.length > 1) throw new Error("site_package_test_cleanup_run_ambiguous");
        cleanupSourceRunId = applyRuns[0]?.id ?? null;
      }

      let officialRecoveryFailure: Error | null = null;
      if (!rollbackCompleted && cleanupSourceRunId) {
        try {
          await rollbackFullSiteInstall({
            sourceRunId: cleanupSourceRunId,
            actorId: actor.id,
            ledger,
          });
          rollbackCompleted = true;
        } catch (error) {
          if (error instanceof Error && error.message === "site_package_already_rolled_back") {
            rollbackCompleted = true;
          } else {
            officialRecoveryFailure =
              error instanceof Error
                ? error
                : new Error("site_package_test_official_recovery_failed");
          }
        }
      } else if (!rollbackCompleted && createdResources.length > 0) {
        officialRecoveryFailure = new Error("site_package_test_cleanup_run_missing");
      }

      if (officialRecoveryFailure) {
        await restoreSettingsBatchRaw(
          SHELL_KEYS.map((key) =>
            shellBefore.has(key)
              ? { key, operation: "set" as const, value: shellBefore.get(key) }
              : { key, operation: "delete" as const }
          )
        );
        const resolver = createFullSiteCurrentResourceResolver(pkg.key, ledger);
        for (const resource of [...createdResources].reverse()) {
          const scoped = scopedSeeds.get(resource.identity);
          if (!scoped) throw new Error("site_package_test_cleanup_resource_unscoped");
          try {
            await FULL_SITE_ROLLBACK_ADAPTERS[scoped.kind].deleteById(resource.id, actor.id);
          } catch (error) {
            if (await resolver(scoped.kind, scoped.seed, resource.id)) throw error;
          }
        }
      }

      const resolver = createFullSiteCurrentResourceResolver(pkg.key, ledger);
      for (const { kind, seed } of scopedSeeds.values()) {
        if (await resolver(kind, seed))
          throw new Error("site_package_test_cleanup_resource_present");
      }
      if (!isDeepStrictEqual(await readShellState(), shellBefore)) {
        throw new Error("site_package_test_cleanup_shell_mismatch");
      }
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("site_package_test_cleanup_failed");
      throw new AggregateError([failure], "site_package_test_cleanup_failed");
    }
    await db.transaction(async (tx) => {
      await tx.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, pkg.key));
      await tx.delete(pageRevisions).where(eq(pageRevisions.createdBy, actor.id));
      await tx.delete(contentRevisions).where(eq(contentRevisions.createdBy, actor.id));
      await tx.delete(detailPageRevisions).where(eq(detailPageRevisions.createdBy, actor.id));
      await tx.delete(users).where(eq(users.id, actor.id));
    });
  };

  try {
    const first = await applyFullSitePackage(
      { package: pkg, actorId: actor.id, allowSettingTakeover: true },
      {
        ledger,
        adapters,
        resolveCurrentResource: createFullSiteCurrentResourceResolver(pkg.key, ledger),
      }
    );
    sourceRunId = first.runId;
    expect(await ledger.getRun(first.runId)).toMatchObject({
      options: {
        fullSitePackage: true,
        packageFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    expect(first.resources).toHaveLength(27);
    expect(first.resources.every((resource) => resource.id)).toBe(true);
    expect(
      first.resources.some(
        (resource) => resource.identity.startsWith("setting:") && resource.operation === "update"
      )
    ).toBe(true);
    expect(observation).toEqual({
      firstDraftChecks: 1,
      menuPreparedChecks: 1,
      shellBoundaryChecks: 1,
    });

    const pageIdentities = pkg.resources.pages.map((seed) => `page:${seed.key}`);
    const entryIdentities = pkg.resources.entries.map((seed) => `content_entry:${seed.key}`);
    const detailIdentity = `detail_page:${pkg.resources.detailPages[0]!.key}`;
    const menuIdentity = `menu:${pkg.resources.menus[0]!.key}`;
    const formIdentity = `form:${pkg.resources.forms[0]!.key}`;
    const listingTemplateIdentity = `listing_template:${pkg.resources.listingTemplates[0]!.key}`;
    const lifecycleIdentities = [
      ...pageIdentities,
      ...entryIdentities,
      detailIdentity,
      menuIdentity,
    ];

    for (const identity of lifecycleIdentities) {
      expect(lifecyclePhases(ledgerWrites, first.runId, identity)).toEqual([
        "unresolved",
        "prepared",
        "staged",
        "complete",
      ]);
    }
    expect(lifecyclePhases(ledgerWrites, first.runId, formIdentity)).toEqual([
      "unresolved",
      "prepared",
      "complete",
    ]);
    expect(lifecyclePhases(ledgerWrites, first.runId, listingTemplateIdentity)).toEqual([
      "unresolved",
      "prepared",
      "complete",
    ]);

    const firstItems = await ledger.listItems(first.runId);
    const formLedgerItem = firstItems.find(
      (item) => item.kind === "form" && item.key === pkg.resources.forms[0]!.key
    );
    expect(formLedgerItem?.afterSnapshot).toMatchObject({
      desired: { status: "published" },
      recovery: { phase: "complete", intendedDesired: { status: "published" } },
    });
    const listingTemplateLedgerItem = firstItems.find(
      (item) =>
        item.kind === "listing_template" && item.key === pkg.resources.listingTemplates[0]!.key
    );
    expect(readSagaPhase(listingTemplateLedgerItem?.afterSnapshot)).toBe("complete");
    expect(
      Object.hasOwn(
        (listingTemplateLedgerItem?.afterSnapshot?.desired as Record<string, unknown>) ?? {},
        "status"
      )
    ).toBe(false);
    for (const identity of lifecycleIdentities) {
      const separator = identity.indexOf(":");
      const item = firstItems.find(
        (candidate) =>
          candidate.kind === identity.slice(0, separator) &&
          candidate.key === identity.slice(separator + 1)
      );
      expect(item).toMatchObject({ status: "success", operation: "create" });
      expect(readSagaPhase(item?.afterSnapshot)).toBe("complete");
      expect(item?.afterSnapshot).toMatchObject({
        desired: { status: "published" },
        recovery: { intendedDesired: { status: "published" } },
      });
    }

    const pageIds = pageIdentities.map((identity) => getResourceId(first.resources, identity));
    const entryIds = entryIdentities.map((identity) => getResourceId(first.resources, identity));
    const detailId = getResourceId(first.resources, detailIdentity);
    const menuId = getResourceId(first.resources, menuIdentity);
    installedFormId = getResourceId(first.resources, formIdentity);
    const listingTemplateId = getResourceId(first.resources, listingTemplateIdentity);

    const installedPages = await db.select().from(pages).where(inArray(pages.id, pageIds));
    expect(installedPages).toHaveLength(7);
    expect(
      installedPages.every(
        (page) =>
          page.status === "published" && page.publishedAt !== null && page.publishedData !== null
      )
    ).toBe(true);
    const installedPageRevisions = await db
      .select()
      .from(pageRevisions)
      .where(inArray(pageRevisions.pageId, pageIds));
    expect(installedPageRevisions).toHaveLength(7);
    expect(
      installedPageRevisions.every(
        (revision) => revision.kind === "publish" && revision.createdBy === actor.id
      )
    ).toBe(true);

    const installedEntries = await db
      .select()
      .from(contentEntries)
      .where(inArray(contentEntries.id, entryIds));
    expect(installedEntries).toHaveLength(6);
    expect(
      installedEntries.every((entry) => entry.status === "published" && entry.publishedAt !== null)
    ).toBe(true);
    const installedEntryRevisions = await db
      .select()
      .from(contentRevisions)
      .where(inArray(contentRevisions.entryId, entryIds));
    expect(installedEntryRevisions).toHaveLength(6);
    expect(installedEntryRevisions.every((revision) => revision.createdBy === actor.id)).toBe(true);

    const [installedDetail] = await db
      .select()
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, detailId));
    expect(installedDetail).toMatchObject({
      status: "published",
      currentDocument: { status: "published" },
      publishedDocument: { status: "published" },
    });
    expect(installedDetail?.publishedAt).not.toBeNull();
    const installedDetailRevisions = await db
      .select()
      .from(detailPageRevisions)
      .where(eq(detailPageRevisions.detailPageId, detailId));
    expect(installedDetailRevisions).toHaveLength(1);
    expect(installedDetailRevisions[0]).toMatchObject({
      kind: "publish",
      createdBy: actor.id,
      document: { status: "published" },
    });

    const [installedMenu] = await db.select().from(menus).where(eq(menus.id, menuId));
    expect(installedMenu).toMatchObject({ status: "published" });
    expect(installedMenu?.publishedAt).not.toBeNull();
    expect(installedMenu?.settings).toMatchObject({
      appearance: expect.any(Object),
      document: expect.any(Object),
      published: {
        appearance: expect.any(Object),
        document: expect.any(Object),
      },
    });

    const [installedForm] = await db.select().from(forms).where(eq(forms.id, installedFormId));
    expect(installedForm).toMatchObject({
      status: "published",
      successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
      submissionAccess: "public",
    });
    const installedActions = await db
      .select()
      .from(formActions)
      .where(eq(formActions.formId, installedFormId));
    expect(installedActions).toHaveLength(1);
    expect(installedActions[0]).toMatchObject({
      type: "success_message",
      enabled: true,
      config: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
    });

    const [installedListingTemplate] = await db
      .select()
      .from(listingTemplates)
      .where(eq(listingTemplates.id, listingTemplateId));
    expect(installedListingTemplate).toBeDefined();
    expect(Object.hasOwn(installedListingTemplate ?? {}, "status")).toBe(false);

    const pageRouteContract = [
      ["home", "Dom zaczyna się od dobrego pomysłu"],
      ["oferta", "Od pierwszej kreski do pewnej decyzji"],
      ["projekty", "Znajdź punkt wyjścia dla swojego domu"],
      ["proces", "Dobra architektura potrzebuje dobrego procesu"],
      ["cennik", "Przejrzyste pakiety projektowe"],
      ["o-nas", "Projektujemy domy do prawdziwego życia"],
      ["kontakt", "Opowiedz nam o swoim domu"],
    ] as const;
    const resolveScopedPagePath = (baseKey: (typeof pageRouteContract)[number][0]) => {
      const seed = pkg.resources.pages.find((candidate) => candidate.key === `${baseKey}-${scope}`);
      const slug = seed?.desired.slug;
      if (typeof slug !== "string") throw new Error("site_package_acceptance_page_slug_missing");
      return slug;
    };

    clearSiteCache();
    resetRateLimitBuckets();
    const pageHtmlByKey = new Map<string, string>();
    for (const [index, [baseKey, meaningfulCopy]] of pageRouteContract.entries()) {
      const path = resolveScopedPagePath(baseKey);
      const response = await handlePublicRequest(
        new Request(`http://task-547.invalid${path}`, {
          headers: {
            "user-agent": `task-547-installed-site-${baseKey}-route-test`,
            "x-forwarded-for": `127.0.0.${60 + index}`,
          },
        })
      );
      expect(response.status).toBe(200);
      const html = await response.text();
      pageHtmlByKey.set(baseKey, html);
      expect(html).toContain('<html lang="pl">');
      expect(html).toContain('data-site-header="true"');
      expect(html).toContain(`aria-label="Menu główne FormaDom ${scope}"`);
      expect(html).toContain('data-site-footer="true"');
      expect(html).toContain("Nowoczesne projekty domów tworzone z uważnością.");
      expect(html).toContain('data-page-responsive="true"');
      expect(html).toContain(meaningfulCopy);
    }

    const projectsPath = resolveScopedPagePath("projekty");
    const detailPath = `/projekty-${scope}/aurora-${scope}`;
    const [installedContentRoutes] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "site.contentRoutes"));
    expect(installedContentRoutes?.value).toEqual([
      {
        type: `house-project-${scope}`,
        listPath: projectsPath,
        detailPath: `/projekty-${scope}/:slug`,
        enabled: true,
        detailPageId: detailId,
      },
    ]);
    const listingHtml = pageHtmlByKey.get("projekty") ?? "";
    expect(listingHtml).toContain('data-section-id="projects-browser"');
    expect(listingHtml).toContain("Filtruj wyniki");
    expect(listingHtml).toContain("Szukaj projektu");
    expect(listingHtml).toContain("Wpisz nazwę projektu...");
    expect(listingHtml).toContain("Wyniki aktualizują się automatycznie.");
    expect(listingHtml).toContain("Aktualizowanie wyników...");
    expect(listingHtml).toContain("Zobacz szczegóły");
    expect(listingHtml).toContain('data-content-list-items="6"');
    expect(listingHtml).not.toMatch(
      /Filter results|Search results|Updates automatically|Updating linked results|Read more/
    );

    const detailResponse = await handlePublicRequest(
      new Request(`http://task-547.invalid${detailPath}`, {
        headers: {
          "user-agent": "task-547-installed-site-detail-route-test",
          "x-forwarded-for": "127.0.0.67",
        },
      })
    );
    expect(detailResponse.status).toBe(200);
    const detailHtml = await detailResponse.text();
    expect(
      new Set([...pageRouteContract.map(([key]) => resolveScopedPagePath(key)), detailPath]).size
    ).toBe(8);
    expect(detailHtml).toContain('<html lang="pl">');
    expect(detailHtml).toContain('data-site-header="true"');
    expect(detailHtml).toContain(`aria-label="Menu główne FormaDom ${scope}"`);
    expect(detailHtml).toContain(`href="/projekty-${scope}"`);
    expect(detailHtml).toContain('data-site-footer="true"');
    expect(detailHtml).toContain("Nowoczesne projekty domów tworzone z uważnością.");
    expect(detailHtml).toContain('data-page-responsive="true"');
    expect(detailHtml).toContain('[data-site-footer="true"] [data-section-id="footer-main"]');
    expect(detailHtml).toContain('data-stats-kpi-count="4"');
    expect(detailHtml).toContain('data-gallery-mosaic-count="4"');
    expect(detailHtml).toContain('data-content-list-items="3"');
    expect(detailHtml).toContain("duże przeszklenia");
    expect(detailHtml).toContain("148");
    expect(detailHtml).toContain("A+");
    expect(detailHtml).toContain(`href="/projekty-${scope}/linea-${scope}"`);
    expect(detailHtml).not.toContain("Znajdź punkt wyjścia dla swojego domu");
    expect(detailHtml).not.toMatch(
      /Build your system with Coderso|Launch modern sites|Get started|Learn more|Untitled|Read more|Media [1-4]|Content list|Choose a listing query/
    );

    const listingQueryId = getResourceId(
      first.resources,
      `listing_query:${pkg.resources.listingQueries[0]!.key}`
    );
    const styleToken = resolveFacetToken({
      id: "style",
      kind: "checkbox",
      label: "Styl",
      field: PROJECT_FACET_FIELDS[0],
      op: "in",
    });
    const filteredUrl = new URL(`http://task-547.invalid${projectsPath}`);
    filteredUrl.searchParams.set(
      buildListingRuntimeParamName(listingQueryId, styleToken),
      "natural"
    );
    clearSiteCache();
    const filteredResponse = await handlePublicRequest(
      new Request(filteredUrl, {
        headers: {
          "user-agent": "task-547-installed-site-filtered-list-test",
          "x-forwarded-for": "127.0.0.68",
        },
      })
    );
    expect(filteredResponse.status).toBe(200);
    const filteredHtml = await filteredResponse.text();
    expect(filteredHtml).toContain('data-content-list-items="3"');
    expect(filteredHtml).toContain("Aurora");
    expect(filteredHtml).toContain("Mono");
    expect(filteredHtml).toContain("Calm");
    expect(filteredHtml).not.toContain("Linea");
    expect(filteredHtml).not.toContain("Nova");
    expect(filteredHtml).not.toContain("Vista");
    expect(filteredHtml).not.toBe(listingHtml);

    const contactHtml = pageHtmlByKey.get("kontakt") ?? "";
    const formTag = contactHtml.match(/<form[^>]*data-form-id="[^"]+"[^>]*>/)?.[0] ?? "";
    const nonceTag = contactHtml.match(/<input[^>]*data-form-security-nonce="1"[^>]*>/)?.[0] ?? "";
    const renderedFormId = getHtmlAttribute(formTag, "data-form-id");
    const nonce = getHtmlAttribute(nonceTag, "value");
    expect(renderedFormId).toBe(installedFormId);
    expect(getHtmlAttribute(formTag, "action")).toBe(`/forms/${installedFormId}/submissions`);
    expect(nonce).toMatch(/^\d+\.[a-f0-9]{64}$/);
    if (!nonce) throw new Error("site_package_acceptance_nonce_missing");

    const submissionUrl = `http://task-547.invalid/forms/${installedFormId}/submissions`;
    const submittedPayload = {
      name: "Test użytkownika TASK-547",
      email: `${scope}@submission.task-547.invalid`,
      stage: "Mam działkę",
      message: `Scoped acceptance ${scope}`,
      consent: "true",
    };
    const submitPublicForm = (payload: Record<string, string>, userAgent: string) => {
      resetRateLimitBuckets();
      return handlePublicRequest(
        new Request(submissionUrl, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": userAgent,
            "x-forwarded-for": "127.0.0.1",
          },
          body: new URLSearchParams(payload),
        })
      );
    };
    const expectNoFormWrites = async () => {
      expect(
        await db.select().from(formSubmissions).where(eq(formSubmissions.formId, installedFormId))
      ).toHaveLength(0);
      expect(
        await db.select().from(formActionRuns).where(eq(formActionRuns.formId, installedFormId))
      ).toHaveLength(0);
    };
    const tamperedNonce = `${nonce.slice(0, -1)}${nonce.endsWith("0") ? "1" : "0"}`;
    const tamperedResponse = await submitPublicForm(
      { __nl_form_nonce: tamperedNonce, ...submittedPayload },
      "task-547-installed-site-tampered-nonce-test"
    );
    expect(tamperedResponse.status).toBe(403);
    expect(await tamperedResponse.json()).toMatchObject({ error: { code: "form_nonce_invalid" } });
    await expectNoFormWrites();

    const invalidResponse = await submitPublicForm(
      { __nl_form_nonce: nonce, name: submittedPayload.name },
      "task-547-installed-site-invalid-form-test"
    );
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toMatchObject({
      error: { code: "form_payload_required" },
    });
    await expectNoFormWrites();

    const validResponse = await submitPublicForm(
      { __nl_form_nonce: nonce, ...submittedPayload },
      "task-547-installed-site-valid-form-test"
    );
    expect(validResponse.status).toBe(200);
    const submissionResult = (await validResponse.json()) as {
      id: string;
      formId: string;
      payload: Record<string, unknown>;
      status: string;
      runtime: { successMessage: string | null; redirectUrl: string | null };
    };
    expect(submissionResult).toMatchObject({
      formId: installedFormId,
      status: "new",
      payload: { ...submittedPayload, consent: true },
      runtime: {
        successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
        redirectUrl: null,
      },
    });
    const [storedSubmission] = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.id, submissionResult.id));
    expect(storedSubmission).toMatchObject({
      formId: installedFormId,
      payload: { ...submittedPayload, consent: true },
      status: "new",
      ip: "127.0.0.1",
      userAgent: "task-547-installed-site-valid-form-test",
    });
    const storedActionRuns = await db
      .select()
      .from(formActionRuns)
      .where(eq(formActionRuns.submissionId, submissionResult.id));
    expect(storedActionRuns).toHaveLength(1);
    expect(storedActionRuns[0]).toMatchObject({
      formId: installedFormId,
      submissionId: submissionResult.id,
      actionId: installedActions[0]!.id,
      actionType: "success_message",
      actionLabel: "Potwierdzenie wysłania",
      status: "success",
      actionConfig: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
      submissionPayload: submittedPayload,
    });

    await deleteScopedFormArtifacts();
    expect(
      await db.select().from(formActionRuns).where(eq(formActionRuns.formId, installedFormId))
    ).toHaveLength(0);
    expect(
      await db.select().from(formSubmissions).where(eq(formSubmissions.formId, installedFormId))
    ).toHaveLength(0);

    const second = await applyFullSitePackage(
      { package: pkg, actorId: actor.id, allowSettingTakeover: true },
      {
        ledger,
        resolveCurrentResource: createFullSiteCurrentResourceResolver(pkg.key, ledger),
      }
    );
    expect(
      second.resources
        .filter((resource) => resource.operation !== "noop")
        .map((resource) => [resource.identity, resource.operation])
    ).toEqual([]);
    expect(
      second.resources
        .filter((resource) => resource.identity.startsWith("setting:"))
        .every((resource) => resource.operation === "noop" || resource.operation === "update")
    ).toBe(true);
    expect(new Set(second.resources.map((resource) => resource.id)).size).toBe(27);
    expect(
      Object.fromEntries(second.resources.map((resource) => [resource.identity, resource.id]))
    ).toEqual(
      Object.fromEntries(first.resources.map((resource) => [resource.identity, resource.id]))
    );
    const secondItems = await ledger.listItems(second.runId);
    expect(secondItems).toHaveLength(second.resources.length);
    expect(secondItems.every((item) => item.operation === "noop")).toBe(true);
    expect(
      secondItems.every((item) => item.afterSnapshot && !containsPackageRef(item.afterSnapshot))
    ).toBe(true);

    const rollback = await rollbackFullSiteInstall({
      sourceRunId: first.runId,
      actorId: actor.id,
      ledger,
    });
    rollbackCompleted = true;
    expect(await ledger.getRun(rollback.runId)).toMatchObject({
      mode: "rollback",
      status: "success",
      rollbackOfRunId: first.runId,
    });
    expect(await ledger.listItems(rollback.runId)).toHaveLength(
      first.resources.filter((resource) => resource.operation !== "noop").length
    );
    expect(await readShellState()).toEqual(shellBefore);
    const afterResolver = createFullSiteCurrentResourceResolver(pkg.key, ledger);
    for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
      if (collection === "settings") continue;
      for (const seed of pkg.resources[collection]) {
        expect(await afterResolver(RESOURCE_KIND_BY_COLLECTION[collection], seed)).toBeNull();
      }
    }
  } finally {
    await cleanupScopedFixture();
  }
}, 360_000);
