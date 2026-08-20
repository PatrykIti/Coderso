// TASK-493-02-L02 security lane: the sitemap submission service must never
// accept attacker-supplied absolute URLs (no SSRF) and must never persist the
// GSC credential or a minted access token to `seo_sitemap_submissions` —
// only status/counts and the own-origin feedpath. The path-guard assertions
// are pure and DB-free; the no-secret-persistence assertions seed rows through
// the service's dependency seam with a stubbed GSC client whose error embeds
// token material, then verify the stored rows stay redacted. DB assertions are
// gated on table availability (0079 DDL).
import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../core/db/client";
import { seoSitemapSubmissions } from "../../core/db/schema";
import type { GscClient } from "../../core/services/seo/gscClient";
import {
  normalizeOwnOriginSitemapPath,
  submitSitemap,
  type SitemapSubmissionDeps,
} from "../../core/services/seo/sitemapSubmissionService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDbAndTables = hasDb && (await hasSeoTables());
const testIfTables = hasDbAndTables ? test : test.skip;

async function canConnect(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function hasSeoTables(): Promise<boolean> {
  try {
    await db.select({ id: seoSitemapSubmissions.id }).from(seoSitemapSubmissions).limit(1);
    return true;
  } catch {
    return false;
  }
}

const FAKE_TOKEN = "eyJhbGciOiJSUzI1NiJ9.fake-signature";
const SITE_URL = "https://sec-test.example/";
const fixturePath = (label: string) => `/sitemap-sec-${label}-${randomUUID()}.xml`;

/**
 * A GSC client whose PUT fails with an error that embeds a minted-token look-
 * alike. The service must redact this down to the machine-readable code and
 * never persist the token material.
 */
const makeTokenLeakingClient = (): GscClient => ({
  siteUrl: SITE_URL,
  request: async () => {
    throw new Error(`gsc_request_failed:401 access_token=${FAKE_TOKEN}`);
  },
  inspectUrl: async () => {
    throw new Error("unexpected inspectUrl call");
  },
});

const buildDeps = (client: GscClient): SitemapSubmissionDeps => ({
  db,
  getGscClient: async () => client,
});

const createdPaths: string[] = [];
const track = (path: string) => {
  createdPaths.push(path);
  return path;
};

afterAll(async () => {
  if (!hasDbAndTables) return;
  const paths = [...new Set(createdPaths)];
  if (paths.length === 0) return;
  await db.delete(seoSitemapSubmissions).where(inArray(seoSitemapSubmissions.sitemapUrl, paths));
});

describe("own-origin sitemap path guard (SSRF)", () => {
  test("rejects attacker-supplied absolute, protocol-relative, and backslash URLs", () => {
    const attacks = [
      "https://evil.example/",
      "http://evil.example/sitemap.xml",
      "//evil.example/sitemap.xml",
      "file:///etc/passwd",
      "file:/etc/passwd",
      "javascript://x",
      "https:\\evil.example\\sitemap.xml",
      "\\\\evil.example\\sitemap.xml",
      "/\\evil.example/sitemap.xml",
      "//evil.example",
    ];
    for (const attack of attacks) {
      expect(() => normalizeOwnOriginSitemapPath(attack), attack).toThrow("sitemap_path_invalid");
    }
  });

  test("accepts only relative own-origin paths", () => {
    expect(normalizeOwnOriginSitemapPath("/sitemap.xml")).toBe("/sitemap.xml");
    expect(normalizeOwnOriginSitemapPath("/blog/sitemap.xml")).toBe("/blog/sitemap.xml");
    expect(normalizeOwnOriginSitemapPath()).toBe("/sitemap.xml");
  });
});

test("submitSitemap rejects an absolute sitemapPath before any GSC call", async () => {
  const calls: Array<{ method: string; path: string }> = [];
  const deps: SitemapSubmissionDeps = {
    db,
    getGscClient: async () => ({
      siteUrl: SITE_URL,
      request: async (method, path) => {
        calls.push({ method, path });
        return null;
      },
      inspectUrl: async () => {
        throw new Error("unexpected inspectUrl call");
      },
    }),
  };

  await expect(
    submitSitemap({ sitemapPath: "https://evil.example/sitemap.xml" }, deps)
  ).rejects.toThrow("sitemap_path_invalid");
  expect(calls).toHaveLength(0);
});

testIfTables(
  "submitSitemap never persists a credential or token to the submission row",
  async () => {
    const feedpath = track(fixturePath("token"));
    await expect(
      submitSitemap({ sitemapPath: feedpath }, buildDeps(makeTokenLeakingClient()))
    ).rejects.toThrow("sitemap_submit_failed");

    const [row] = await db
      .select()
      .from(seoSitemapSubmissions)
      .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
    expect(row).toBeDefined();
    expect(row.status).toBe("error");
    expect(row.lastErrorMessage).toBe("gsc_request_failed:401");
    expect(row.lastErrorMessage ?? "").not.toContain(FAKE_TOKEN);
    expect(row.lastErrorMessage ?? "").not.toContain("access_token");
    expect(row.lastErrorMessage ?? "").not.toContain(SITE_URL);
    expect(row.lastSubmittedAt).toBeNull();
    expect(row.isPending).toBe(false);
    expect(row.warnings).toBe(0);
    expect(row.errors).toBe(0);
    expect(row.urlCount).toBeNull();
  }
);

testIfTables(
  "the submission row persists only status/count/url fields, never secrets",
  async () => {
    const feedpath = track(fixturePath("shape"));
    await expect(
      submitSitemap({ sitemapPath: feedpath }, buildDeps(makeTokenLeakingClient()))
    ).rejects.toThrow("sitemap_submit_failed");

    const [row] = await db
      .select()
      .from(seoSitemapSubmissions)
      .where(eq(seoSitemapSubmissions.sitemapUrl, feedpath));
    expect(row).toBeDefined();

    // No column beyond the documented status/count/url contract may exist; a
    // future secret-bearing column would fail this explicit allowlist.
    expect(Object.keys(row).sort()).toEqual([
      "createdAt",
      "errors",
      "id",
      "isPending",
      "lastDownloadedAt",
      "lastErrorMessage",
      "lastSubmittedAt",
      "sitemapUrl",
      "source",
      "status",
      "updatedAt",
      "urlCount",
      "warnings",
    ]);

    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain("service_account");
    expect(serialized).not.toContain("private_key");
    expect(serialized).not.toContain("client_email");
    expect(serialized).not.toContain(FAKE_TOKEN);
  }
);
