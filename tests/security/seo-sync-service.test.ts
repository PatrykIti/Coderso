// TASK-493-03-L02: GSC data-sync service security guard (Bun lane).
//
// Verifies the security contract of the sync service without touching the
// database: the window clamp rejects malformed/out-of-range windows BEFORE any
// outbound call, the URL Inspection loop is bounded to at most 50 URLs per run
// with a 429 soft-skip, and the decrypted credential/access token is never
// persisted or logged (the service only ever receives the readonly scope
// string, never the credential; persisted values carry only URLs, query
// strings, and aggregate counts).
import { expect, test, vi } from "bun:test";
import { randomUUID } from "node:crypto";

import type { db as dbClient } from "../../core/db/client";
import type { GscClient, GscInspectionResult } from "../../core/services/seo/gscClient";
import {
  clampInt,
  clampWindow,
  syncIndexedPages,
  syncSearchPerformance,
  type GscSyncDeps,
} from "../../core/services/seo/gscSyncService";

const SECRET_TOKEN = "ya29.super-secret-access-token";
const SITE_URL = "https://security-sync.example/";

const fixtureUrl = (label: string) => `https://security-sync.example/${label}-${randomUUID()}`;

const NAME_SYMBOL = Symbol.for("drizzle:Name");

type RecordedWrite = { table: string; values: unknown[] };

/**
 * Minimal recording DB stub. The service only ever chains
 * `insert(table).values(rows).onConflictDoUpdate({...})`, so a structural stub
 * captures the exact rows the service would persist, letting the test assert
 * that no secret material reaches the write path.
 */
const makeRecordingDb = (): { db: typeof dbClient; writes: RecordedWrite[] } => {
  const writes: RecordedWrite[] = [];
  const insert = (table: unknown) => {
    const tableName =
      table !== null && typeof table === "object"
        ? String((table as Record<symbol, unknown>)[NAME_SYMBOL] ?? "unknown")
        : "unknown";
    const valuesBuilder = (rows: unknown) => {
      const values = Array.isArray(rows) ? rows : [rows];
      writes.push({ table: tableName, values });
      return {
        onConflictDoUpdate: () => ({}),
      };
    };
    return { values: valuesBuilder };
  };
  return { db: { insert } as unknown as typeof dbClient, writes };
};

const makeClient = (
  options: {
    metricsRows?: unknown[];
    queryRows?: unknown[];
    inspections?: Array<GscInspectionResult | Error>;
  } = {}
): {
  client: GscClient;
  requestCalls: Array<{ method: string; path: string; body: unknown }>;
  inspections: { count: number };
} => {
  const requestCalls: Array<{ method: string; path: string; body: unknown }> = [];
  const inspections = { count: 0 };
  const inspectionQueue = [...(options.inspections ?? [])];
  const client: GscClient = {
    siteUrl: SITE_URL,
    request: async (method, path, body) => {
      requestCalls.push({ method, path, body });
      const dims =
        body !== null &&
        typeof body === "object" &&
        Array.isArray((body as { dimensions?: unknown }).dimensions)
          ? (body as { dimensions: unknown[] }).dimensions
          : [];
      if (dims.includes("query")) return { rows: options.queryRows ?? [] };
      return { rows: options.metricsRows ?? [] };
    },
    inspectUrl: async (url) => {
      inspections.count += 1;
      const next = inspectionQueue.shift();
      if (next instanceof Error) throw next;
      return (
        next ?? {
          url,
          indexingState: "UNKNOWN",
          coverageState: null,
          verdict: null,
          pageFetchState: null,
          robotsTxtState: null,
          googleCanonical: null,
          userCanonical: null,
          lastCrawledAt: null,
        }
      );
    },
  };
  return { client, requestCalls, inspections };
};

const metricRow = (url: string, date: string) => ({
  keys: [date, url],
  clicks: 3,
  impressions: 40,
  ctr: 0.075,
  position: 4.1,
});

const queryRow = (url: string, date: string, query: string) => ({
  keys: [date, url, query],
  clicks: 1,
  impressions: 10,
  ctr: 0.1,
  position: 2,
});

const inspection = (url: string, state = "INDEXED"): GscInspectionResult => ({
  url,
  indexingState: state as GscInspectionResult["indexingState"],
  coverageState: "Submitted and indexed",
  verdict: "PASS",
  pageFetchState: "SUCCESSFUL",
  robotsTxtState: "ALLOWED",
  googleCanonical: url,
  userCanonical: url,
  lastCrawledAt: new Date("2026-01-15T10:00:00.000Z"),
});

const deps = (
  client: GscClient,
  recording: ReturnType<typeof makeRecordingDb>,
  urls: string[] = []
): GscSyncDeps => ({
  db: recording.db,
  getGscClient: async (scope) => {
    expect(scope).toBe("webmasters.readonly");
    return client;
  },
  collectSitemapUrls: async () => urls.map((loc) => ({ loc })),
});

const serializeWrites = (writes: RecordedWrite[]): string =>
  JSON.stringify(writes.map((write) => ({ table: write.table, values: write.values })));

test("window clamp rejects malformed, future, and inverted windows before any outbound call", async () => {
  const { client, requestCalls } = makeClient({
    metricsRows: [metricRow("https://never.example/x", "2026-01-01")],
  });
  const recording = makeRecordingDb();

  for (const input of [
    { startDate: "not-a-date" },
    { endDate: "2024/01/01" },
    { startDate: "2024-02-30" },
    { endDate: "2099-01-01" },
    { startDate: "2026-06-01", endDate: "2026-01-01" },
    { startDate: "2020-01-01", endDate: "2024-01-01" },
  ]) {
    await expect(syncSearchPerformance(input, deps(client, recording))).rejects.toThrow(
      "gsc_sync_window_invalid"
    );
  }

  expect(requestCalls).toHaveLength(0);
  expect(recording.writes).toHaveLength(0);
});

test("window clamp never produces a window wider than GSC's 16-month retention", () => {
  const window = clampWindow({ startDate: "2001-01-01", endDate: "2026-01-01" });
  const start = new Date(`${window.startDate}T00:00:00.000Z`);
  const end = new Date(`${window.endDate}T00:00:00.000Z`);
  expect(start.getTime()).toBeGreaterThanOrEqual(end.getTime() - 16 * 31 * 24 * 60 * 60 * 1000);

  const defaultWindow = clampWindow({});
  expect(clampInt(Number.NaN, 1, 50)).toBe(1);
  expect(defaultWindow.startDate <= defaultWindow.endDate).toBe(true);
});

test("URL Inspection loop is bounded to at most 50 URLs per run", async () => {
  const urls = Array.from({ length: 200 }, (_, index) => fixtureUrl(`bulk-${index}`));
  const { client, inspections } = makeClient({
    inspections: urls.slice(0, 50).map((url) => inspection(url)),
  });
  const recording = makeRecordingDb();

  const result = await syncIndexedPages({ maxUrls: 1000 }, deps(client, recording, urls));

  expect(result).toEqual({ inspected: 50, skipped: 0, total: 50 });
  expect(inspections.count).toBe(50);
  expect(recording.writes).toHaveLength(50);
});

test("URL Inspection loop soft-skips the remainder on 429 without failing", async () => {
  const urls = Array.from({ length: 6 }, (_, index) => fixtureUrl(`quota-${index}`));
  const { client, inspections } = makeClient({
    inspections: [
      inspection(urls[0] ?? ""),
      new Error("gsc_request_failed:429"),
      inspection(urls[2] ?? ""),
      inspection(urls[3] ?? ""),
      inspection(urls[4] ?? ""),
      inspection(urls[5] ?? ""),
    ],
  });
  const recording = makeRecordingDb();

  const result = await syncIndexedPages({ maxUrls: 6 }, deps(client, recording, urls));

  expect(result).toEqual({ inspected: 1, skipped: 5, total: 6 });
  expect(inspections.count).toBe(2);
});

test("the credential/access token is never persisted or logged", async () => {
  const url = fixtureUrl("secret-check");
  const { client, requestCalls } = makeClient({
    metricsRows: [metricRow(url, "2026-01-01")],
    queryRows: [queryRow(url, "2026-01-01", "private query")],
  });
  const recording = makeRecordingDb();

  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const result = await syncSearchPerformance(
      { startDate: "2026-01-01", endDate: "2026-01-31" },
      deps(client, recording)
    );

    // Result exposes only aggregate counts.
    expect(JSON.stringify(result)).not.toContain(SECRET_TOKEN);

    // Request payloads carry only the documented search-analytics contract.
    for (const call of requestCalls) {
      expect(JSON.stringify(call.body)).not.toContain(SECRET_TOKEN);
      expect(JSON.stringify(call.body)).not.toContain("token");
    }

    // Persisted rows carry only URLs, query strings, and aggregate counts:
    // the recorded row surface is exactly the documented column set, so no
    // credential/token field can ever reach the write path.
    const serialized = serializeWrites(recording.writes);
    expect(serialized).not.toContain(SECRET_TOKEN);
    const metricKeys = recording.writes
      .filter((write) => write.table === "seo_search_metrics")
      .flatMap((write) =>
        write.values.map((row) =>
          Object.keys(row as object)
            .sort()
            .join(",")
        )
      );
    expect(metricKeys.length).toBeGreaterThan(0);
    expect(
      metricKeys.every((keys) => keys === "clicks,ctr,date,impressions,position,syncedAt,url")
    ).toBe(true);
    const queryKeys = recording.writes
      .filter((write) => write.table === "seo_search_queries")
      .flatMap((write) =>
        write.values.map((row) =>
          Object.keys(row as object)
            .sort()
            .join(",")
        )
      );
    expect(
      queryKeys.every((keys) => keys === "clicks,ctr,date,impressions,position,query,syncedAt,url")
    ).toBe(true);

    // The sync never logs anything (no credential, no payloads).
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
});

test("a 429 soft-skip produces no log output and no secret in the returned result", async () => {
  const url = fixtureUrl("quota-secret");
  const { client } = makeClient({
    inspections: [new Error("gsc_request_failed:429")],
  });
  const recording = makeRecordingDb();

  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const result = await syncIndexedPages({ maxUrls: 3 }, deps(client, recording, [url, url, url]));
    expect(result).toEqual({ inspected: 0, skipped: 3, total: 3 });
    expect(JSON.stringify(result)).not.toContain(SECRET_TOKEN);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
});
