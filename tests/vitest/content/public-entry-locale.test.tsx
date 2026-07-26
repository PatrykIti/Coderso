import { describe, expect, it } from "vitest";

import {
  renderPublicEntryDetailHtml,
  renderPublicEntryListHtml,
} from "../../../core/site/renderPublicEntry";

const base = {
  title: "Projekty",
  contentType: { id: "type", name: "Projekty", slug: "house-project", schema: {} },
  items: [],
};

describe("public dynamic-entry locale", () => {
  it("uses Polish language for dynamic content", async () => {
    expect(await renderPublicEntryListHtml({ ...base, siteLocale: "pl" })).toContain(
      '<html lang="pl">'
    );
  });

  it("falls back to English for legacy invalid values", async () => {
    expect(await renderPublicEntryListHtml({ ...base, siteLocale: "../pl" })).toContain(
      '<html lang="en">'
    );
  });

  it("uses Polish on a dynamic detail document without a database import", async () => {
    const html = await renderPublicEntryDetailHtml({
      title: "Aurora",
      contentType: base.contentType,
      entry: {
        id: "aurora",
        typeId: "type",
        title: "Aurora",
        slug: "aurora",
        data: { summary: "Projekt domu" },
      },
      siteLocale: "pl-PL",
    });
    expect(html).toContain('<html lang="pl-PL">');
    expect(html).toContain("Aurora");
  });
});
