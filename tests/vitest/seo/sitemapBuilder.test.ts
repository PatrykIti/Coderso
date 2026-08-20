import { describe, expect, test } from "vitest";

import { buildSitemapXml } from "../../../core/services/seo/sitemapService";

describe("buildSitemapXml", () => {
  test("emits a valid empty urlset for an empty entry list", () => {
    const xml = buildSitemapXml([], "https://example.com");
    expect(xml).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`
    );
    expect(xml).not.toContain("<url>");
  });

  test("prefixes relative locs with the origin", () => {
    const xml = buildSitemapXml([{ loc: "/about" }], "https://example.com");
    expect(xml).toContain("<loc>https://example.com/about</loc>");
    expect(xml).toContain("<url><loc>https://example.com/about</loc></url>");
  });

  test("keeps absolute locs unchanged", () => {
    const xml = buildSitemapXml([{ loc: "https://cdn.example.com/page" }], "https://example.com");
    expect(xml).toContain("<loc>https://cdn.example.com/page</loc>");
    expect(xml).not.toContain("https://example.comhttps://cdn.example.com/page");
  });

  test("emits lastmod only when present", () => {
    const xml = buildSitemapXml(
      [{ loc: "/a", lastmod: "2026-08-01T10:00:00.000Z" }, { loc: "/b" }],
      "https://example.com"
    );
    expect(xml).toContain("<lastmod>2026-08-01T10:00:00.000Z</lastmod>");
    const bUrl = xml.match(/<url><loc>https:\/\/example\.com\/b<\/loc>([^<]*)<\/url>/);
    expect(bUrl?.[1] ?? "").toBe("");
  });

  test("escapes XML-sensitive characters in loc and lastmod", () => {
    const xml = buildSitemapXml(
      [{ loc: `/search?q=a&b<c>"d'`, lastmod: "2026-08-01T10:00:00.000Z" }],
      "https://example.com"
    );
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;");
    expect(xml).toContain("&gt;");
    expect(xml).toContain("&quot;");
    expect(xml).toContain("&apos;");
    expect(xml).toContain("<loc>https://example.com/search?q=a&amp;b&lt;c&gt;&quot;d&apos;</loc>");
    expect(xml).not.toContain("q=a&b");
    expect(xml).not.toContain("<c>");
    expect(xml).not.toContain('"d');
  });

  test("renders multiple entries in input order", () => {
    const xml = buildSitemapXml(
      [{ loc: "/first" }, { loc: "/second", lastmod: "2026-08-02T00:00:00.000Z" }],
      "https://example.com"
    );
    const firstIndex = xml.indexOf("example.com/first");
    const secondIndex = xml.indexOf("example.com/second");
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });

  test("does not emit lastmod for entries with an empty string lastmod", () => {
    const xml = buildSitemapXml([{ loc: "/a", lastmod: "" }], "https://example.com");
    expect(xml).not.toContain("<lastmod>");
    expect(xml).toContain("<loc>https://example.com/a</loc>");
  });
});
