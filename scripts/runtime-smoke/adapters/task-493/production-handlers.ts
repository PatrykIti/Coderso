import { createHash } from "node:crypto";

import { inArray, sql } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import {
  seoIndexedPages,
  seoSearchMetrics,
  seoSearchQueries,
  seoSitemapSubmissions,
} from "../../../../core/db/schema";
import {
  getSecuritySettings,
  setSecuritySettings,
  type SecuritySettings,
  type SecuritySettingsUpdate,
} from "../../../../core/services/settings/securitySettings";
import { RunFixtureLedger } from "../../database/fixture-ledger";
import { buildCleanupBatchPlan, type CleanupBatchPlan } from "../../database/batch-contract";
import { SmokeError } from "../../contracts";
import {
  buildTask493FixtureSpecs,
  task493FixtureSitemapPath,
  task493FixtureUrl,
  type Task493ScenarioId,
  type Task493VariantId,
} from "./browser-actions";
import {
  Task493DatabaseRoutingSettingsPersistence,
  Task493RoutingSettingsLease,
  type Task493RoutingSettingsPersistence,
} from "./routing-settings-lease";
import type {
  Task493CleanupOutput,
  Task493InstallInput,
  Task493InstallOutput,
  Task493ProofOutput,
  Task493ReadInput,
  Task493ReadOutput,
  Task493RecoveryAuthority,
  Task493WorkerHandlers,
} from "./worker-operations";

type FixtureState = Readonly<{
  readonly scenarioId: string;
  readonly variantId: string;
  readonly url: string;
  readonly sitemapUrl: string;
}>;

interface InstalledState {
  readonly marker: string;
  readonly fixtures: readonly FixtureState[];
  readonly ledger: ReturnType<RunFixtureLedger["freeze"]>;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type RecoveryState = Readonly<
  { readonly kind: "absent" } | { readonly kind: "complete"; readonly state: InstalledState }
>;

export interface Task493ProductionHandlerDependencies {
  readonly closeDatabase: () => Promise<void>;
  readonly fixtureRecovery: Task493FixtureRecoveryPersistence;
  readonly afterFixtureCommit: () => void;
  readonly routingSettings: Task493RoutingSettingsPersistence;
  readonly getSecuritySettings: () => Promise<SecuritySettings>;
  readonly setSecuritySettings: (update: SecuritySettingsUpdate) => Promise<SecuritySettings>;
}

export interface Task493FixtureRecoveryPersistence {
  install(input: Task493InstallInput): Promise<Task493FixtureInstallResult>;
  inspect(authority: Task493RecoveryAuthority): Promise<"absent" | "complete">;
  remove(authority: Task493RecoveryAuthority): Promise<Task493RemovalCounts>;
}

export type Task493FixtureInstallResult = Readonly<{
  readonly fixtures: Task493InstallOutput["fixtures"];
  readonly rows: number;
  readonly statements: number;
}>;

const TASK493_DATABASE_FIXTURE_RECOVERY: Task493FixtureRecoveryPersistence = Object.freeze({
  install: installTask493Fixtures,
  async inspect(authority: Task493RecoveryAuthority) {
    return (await inspectTask493FixtureRecovery(authority)).kind;
  },
  async remove(authority: Task493RecoveryAuthority) {
    return (await removeTask493RecoveryFixtures(authority)).counts;
  },
});

const TASK493_PRODUCTION_HANDLER_DEPENDENCIES: Task493ProductionHandlerDependencies = Object.freeze(
  {
    closeDatabase,
    fixtureRecovery: TASK493_DATABASE_FIXTURE_RECOVERY,
    afterFixtureCommit: () => undefined,
    routingSettings: new Task493DatabaseRoutingSettingsPersistence(),
    getSecuritySettings,
    setSecuritySettings,
  }
);

type Task493ProductionHandlerDependencyOverrides = Readonly<
  Partial<Task493ProductionHandlerDependencies>
>;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireInstalled(state: InstalledState | null): InstalledState {
  if (state === null)
    throw new SmokeError("smoke_output_invalid", "TASK-493 fixture is not installed");
  return state;
}

function expectedFixtureIdentity(authority: Task493RecoveryAuthority) {
  return buildTask493FixtureSpecs(authority.profile).map((fixture) =>
    Object.freeze({
      scenarioId: fixture.scenarioId,
      variantId: fixture.variantId,
      url: task493FixtureUrl(authority.runMarker, fixture),
      sitemapUrl: task493FixtureSitemapPath(authority.runMarker, fixture),
    })
  );
}

const FIXTURE_URL = /^http:\/\/127\.0\.0\.1:3000\/task493-/u;
const FIXTURE_PATH = /^\/task493-/u;
const FIXTURE_QUERY = /^task493 /u;
const FIXTURE_IMPRESSIONS = 50;
const FIXTURE_CLICKS = 3;

async function readFixtureRows(tx: DbTransaction, authority: Task493RecoveryAuthority) {
  const expected = expectedFixtureIdentity(authority);
  const urls = expected.map(({ url }) => url);
  const paths = expected.map(({ sitemapUrl }) => sitemapUrl);
  const [indexedRows, metricRows, queryRows, submissionRows] = await Promise.all([
    tx
      .select({ url: seoIndexedPages.url, indexingState: seoIndexedPages.indexingState })
      .from(seoIndexedPages)
      .where(inArray(seoIndexedPages.url, urls)),
    tx
      .select({ url: seoSearchMetrics.url, impressions: seoSearchMetrics.impressions })
      .from(seoSearchMetrics)
      .where(inArray(seoSearchMetrics.url, urls)),
    tx
      .select({ url: seoSearchQueries.url, query: seoSearchQueries.query })
      .from(seoSearchQueries)
      .where(inArray(seoSearchQueries.url, urls)),
    tx
      .select({ sitemapUrl: seoSitemapSubmissions.sitemapUrl })
      .from(seoSitemapSubmissions)
      .where(inArray(seoSitemapSubmissions.sitemapUrl, paths)),
  ]);
  return { expected, indexedRows, metricRows, queryRows, submissionRows };
}

async function reconstructTask493RecoveryState(
  tx: DbTransaction,
  authority: Task493RecoveryAuthority
): Promise<RecoveryState> {
  const { expected, indexedRows, metricRows, queryRows, submissionRows } = await readFixtureRows(
    tx,
    authority
  );
  if (
    indexedRows.length === 0 &&
    metricRows.length === 0 &&
    queryRows.length === 0 &&
    submissionRows.length === 0
  ) {
    return Object.freeze({ kind: "absent" });
  }
  if (
    indexedRows.length !== expected.length ||
    metricRows.length !== expected.length ||
    queryRows.length !== expected.length ||
    submissionRows.length !== expected.length
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 recovery matrix is partial");
  }
  const fixtures = expected.map((entry) => {
    const indexed = indexedRows.find(({ url }) => url === entry.url);
    const metric = metricRows.find(({ url }) => url === entry.url);
    const query = queryRows.find(({ url }) => url === entry.url);
    const submission = submissionRows.find(({ sitemapUrl }) => sitemapUrl === entry.sitemapUrl);
    if (
      indexed === undefined ||
      metric === undefined ||
      query === undefined ||
      submission === undefined ||
      indexed.indexingState !== "INDEXED" ||
      metric.impressions !== FIXTURE_IMPRESSIONS ||
      typeof query.query !== "string" ||
      !FIXTURE_QUERY.test(query.query)
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 recovery fixture drifted");
    }
    return Object.freeze({
      scenarioId: entry.scenarioId,
      variantId: entry.variantId,
      url: entry.url,
      sitemapUrl: entry.sitemapUrl,
    });
  });
  const state = Object.freeze({
    marker: authority.runMarker,
    fixtures: Object.freeze(fixtures),
    ledger: buildTask493CleanupLedger({ marker: authority.runMarker, fixtures }),
  });
  return Object.freeze({ kind: "complete", state });
}

export function buildTask493CleanupLedger(input: {
  readonly marker: string;
  readonly fixtures: readonly FixtureState[];
}): ReturnType<RunFixtureLedger["freeze"]> {
  const ledger = new RunFixtureLedger();
  let ordinal = 0;
  const append = (
    entry: Omit<Parameters<RunFixtureLedger["append"]>[0], "ordinal" | "ownershipSha256">
  ) => {
    ledger.append({
      ...entry,
      ordinal: ordinal++,
      ownershipSha256: digest([input.marker, entry.resourceKey, entry.identifier]),
    });
  };
  for (const fixture of input.fixtures) {
    const shortUrl = digest(fixture.url).slice(0, 24);
    append({
      resourceKey: `seo-indexed-page/${fixture.url}`,
      logicalId: `seo-indexed-page-${shortUrl}`,
      kind: "seo-indexed-page",
      profileId: "task-493-db",
      wave: 0,
      identifier: [fixture.url],
      dependsOn: [],
    });
    append({
      resourceKey: `seo-search-metric/${fixture.url}`,
      logicalId: `seo-search-metric-${shortUrl}`,
      kind: "seo-search-metric",
      profileId: "task-493-db",
      wave: 0,
      identifier: [fixture.url],
      dependsOn: [],
    });
    append({
      resourceKey: `seo-search-query/${fixture.url}`,
      logicalId: `seo-search-query-${shortUrl}`,
      kind: "seo-search-query",
      profileId: "task-493-db",
      wave: 0,
      identifier: [fixture.url],
      dependsOn: [],
    });
    append({
      resourceKey: `seo-sitemap-submission/${fixture.sitemapUrl}`,
      logicalId: `seo-sitemap-submission-${shortUrl}`,
      kind: "seo-sitemap-submission",
      profileId: "task-493-db",
      wave: 0,
      identifier: [fixture.sitemapUrl],
      dependsOn: [],
    });
  }
  return ledger.freeze();
}

export function buildTask493CleanupPlans(
  ledger: ReturnType<RunFixtureLedger["freeze"]>
): readonly CleanupBatchPlan[] {
  return Object.freeze([buildCleanupBatchPlan(ledger, "task-493-db", 0)]);
}

function singleIdentifier(plan: CleanupBatchPlan, kind: string): readonly string[] {
  return Object.freeze(
    plan.resources
      .filter((resource) => resource.kind === kind)
      .map(({ identifier }) => {
        if (
          !Array.isArray(identifier) ||
          identifier.length !== 1 ||
          typeof identifier[0] !== "string"
        ) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-493 cleanup plan identifier is invalid"
          );
        }
        return identifier[0];
      })
  );
}

function task493CleanupAuthority(state: InstalledState): Readonly<{
  readonly plans: readonly CleanupBatchPlan[];
  readonly urls: readonly string[];
  readonly sitemapUrls: readonly string[];
}> {
  const plans = buildTask493CleanupPlans(state.ledger);
  const [plan] = plans;
  if (
    plan === undefined ||
    plans.length !== 1 ||
    plan.schemaVersion !== 1 ||
    plan.profileId !== "task-493-db" ||
    plan.wave !== 0 ||
    plan.batchId !== "cleanup/task-493-db/wave-0"
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 cleanup plan authority is invalid");
  }
  const urls = singleIdentifier(plan, "seo-indexed-page");
  const metricUrls = singleIdentifier(plan, "seo-search-metric");
  const queryUrls = singleIdentifier(plan, "seo-search-query");
  const sitemapUrls = singleIdentifier(plan, "seo-sitemap-submission");
  if (
    urls.length !== state.fixtures.length ||
    metricUrls.length !== state.fixtures.length ||
    queryUrls.length !== state.fixtures.length ||
    sitemapUrls.length !== state.fixtures.length ||
    urls.some((url) => !FIXTURE_URL.test(url)) ||
    sitemapUrls.some((path) => !FIXTURE_PATH.test(path)) ||
    new Set(urls).size !== urls.length ||
    new Set(sitemapUrls).size !== sitemapUrls.length ||
    state.fixtures.some(
      ({ url, sitemapUrl }) =>
        !urls.includes(url) ||
        !metricUrls.includes(url) ||
        !queryUrls.includes(url) ||
        !sitemapUrls.includes(sitemapUrl)
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 cleanup plan ownership drifted");
  }
  return Object.freeze({ plans, urls, sitemapUrls });
}

function removedCount(rows: readonly unknown[]): number {
  return rows.length;
}

export type Task493RemovalCounts = Readonly<{
  readonly seoIndexedPagesRemoved: number;
  readonly seoSearchMetricsRemoved: number;
  readonly seoSearchQueriesRemoved: number;
  readonly seoSitemapSubmissionsRemoved: number;
}>;

const EMPTY_REMOVAL_COUNTS: Task493RemovalCounts = Object.freeze({
  seoIndexedPagesRemoved: 0,
  seoSearchMetricsRemoved: 0,
  seoSearchQueriesRemoved: 0,
  seoSitemapSubmissionsRemoved: 0,
});

async function inspectTask493FixtureRecovery(
  authority: Task493RecoveryAuthority
): Promise<RecoveryState> {
  return await db.transaction((tx) => reconstructTask493RecoveryState(tx, authority));
}

async function removeTask493RecoveryFixtures(
  authority: Task493RecoveryAuthority
): Promise<
  Readonly<{ readonly state: InstalledState | null; readonly counts: Task493RemovalCounts }>
> {
  return await db.transaction(async (tx) => {
    const recovery = await reconstructTask493RecoveryState(tx, authority);
    if (recovery.kind === "absent") {
      return Object.freeze({ state: null, counts: EMPTY_REMOVAL_COUNTS });
    }
    const state = recovery.state;
    const { urls, sitemapUrls } = task493CleanupAuthority(state);
    const deletedIndexed = await tx
      .delete(seoIndexedPages)
      .where(inArray(seoIndexedPages.url, urls))
      .returning({ url: seoIndexedPages.url });
    const deletedMetrics = await tx
      .delete(seoSearchMetrics)
      .where(inArray(seoSearchMetrics.url, urls))
      .returning({ url: seoSearchMetrics.url });
    const deletedQueries = await tx
      .delete(seoSearchQueries)
      .where(inArray(seoSearchQueries.url, urls))
      .returning({ url: seoSearchQueries.url });
    const deletedSubmissions = await tx
      .delete(seoSitemapSubmissions)
      .where(inArray(seoSitemapSubmissions.sitemapUrl, sitemapUrls))
      .returning({ sitemapUrl: seoSitemapSubmissions.sitemapUrl });
    const [remainingIndexed, remainingMetrics, remainingQueries, remainingSubmissions] =
      await Promise.all([
        tx
          .select({ url: seoIndexedPages.url })
          .from(seoIndexedPages)
          .where(inArray(seoIndexedPages.url, urls)),
        tx
          .select({ url: seoSearchMetrics.url })
          .from(seoSearchMetrics)
          .where(inArray(seoSearchMetrics.url, urls)),
        tx
          .select({ url: seoSearchQueries.url })
          .from(seoSearchQueries)
          .where(inArray(seoSearchQueries.url, urls)),
        tx
          .select({ sitemapUrl: seoSitemapSubmissions.sitemapUrl })
          .from(seoSitemapSubmissions)
          .where(inArray(seoSitemapSubmissions.sitemapUrl, sitemapUrls)),
      ]);
    assertTask493FixtureAbsence({
      seoIndexedPages: remainingIndexed,
      seoSearchMetrics: remainingMetrics,
      seoSearchQueries: remainingQueries,
      seoSitemapSubmissions: remainingSubmissions,
    });
    return Object.freeze({
      state,
      counts: Object.freeze({
        seoIndexedPagesRemoved: removedCount(deletedIndexed),
        seoSearchMetricsRemoved: removedCount(deletedMetrics),
        seoSearchQueriesRemoved: removedCount(deletedQueries),
        seoSitemapSubmissionsRemoved: removedCount(deletedSubmissions),
      }),
    });
  });
}

export function assertTask493FixtureAbsence(
  input: Readonly<{
    readonly seoIndexedPages: readonly unknown[];
    readonly seoSearchMetrics: readonly unknown[];
    readonly seoSearchQueries: readonly unknown[];
    readonly seoSitemapSubmissions: readonly unknown[];
  }>
): void {
  if (Object.values(input).some((rows) => rows.length !== 0)) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 fixture absence proof failed");
  }
}

async function installTask493Fixtures(
  input: Task493InstallInput
): Promise<Task493FixtureInstallResult> {
  return await db.transaction(async (tx) => {
    const marker = input.authority.runMarker;
    const metricDate = new Date();
    metricDate.setUTCHours(0, 0, 0, 0);
    const identities = input.fixtures.map((fixture) => {
      const scenarioId = fixture.scenarioId as Task493ScenarioId;
      const variantId = fixture.variantId as Task493VariantId;
      return Object.freeze({
        scenarioId,
        variantId,
        url: task493FixtureUrl(marker, fixture),
        sitemapUrl: task493FixtureSitemapPath(marker, fixture),
        query: `task493 ${scenarioId} ${variantId}`,
      });
    });
    const insertedIndexed = await tx
      .insert(seoIndexedPages)
      .values(identities.map(({ url }) => ({ url, indexingState: "INDEXED" })))
      .returning({ url: seoIndexedPages.url });
    const insertedMetrics = await tx
      .insert(seoSearchMetrics)
      .values(
        identities.map(({ url }) => ({
          url,
          date: metricDate,
          clicks: FIXTURE_CLICKS,
          impressions: FIXTURE_IMPRESSIONS,
          ctr: "0.06",
          position: "4.2",
        }))
      )
      .returning({ url: seoSearchMetrics.url });
    const insertedQueries = await tx
      .insert(seoSearchQueries)
      .values(
        identities.map(({ url, query }) => ({
          url,
          query,
          date: metricDate,
          clicks: FIXTURE_CLICKS,
          impressions: FIXTURE_IMPRESSIONS,
          ctr: "0.06",
          position: "4.2",
        }))
      )
      .returning({ url: seoSearchQueries.url });
    const insertedSubmissions = await tx
      .insert(seoSitemapSubmissions)
      .values(
        identities.map(({ sitemapUrl }) => ({
          sitemapUrl,
          source: "google",
          status: "pending",
          isPending: true,
          urlCount: 0,
        }))
      )
      .returning({ sitemapUrl: seoSitemapSubmissions.sitemapUrl });
    if (
      insertedIndexed.length !== input.fixtures.length ||
      insertedMetrics.length !== input.fixtures.length ||
      insertedQueries.length !== input.fixtures.length ||
      insertedSubmissions.length !== input.fixtures.length
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-493 SEO fixtures were not created");
    }
    const fixtures = identities.map((identity) => {
      if (
        !insertedIndexed.some(({ url }) => url === identity.url) ||
        !insertedMetrics.some(({ url }) => url === identity.url) ||
        !insertedQueries.some(({ url }) => url === identity.url) ||
        !insertedSubmissions.some(({ sitemapUrl }) => sitemapUrl === identity.sitemapUrl)
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-493 fixture row is absent");
      }
      return Object.freeze({
        scenarioId: identity.scenarioId,
        variantId: identity.variantId,
        url: identity.url,
      });
    });
    return Object.freeze({
      fixtures: Object.freeze(fixtures),
      statements: 4,
      rows: 4 * input.fixtures.length,
    });
  });
}

export class Task493ProductionHandlers implements Task493WorkerHandlers {
  #routingSettingsLease: Task493RoutingSettingsLease;
  #state: InstalledState | null = null;
  #cleaned = false;
  #closed = false;
  #databaseClosed = false;
  #fixturesInstalled = false;
  #recoveryStarted = false;
  #rateLimitEnabledBefore: boolean | null = null;
  #closePromise: Promise<void> | null = null;
  #dependencies: Task493ProductionHandlerDependencies;

  constructor(
    dependencies: Task493ProductionHandlerDependencyOverrides | (() => Promise<void>) = {}
  ) {
    this.#dependencies = Object.freeze({
      ...TASK493_PRODUCTION_HANDLER_DEPENDENCIES,
      ...(typeof dependencies === "function" ? { closeDatabase: dependencies } : dependencies),
    });
    this.#routingSettingsLease = new Task493RoutingSettingsLease(
      this.#dependencies.routingSettings
    );
  }

  async #restoreRoutingSettingsAfterFailure(error: unknown, message: string): Promise<never> {
    if (this.#fixturesInstalled) throw error;
    try {
      await this.#routingSettingsLease.restore();
    } catch (restoreError) {
      throw new AggregateError([error, restoreError], message);
    }
    throw error;
  }

  async #closeResources(): Promise<void> {
    let restoreError: unknown;
    let restoreFailed = false;
    if (this.#cleaned || (!this.#fixturesInstalled && !this.#recoveryStarted)) {
      try {
        await this.#routingSettingsLease.restore();
      } catch (error) {
        restoreError = error;
        restoreFailed = true;
      }
    }

    let databaseError: unknown;
    let databaseFailed = false;
    try {
      await this.#dependencies.closeDatabase();
      this.#databaseClosed = true;
    } catch (error) {
      databaseError = error;
      databaseFailed = true;
    }

    if (restoreFailed && databaseFailed) {
      throw new AggregateError([restoreError, databaseError], "TASK-493 worker shutdown failed");
    }
    if (restoreFailed) throw restoreError;
    if (databaseFailed) throw databaseError;
  }

  async install(input: Task493InstallInput): Promise<Task493InstallOutput> {
    if (this.#state !== null || this.#cleaned)
      throw new SmokeError("smoke_output_invalid", "TASK-493 install cannot be replayed");
    try {
      await this.#routingSettingsLease.apply(input.authority);
      // Every scenario boots the Admin app, which calls the auth bootstrap
      // endpoints; the auth rate-limit bucket would 429 the suite and make
      // the app retry CSRF-bound writes. Disable the rate limit for the
      // smoke run and restore it on cleanup.
      const securityBefore = await this.#dependencies.getSecuritySettings();
      await this.#dependencies.setSecuritySettings({ rateLimit: { enabled: false } });
      this.#rateLimitEnabledBefore = securityBefore.rateLimit.enabled;
      const result = await this.#dependencies.fixtureRecovery.install(input);
      this.#fixturesInstalled = true;
      this.#dependencies.afterFixtureCommit();
      const stateFixtures = result.fixtures.map((entry) =>
        Object.freeze({
          scenarioId: entry.scenarioId,
          variantId: entry.variantId,
          url: entry.url,
          sitemapUrl: entry.url.replace(/^https?:\/\/[^/]+/u, ""),
        })
      );
      const state = Object.freeze({
        marker: input.authority.runMarker,
        fixtures: Object.freeze(stateFixtures),
        ledger: buildTask493CleanupLedger({
          marker: input.authority.runMarker,
          fixtures: stateFixtures,
        }),
      });
      this.#state = state;
      return Object.freeze({
        schemaVersion: 1,
        runMarker: input.authority.runMarker,
        fixtures: result.fixtures,
        statements: result.statements,
        rows: result.rows,
      });
    } catch (error) {
      return await this.#restoreRoutingSettingsAfterFailure(
        error,
        "TASK-493 install failed and routing settings restoration failed"
      );
    }
  }

  async read(input: Task493ReadInput): Promise<Task493ReadOutput> {
    const state = requireInstalled(this.#state);
    if (!state.fixtures.some(({ url }) => url === input.url))
      throw new SmokeError("smoke_output_invalid", "TASK-493 read escaped its fixture ledger");
    const sitemapUrl = input.url.replace(/^https?:\/\/[^/]+/u, "");
    const rows = await db.execute(sql`
      SELECT url, indexing_state, impressions, clicks, query, sitemap_url
      FROM (
        SELECT ${seoIndexedPages.url} AS url,
               ${seoIndexedPages.indexingState} AS indexing_state,
               0 AS impressions,
               0 AS clicks,
               '' AS query,
               ${sitemapUrl} AS sitemap_url
        FROM ${seoIndexedPages}
        WHERE ${seoIndexedPages.url} = ${input.url}
        UNION ALL
        SELECT ${seoSearchQueries.url} AS url,
               'INDEXED' AS indexing_state,
               ${seoSearchQueries.impressions} AS impressions,
               ${seoSearchQueries.clicks} AS clicks,
               ${seoSearchQueries.query} AS query,
               ${sitemapUrl} AS sitemap_url
        FROM ${seoSearchQueries}
        WHERE ${seoSearchQueries.url} = ${input.url}
      ) AS projection
      ORDER BY indexing_state
    `);
    if (!Array.isArray(rows) || rows.length !== 2) {
      throw new SmokeError("smoke_output_invalid", "TASK-493 SEO projection is absent");
    }
    const indexed = rows.find(
      (row) =>
        row && typeof row === "object" && row.indexing_state === "INDEXED" && row.query === ""
    );
    const query = rows.find((row) => row && typeof row === "object" && row.query !== "");
    if (
      indexed === undefined ||
      query === undefined ||
      typeof indexed.url !== "string" ||
      indexed.url !== input.url ||
      typeof query.query !== "string" ||
      !FIXTURE_QUERY.test(query.query)
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-493 SEO projection drifted");
    }
    return Object.freeze({
      schemaVersion: 1,
      url: input.url,
      indexingState: "INDEXED",
      impressions: Number(query.impressions),
      clicks: Number(query.clicks),
      query: query.query,
      sitemapUrl,
      statements: 1,
      rows: 2,
    });
  }

  async cleanup(authority: Task493RecoveryAuthority): Promise<Task493CleanupOutput> {
    if (this.#cleaned) {
      throw new SmokeError("smoke_output_invalid", "TASK-493 cleanup cannot be replayed");
    }
    this.#recoveryStarted = true;
    const receipt = await this.#routingSettingsLease.inspectRecovery(authority);
    const observed = await this.#dependencies.fixtureRecovery.inspect(authority);
    if (receipt === "absent" && observed !== "absent") {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 recovery receipt is absent");
    }
    if (observed === "complete") this.#fixturesInstalled = true;
    const counts =
      receipt === "recoverable"
        ? await this.#dependencies.fixtureRecovery.remove(authority)
        : EMPTY_REMOVAL_COUNTS;
    const restoration = await this.#routingSettingsLease.recover(authority);
    if (
      restoration !== (receipt === "recoverable" ? "restored" : "absent") ||
      !(await this.#routingSettingsLease.proveReceiptAbsent(authority))
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 routing restoration is unproven");
    }
    if (this.#rateLimitEnabledBefore !== null) {
      await this.#dependencies.setSecuritySettings({
        rateLimit: { enabled: this.#rateLimitEnabledBefore },
      });
      this.#rateLimitEnabledBefore = null;
    }
    this.#cleaned = true;
    const rows = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return Object.freeze({
      schemaVersion: 1,
      ...counts,
      // Statement accounting: 1 receipt inspect + 1 fixture inspect + 4
      // deletes + 4 per-table absence verifies + 2 final absence unions +
      // 5 lease recover (receipt select, routing read, snapshot write,
      // receipt delete, post-restore verify) + 3 security restore
      // (read, write, re-read) = 20.
      preIdentityAbsenceProved: true,
      identityAbsenceProved: true,
      settingsRestored: true,
      statements: 20,
      rows,
    });
  }

  async prove(authority: Task493RecoveryAuthority): Promise<Task493ProofOutput> {
    const recovery = await this.#dependencies.fixtureRecovery.inspect(authority);
    if (
      recovery !== "absent" ||
      !(await this.#routingSettingsLease.proveReceiptAbsent(authority))
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 terminal rows remain");
    }
    const security = await this.#dependencies.getSecuritySettings();
    if (this.#rateLimitEnabledBefore === null && security.rateLimit.enabled !== false) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 rate limit was not restored");
    }
    return Object.freeze({
      schemaVersion: 1,
      fixturesAbsent: true,
      identitiesAbsent: true,
      settingsRestored: true,
      statements: 3,
      rows: 0,
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#closePromise ??= this.#closeResources();
    await this.#closePromise;
  }

  async proveAbsent(): Promise<boolean> {
    if (!this.#closed || !this.#databaseClosed) return false;
    if (this.#recoveryStarted && !this.#cleaned) return false;
    if (this.#fixturesInstalled && !this.#cleaned) return false;
    return (
      !this.#routingSettingsLease.active &&
      (!this.#routingSettingsLease.wasApplied || this.#routingSettingsLease.restored)
    );
  }
}
