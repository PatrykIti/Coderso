import { describe, expect, test } from "bun:test";

import { InventoryError, scanSourceTextOrThrow } from "../../scripts/task-551-query-inventory";

function expectScanFailure(text: string, file = "core/services/dynamic-capability-route.ts"): void {
  try {
    scanSourceTextOrThrow({ file, text });
  } catch (error) {
    expect(error).toBeInstanceOf(InventoryError);
    expect(error instanceof InventoryError ? error.code : "").toBe("query_inventory_scan_invalid");
    expect(error instanceof Error ? error.message : "").toMatch(/^query_inventory_scan_invalid:/);
    return;
  }
  throw new Error("Expected query_inventory_scan_invalid");
}

describe("TASK-551 L01 literal dynamic capability routes", () => {
  test("keeps direct literal PostgreSQL, Drizzle, and session capabilities inventory-visible", () => {
    const records = scanSourceTextOrThrow({
      file: "core/services/direct-dynamic-capabilities.ts",
      text: [
        'export async function runPostgres() { const { default: pg } = await import("postgres"); return pg("connection"); }',
        'export async function runDrizzle(sql: unknown) { const { drizzle } = await import("drizzle-orm/postgres-js"); return drizzle(sql); }',
        'export async function runSession() { const { withSessionDatabaseClient } = await import("../db/sessionClient"); return withSessionDatabaseClient("task", async (client) => client.execute()); }',
        'export async function runNamedDbFactory() { const load = async () => { const { db } = await import("../db/client"); return db; }; const executor = await load(); return executor.select(); }',
        'export async function runDbFactory() { const executor = await (async () => { const { db } = await import("../db/client"); return db; })(); return executor.select(); }',
      ].join("\n"),
    });

    expect(records.map((record) => record.caller.operation).sort()).toEqual([
      "drizzle",
      "execute",
      "import",
      "import",
      "import",
      "import",
      "import",
      "postgres",
      "select",
      "select",
    ]);
  });

  test("rejects scalar and object factory wrappers that the classifier cannot inventory", () => {
    for (const text of [
      'export async function run() { const load = async () => { const { default: pg } = await import("postgres"); return pg; }; const create = await load(); return create("connection"); }',
      'export async function run() { const create = await (async () => { const { default: pg } = await import("postgres"); return pg; })(); return create("connection"); }',
      'export async function run(sql: unknown) { const load = async () => { const { drizzle } = await import("drizzle-orm/postgres-js"); return drizzle; }; const create = await load(); return create(sql); }',
      'export async function run(sql: unknown) { const create = await (async () => { const { drizzle } = await import("drizzle-orm/postgres-js"); return drizzle; })(); return create(sql); }',
      'export async function run() { const load = async () => { const { default: pg } = await import("postgres"); return { pg }; }; const { pg: create } = await load(); return create("connection"); }',
      'export async function run(sql: unknown) { const load = async () => { const { drizzle } = await import("drizzle-orm/postgres-js"); return { drizzle }; }; const { drizzle: create } = await load(); return create(sql); }',
      'export async function run() { const load = async () => { const { withSessionDatabaseClient } = await import("../db/sessionClient"); return { withSessionDatabaseClient }; }; const { withSessionDatabaseClient } = await load(); return withSessionDatabaseClient("task", async (client) => client.execute()); }',
      'export async function run() { const { withSessionDatabaseClient } = await (async () => { const { withSessionDatabaseClient } = await import("../db/sessionClient"); return { withSessionDatabaseClient }; })(); return withSessionDatabaseClient("task", async (client) => client.execute()); }',
      'async function load() { const { db } = await import("../db/client"); return db; } const pending = load(); export async function x() { const runner = await pending; return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } const pending = load(); export async function x() { return (await pending).select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load()); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await ((load())); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load() as Promise<unknown>); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await load()!; return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load() satisfies Promise<unknown>); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load)(); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load as typeof load)(); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load!)(); return runner.select(); }',
      'async function load() { const { db } = await import("../db/client"); return db; } export async function x() { const runner = await (load satisfies typeof load)(); return runner.select(); }',
    ])
      expectScanFailure(text);
  });

  test("rejects type-shaped object factory containers instead of silently omitting their database operation", () => {
    for (const dependencyType of [
      "Primary | Other",
      "Primary | {}",
      "Primary & {}",
      "Primary",
      "Primary | Primary",
    ])
      expectScanFailure(
        [
          'import type { db } from "../db/client";',
          "type Primary = { db: typeof db };",
          "type Other = { db: { select(): unknown } };",
          `type Deps = ${dependencyType};`,
          'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
          "export async function run(deps: Deps) { const runtime = deps ?? await build(); return runtime.db.select(); }",
        ].join("\n")
      );

    expectScanFailure(
      [
        'import type { db } from "../db/client";',
        "interface Deps { db: typeof db; }",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "export async function run(deps: Deps) { const runtime = deps ?? await build(); return runtime.db.select(); }",
      ].join("\n")
    );

    const classifierVisible = scanSourceTextOrThrow({
      file: "core/services/classifier-visible-dependency.ts",
      text: [
        'import type { db } from "../db/client";',
        "type Deps = { db: typeof db; };",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "export async function run(deps: Deps) { const runtime = deps ?? await build(); return runtime.db.select(); }",
      ].join("\n"),
    });
    expect(classifierVisible.map((record) => record.caller.operation).sort()).toEqual([
      "import",
      "select",
    ]);

    expectScanFailure(
      [
        'import type { db } from "../db/client";',
        'import type pg from "postgres";',
        "type Deps = { db: typeof db; pg: typeof pg; };",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        'export async function run(deps: Deps) { const runtime = deps ?? (await build() as Deps); return runtime.pg("connection"); }',
      ].join("\n")
    );

    expectScanFailure(
      [
        'import type { db } from "../db/client";',
        'import type pg from "postgres";',
        "type Pg = typeof pg;",
        "type Deps = { db: typeof db; pg: Pg; };",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        'export async function run(deps: Deps) { const runtime = deps ?? (await build() as Deps); return runtime.pg("connection"); }',
      ].join("\n")
    );

    for (const [propertyType, expression] of [
      ["() => typeof pg", 'runtime.candidate()("connection")'],
      ["() => Pg", 'runtime.candidate()("connection")'],
      ["() => any", 'runtime.candidate()("connection")'],
      ["() => unknown", '(runtime.candidate() as typeof pg)("connection")'],
    ])
      expectScanFailure(
        [
          'import type { db } from "../db/client";',
          'import type pg from "postgres";',
          "type Pg = typeof pg;",
          `type Deps = { db: typeof db; candidate: ${propertyType}; };`,
          'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
          `export async function run(deps: Deps) { const runtime = deps ?? (await build() as Deps); return ${expression}; }`,
        ].join("\n")
      );

    expect(
      scanSourceTextOrThrow({
        file: "core/services/seo/sitemapSubmissionService.ts",
        text: [
          'import type { db } from "../../db/client";',
          'import type { GscClient } from "./gscClient";',
          "type SitemapSubmissionDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; };",
          'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
          'export async function run(deps: SitemapSubmissionDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as SitemapSubmissionDeps); const client = await runtimeDeps.getGscClient("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined; }',
        ].join("\n"),
      })
    ).toEqual([]);

    const gscLookalike = (call: string) =>
      [
        'import type { db } from "../../db/client";',
        'import type { GscClient } from "./gscClient";',
        "type SitemapSubmissionDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; };",
        'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
        `export async function run(deps: SitemapSubmissionDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as SitemapSubmissionDeps); return ${call}; }`,
      ].join("\n");
    expectScanFailure(gscLookalike('runtimeDeps.getGscClient("webmasters")'));
    expectScanFailure(
      gscLookalike('runtimeDeps.getGscClient("unapproved")'),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscLookalike('(runtimeDeps.getGscClient)("webmasters")'),
      "core/services/seo/sitemapSubmissionService.ts"
    );

    expect(
      scanSourceTextOrThrow({
        file: "core/services/seo/gscSyncService.ts",
        text: [
          'import type { db } from "../../db/client";',
          'import type { GscClient } from "./gscClient";',
          'import type { SitemapEntry } from "./sitemapService";',
          "type GscSyncDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; collectSitemapUrls: () => Promise<SitemapEntry[]>; };",
          'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
          'export async function run(deps: GscSyncDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as GscSyncDeps); const client = await runtimeDeps.getGscClient("webmasters.readonly"); await client.request("GET", encodeURIComponent(client.siteUrl)); const maxUrls = 1; const urls = (await runtimeDeps.collectSitemapUrls()).slice(0, maxUrls); for (const entry of urls) void entry; return { total: urls.length }; }',
        ].join("\n"),
      })
    ).toEqual([]);

    expect(
      scanSourceTextOrThrow({
        file: "core/services/non-db-dependency-property.ts",
        text: [
          'import type { db } from "../db/client";',
          "type Deps = { db: typeof db; log: () => void; };",
          'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
          "export async function run(deps: Deps) { const runtime = deps ?? (await build() as Deps); runtime.log(); return undefined; }",
        ].join("\n"),
      })
    ).toEqual([]);

    for (const text of [
      'import type pg from "postgres"; const load = async () => { const { default: pg } = await import("postgres"); return { pg }; }; const run = (value: typeof pg) => value("connection"); export async function x(deps?: { pg: typeof pg }) { const runtime = deps ?? await load(); return run(runtime.pg); }',
      'import type { withSessionDatabaseClient } from "../db/sessionClient"; const load = async () => { const { withSessionDatabaseClient } = await import("../db/sessionClient"); return { withSessionDatabaseClient }; }; const run = (value: typeof withSessionDatabaseClient) => value("task", async (client) => client.execute()); export async function x(deps?: { withSessionDatabaseClient: typeof withSessionDatabaseClient }) { const runtime = deps ?? await load(); return run(runtime.withSessionDatabaseClient); }',
    ])
      expectScanFailure(text);
  });

  test("rejects GSC type, result, and descendant impersonation routes", () => {
    const gscSource = (
      depsType: string,
      body: string,
      clientImport = 'import type { GscClient } from "./gscClient";',
      preamble = ""
    ): string =>
      [
        'import type { db } from "../../db/client";',
        clientImport,
        preamble,
        depsType,
        'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
        `export async function run(deps: SitemapSubmissionDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as SitemapSubmissionDeps); ${body} }`,
      ].join("\n");
    const deps =
      "type SitemapSubmissionDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; };";
    const realUse =
      'const client = await runtimeDeps.getGscClient("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined;';
    const resultUse =
      'const client = await runtimeDeps.getGscClient("webmasters.readonly"); const payload = await client.request("GET", `sites/${encodeURIComponent(client.siteUrl)}/sitemaps`); await applySitemapStatusPayload(runtimeDeps.db, payload); return undefined;';
    const sink = (body: string) =>
      `const applySitemapStatusPayload = async (runtimeDb: typeof db, payload: unknown): Promise<void> => { ${body} await runtimeDb.select(); };`;

    expectScanFailure(
      gscSource(
        "type SitemapSubmissionDeps = { db: typeof db; getGscClient: <GscClient>(scope?: string) => Promise<GscClient>; };",
        'return (await runtimeDeps.getGscClient<typeof db>("webmasters")).select();'
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscSource(deps, realUse, 'import type { Other as GscClient } from "./gscClient";'),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscSource(deps, realUse, undefined, "type Promise<T> = typeof db;"),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscSource(deps, realUse),
      "core/services/seo/sitemapSubmissionServiceLookalike.ts"
    );
    expectScanFailure(
      gscSource(
        "type SitemapSubmissionDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; getGscClient: () => Promise<GscClient>; };",
        realUse
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );

    for (const body of [
      'const client = await (runtimeDeps.getGscClient)("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined;',
      'const client = await runtimeDeps.getGscClient!("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined;',
      'const client = await runtimeDeps.getGscClient?.("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined;',
      'const client = await (runtimeDeps as SitemapSubmissionDeps).getGscClient("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined;',
      'return (await runtimeDeps.getGscClient("webmasters") as unknown as typeof db).select();',
      'const client = await runtimeDeps.getGscClient("webmasters"); return (client as unknown as typeof db).select();',
      'const client = await runtimeDeps.getGscClient<typeof db>("webmasters"); await client.request("GET", encodeURIComponent(client.siteUrl)); return undefined;',
      'const client = await runtimeDeps.getGscClient("webmasters"); return (await client.request("GET", encodeURIComponent(client.siteUrl)) as unknown as typeof db).select();',
      'const client = await runtimeDeps.getGscClient("webmasters"); const payload = await client.request("GET", encodeURIComponent(client.siteUrl)); const alias = payload; return (alias as unknown as typeof db).select();',
      'const client = await runtimeDeps.getGscClient("webmasters"); const request = client.request; return (request as unknown as typeof db).select();',
      'const client = await runtimeDeps.getGscClient("webmasters"); const runner = client.siteUrl as unknown as typeof db; return runner.select();',
      'const client = await runtimeDeps.getGscClient("webmasters"); const runner = encodeURIComponent(client.siteUrl) as unknown as typeof db; return runner.select();',
      'const client = await runtimeDeps.getGscClient("webmasters"); return client.request("GET", encodeURIComponent(client.siteUrl)).then((value) => (value as unknown as typeof db).select());',
      'const client = await runtimeDeps.getGscClient("webmasters"); const result = await client.inspectUrl("https://example.test"); return (result as unknown as typeof db).select();',
    ])
      expectScanFailure(gscSource(deps, body), "core/services/seo/sitemapSubmissionService.ts");

    for (const body of [
      "await (payload as typeof db).select();",
      "await (payload as unknown as typeof db).select();",
      "const runner: typeof db = payload; await runner.select();",
      "await (payload as any).select();",
      "const runner: any = payload; await runner.select();",
      "const alias = payload; await (alias as typeof db).select();",
      "const { runner } = payload as any; await runner.select();",
      "const chosen = true ? payload : undefined; await (chosen as typeof db).select();",
      "const identity = <T>(value: T): T => value; await (identity(payload) as typeof db).select();",
      "const receiver = { payload }; await (receiver.payload as typeof db).select();",
      "const nested = await Promise.resolve(payload); await (nested as typeof db).select();",
      "const use = (value: typeof db) => value.select(); await use(payload);",
      "const use = (value: typeof db) => value.select(); const alias = use; await alias(payload);",
      "const use = (value: typeof db) => value.select(); const { use: alias } = { use }; await alias(payload);",
      "const use = (value: typeof db) => value.select(); const alias = true ? use : use; await alias(payload);",
      "const use = (value: typeof db) => value.select(); const receiver = { use }; await receiver.use(payload);",
      "const receiver = { use: (value: typeof db) => value.select() }; await receiver.use(payload);",
      "const factory = () => (value: typeof db) => value.select(); await factory()(payload);",
      "const use = (value: any) => value.select(); await use(payload);",
      "const identity = <T>(value: T): T => value; await identity<typeof db>(payload).select();",
      "const tag = <T>(strings: TemplateStringsArray, value: unknown): T => value as T; const runner = tag<typeof db>`payload:${payload}`; await runner.select();",
      "await ((value: typeof db) => value.select())(payload);",
      "const use = (value: typeof db) => value.select(); const invoke = (callback: (value: typeof db) => unknown, value: unknown) => callback(value); await invoke(use, payload);",
    ])
      expectScanFailure(
        gscSource(deps, resultUse, undefined, sink(body)),
        "core/services/seo/sitemapSubmissionService.ts"
      );

    expect(
      scanSourceTextOrThrow({
        file: "core/services/seo/sitemapSubmissionService.ts",
        text: gscSource(deps, resultUse, undefined, sink("void payload;")),
      })
        .map((record) => record.caller.operation)
        .sort()
    ).toEqual(["import", "select"]);

    expectScanFailure(
      gscSource(
        deps,
        resultUse,
        undefined,
        "const realSink = async (runtimeDb: typeof db, payload: unknown): Promise<void> => { void payload; await runtimeDb.select(); }; const applySitemapStatusPayload = realSink;"
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscSource(
        deps,
        resultUse,
        undefined,
        "function applySitemapStatusPayload(runtimeDb: typeof db, payload: unknown): Promise<void> { void payload; return runtimeDb.select() as unknown as Promise<void>; }"
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscSource(
        deps,
        resultUse,
        'import type { GscClient } from "./gscClient"; import { applySitemapStatusPayload } from "./payloadSink";'
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );
    expectScanFailure(
      gscSource(deps, resultUse, undefined, sink("void payload;")).replace(
        'import type { db } from "../../db/client";',
        'import type { db } from "../../db/fake";'
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );

    for (const alias of [
      "type DatabaseExecutor = typeof db; const runner = payload as DatabaseExecutor; await runner.select();",
      "type DatabaseExecutor = any; const runner = payload as DatabaseExecutor; await runner.select();",
    ])
      expectScanFailure(
        gscSource(deps, resultUse, undefined, sink(alias)),
        "core/services/seo/sitemapSubmissionService.ts"
      );

    expectScanFailure(
      gscSource(
        deps,
        resultUse,
        undefined,
        [
          'import type { DatabaseExecutor } from "./databaseTypes";',
          sink("const runner = payload as unknown as DatabaseExecutor; await runner.select();"),
        ].join("\n")
      ),
      "core/services/seo/sitemapSubmissionService.ts"
    );

    expectScanFailure(
      [
        'import type { db } from "../../db/client";',
        'import type { GscClient } from "./gscClient";',
        "type GscSyncDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; };",
        'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
        'const extractRows = (payload: unknown): unknown[] => { if (payload === null || typeof payload !== "object") return []; const rows = (payload as { rows?: unknown }).rows; return Array.isArray(rows) ? rows : []; };',
        'export async function run(deps: GscSyncDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as GscSyncDeps); const client = await runtimeDeps.getGscClient("webmasters.readonly"); const payload = await client.request("POST", `sites/${encodeURIComponent(client.siteUrl)}/searchAnalytics/query`); const rows = extractRows(payload); return (rows as typeof db).select(); }',
      ].join("\n"),
      "core/services/seo/gscSyncService.ts"
    );

    const syncSource = [
      'import type { db } from "../../db/client";',
      'import type { GscClient } from "./gscClient";',
      'import type { SitemapEntry } from "./sitemapService";',
      "type GscSyncDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; collectSitemapUrls: <SitemapEntry>() => Promise<SitemapEntry[]>; };",
      'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
      'export async function run(deps: GscSyncDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as GscSyncDeps); const client = await runtimeDeps.getGscClient("webmasters.readonly"); await client.request("GET", encodeURIComponent(client.siteUrl)); const maxUrls = 1; const urls = (await runtimeDeps.collectSitemapUrls<typeof db>()).slice(0, maxUrls); for (const entry of urls) void entry; return { total: urls.length }; }',
    ].join("\n");
    expectScanFailure(syncSource, "core/services/seo/gscSyncService.ts");

    expectScanFailure(
      [
        'import type { db } from "../db/client";',
        "type Deps = { db: typeof db; log: () => void; };",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "export async function run(deps: Deps) { const runtime = deps ?? (await build() as Deps); return (await runtime.log() as unknown as typeof db).select(); }",
      ].join("\n")
    );
  });

  test("rejects unproven factory return and opaque type manufacture before an untracked query", () => {
    const route = (body: string, extraImports = "") =>
      [
        'import type { db } from "../db/client";',
        extraImports,
        "type Deps = { db: typeof db };",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "export async function run(deps: Deps, payload: any) { const runtime = deps ?? await build(); " +
          body +
          " }",
      ].join("\n");
    for (const body of [
      "const factory = (): typeof db => payload; const runner = factory(); await runtime.db.select(); return runner.select();",
      "function factory(): typeof db { return payload; } const runner = factory(); await runtime.db.select(); return runner.select();",
      "type Db = typeof db; const factory = (): Db => payload; const runner = factory(); await runtime.db.select(); return runner.select();",
      "const factory = async (): Promise<typeof db> => payload; const runner = await factory(); await runtime.db.select(); return runner.select();",
      "const holder = { factory(): typeof db { return payload; } }; const runner = holder.factory(); await runtime.db.select(); return runner.select();",
      "class Holder { factory(): typeof db { return payload; } } const runner = new Holder().factory(); await runtime.db.select(); return runner.select();",
      "const holder: { factory: () => typeof db } = { factory: () => payload }; const runner = holder.factory(); await runtime.db.select(); return runner.select();",
      "interface Factory { get(): typeof db; } const factory = payload as unknown as Factory; await runtime.db.select(); return factory.get().select();",
      "const use = <T extends typeof db>(value: unknown): T => value as unknown as T; const runner = use(payload); await runtime.db.select(); return runner.select();",
      'type DatabaseExecutor = typeof import("../db/client").db; const runner = payload as DatabaseExecutor; await runtime.db.select(); return runner.select();',
      "type Capability = string; { type Capability = typeof db; const runner = payload as Capability; await runtime.db.select(); return runner.select(); }",
    ])
      expectScanFailure(route(body));

    expectScanFailure(
      route(
        "const runner = payload as unknown as DatabaseExecutor; await runtime.db.select(); return runner.select();",
        'import type { DatabaseExecutor } from "./databaseTypes";'
      )
    );
    expectScanFailure(
      route(
        "const runner = payload as Foo; await runtime.db.select(); return runner.select();",
        'import type { Foo } from "./types";'
      )
    );
    for (const body of [
      "const holder = { factory(): Foo { return payload; } }; const runner = holder.factory(); await runtime.db.select(); return runner.select();",
      "class Holder { factory(): Foo { return payload; } } const runner = new Holder().factory(); await runtime.db.select(); return runner.select();",
      "const holder = { factory: (): Foo => payload }; const runner = holder.factory(); await runtime.db.select(); return runner.select();",
      "const invoke = (callback: () => Foo) => callback(); const runner = invoke(() => payload); await runtime.db.select(); return runner.select();",
      "const invoke = <T>(callback: () => T) => callback(); const runner = invoke<Foo>(() => payload); await runtime.db.select(); return runner.select();",
      "const factory = (): Foo => payload; const runner = factory.bind(null)(); await runtime.db.select(); return runner.select();",
      "const tag = <T>(strings: TemplateStringsArray): T => payload as T; const runner = tag<Foo>`payload`; await runtime.db.select(); return runner.select();",
    ])
      expectScanFailure(route(body, 'import type { Foo } from "./types";'));
    for (const body of [
      "const runner = payload as { select(): unknown }; await runtime.db.select(); return runner.select();",
      "const runner = payload; await runtime.db.select(); return runner.select();",
    ])
      expectScanFailure(route(body));
    expectScanFailure(
      route(
        "const unsafe = (): Foo => payload; const safe = () => runtime.db; const factory = true ? unsafe : safe; const runner = factory(); await runtime.db.select(); return runner.select();",
        'import type { Foo } from "./types";'
      )
    );

    const tracked = scanSourceTextOrThrow({
      file: "core/services/tracked-typed-factory.ts",
      text: [
        'import type { db } from "../db/client";',
        'const load = async (): Promise<typeof db> => { const { db } = await import("../db/client"); return db; };',
        "export async function run() { const runner = await load(); return runner.select(); }",
      ].join("\n"),
    });
    expect(tracked.map((record) => record.caller.operation).sort()).toEqual(["import", "select"]);
  });

  test("rejects opaque operation receiver provenance through wrappers and exact GSC sinks", () => {
    const preamble = [
      "interface Foo { select(): unknown; query: { users: { findMany(): unknown } }; readonly self?: Foo; }",
      "type Deps = { db: typeof db };",
      'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
    ].join("\n");
    const route = (setup: string, invoke: string) =>
      [
        'import type { db } from "../db/client";',
        preamble,
        "export async function run(deps: Deps, payload: unknown) { const runtime = deps ?? await build();",
        setup,
        "await runtime.db.select();",
        `return ${invoke}; }`,
      ].join("\n");
    const gscRoute = (setup: string, invoke: string) =>
      [
        'import type { db } from "../../db/client";',
        'import type { GscClient } from "./gscClient";',
        "interface Foo { select(): unknown; query: { users: { findMany(): unknown } }; readonly self?: Foo; }",
        "type SitemapSubmissionDeps = { db: typeof db; getGscClient: (scope?: string) => Promise<GscClient>; };",
        'const buildDefaultDeps = async () => { const { db } = await import("../../db/client"); return { db }; };',
        "const applySitemapStatusPayload = async (runtimeDb: typeof db, payload: unknown): Promise<void> => {",
        setup,
        "await runtimeDb.select();",
        `await ${invoke}; };`,
        'export async function run(deps: SitemapSubmissionDeps) { const runtimeDeps = deps ?? (await buildDefaultDeps() as SitemapSubmissionDeps); const client = await runtimeDeps.getGscClient("webmasters.readonly"); const payload = await client.request("GET", `sites/${encodeURIComponent(client.siteUrl)}/sitemaps`); await applySitemapStatusPayload(runtimeDeps.db, payload); return undefined; }',
      ].join("\n");
    const cases = [
      ["computed member", "const runner = payload as Foo;", 'runner["select"]()'],
      [
        "computed const member",
        'const runner = payload as Foo; const key = "select";',
        "runner[key]()",
      ],
      [
        "computed const alias member",
        'const runner = payload as Foo; const key = "select"; const alias = key;',
        "runner[alias]()",
      ],
      ["query chain", "const runner = payload as Foo;", "runner.query.users.findMany()"],
      [
        "extracted member",
        "const runner = payload as Foo; const select = runner.select;",
        "select()",
      ],
      [
        "destructured member",
        "const runner = payload as Foo; const { select } = runner;",
        "select()",
      ],
      ["call forwarding", "const runner = payload as Foo;", "runner.select.call(runner)"],
      [
        "bind forwarding",
        "const runner = payload as Foo; const select = runner.select.bind(runner);",
        "select()",
      ],
      [
        "opaque constructor",
        "const Factory = payload as unknown as { new (): Foo }; const runner = new Factory();",
        "runner.select()",
      ],
      [
        "Promise argument",
        "const runner = await Promise.resolve(payload as Foo);",
        "runner.select()",
      ],
      [
        "Promise callback",
        "const runner = await Promise.resolve(payload).then(() => payload as Foo);",
        "runner.select()",
      ],
      [
        "array element",
        "const values = [payload as Foo]; const runner = values[0]!;",
        "runner.select()",
      ],
      ["logical flow", "const runner = false || (payload as Foo);", "runner.select()"],
    ] as const;

    for (const [name, setup, invoke] of cases) {
      expectScanFailure(route(setup, invoke), `core/services/opaque-${name}.ts`);
      expectScanFailure(gscRoute(setup, invoke), "core/services/seo/sitemapSubmissionService.ts");
    }

    expect(
      scanSourceTextOrThrow({
        file: "core/services/opaque-unknown-computed-control.ts",
        text: [
          'import type { db } from "../db/client";',
          "type Deps = { db: typeof db };",
          'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
          "type Callbacks = Record<string, () => unknown>;",
          'export async function run(deps: Deps) { const runtime = deps ?? await build(); const callbacks: Callbacks = { select: () => undefined }; const key: string = Math.random() > 0.5 ? "select" : "other"; await runtime.db.select(); return callbacks[key](); }',
        ].join("\n"),
      }).map((record) => record.caller.operation)
    ).toEqual(["import", "select"]);
  });

  test("preserves an explicit typed handoff but rejects a callback closure that returns the capability", () => {
    const accepted = scanSourceTextOrThrow({
      file: "core/services/typed-dynamic-handoff.ts",
      text: [
        'import type { db } from "../db/client";',
        "type Deps = { db: typeof db };",
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "const query = async (runtimeDb: typeof db) => runtimeDb.select();",
        "export async function run(deps?: Deps) { const runtime = deps ?? await build(); return query(runtime.db); }",
      ].join("\n"),
    });
    expect(accepted.map((record) => record.caller.operation).sort()).toEqual(["import", "select"]);

    expectScanFailure(
      [
        'import type { db } from "../db/client";',
        "type Deps = { db: typeof db };",
        'const tracked = async () => { const { db } = await import("../db/client"); return { db }; };',
        "const untracked = async (): Promise<Deps> => ({ db: null });",
        "const query = (runtimeDb: typeof db) => runtimeDb.select();",
        "export async function run(deps?: Deps) { void tracked; const runtime = deps ?? await untracked(); return query((runtime as Deps).db); }",
      ].join("\n")
    );

    expectScanFailure(
      [
        'import type { db } from "../db/client";',
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "const use = (runtimeDb: typeof db) => { runtimeDb.select(); return () => runtimeDb; };",
        "export async function run(supplied: unknown) { const deps = supplied ?? await build(); const get = use((deps as { db: typeof db }).db); const runner = get(); return runner.select(); }",
      ].join("\n")
    );
  });

  test("allows only exact tracked object-factory typed-container provenance", () => {
    const source = (initializer: string, factory: string) =>
      [
        'import type { db } from "../db/client";',
        factory,
        "const query = async (runtimeDb: typeof db) => runtimeDb.select();",
        "export async function execute(supplied: unknown) { const deps = " +
          initializer +
          "; return query((deps as { db: typeof db }).db); }",
      ].join("\n");
    const tracked =
      'const build = async () => { const { db } = await import("../db/client"); return { db }; };';
    const untracked =
      'const tracked = async () => { const { db } = await import("../db/client"); return { db }; }; const build = async () => ({ db: null }); void tracked;';
    for (const initializer of ["await build()", "supplied ?? await build()"])
      expect(
        scanSourceTextOrThrow({
          file: "core/services/tracked-container-provenance.ts",
          text: source(initializer, tracked),
        }).map((record) => record.caller.operation)
      ).toEqual(["import", "select"]);
    for (const initializer of ["await build()", "supplied ?? await build()"])
      expectScanFailure(source(initializer, untracked));
  });
});
