import { describe, expect, it } from "vitest";

import { createDefaultPageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";
import { renderPublicPageV2RuntimeHtml } from "../../../core/site/renderPublicPage";
import { buildPublicDocumentShell } from "../../../core/site/publicDocumentShell";

describe("public Page document locale", () => {
  it("renders normalized Polish locale", () => {
    const html = renderPublicPageV2RuntimeHtml({
      title: "Dom",
      document: createDefaultPageDocumentV2(),
      siteLocale: "pl-pl",
    });
    expect(html).toContain('<html lang="pl-PL">');
  });

  it("uses the same locale sink for Page v2 public documents", () => {
    const html = renderPublicPageV2RuntimeHtml({
      title: "Dom",
      document: createDefaultPageDocumentV2(),
      siteLocale: "pl",
    });
    expect(html).toContain('<html lang="pl">');
    expect(html).toContain('data-page-v2="true"');
  });

  it("falls back for missing and invalid locale", () => {
    expect(
      renderPublicPageV2RuntimeHtml({ title: "Home", document: createDefaultPageDocumentV2() })
    ).toContain('<html lang="en">');
    expect(
      renderPublicPageV2RuntimeHtml({
        title: "Home",
        document: createDefaultPageDocumentV2(),
        siteLocale: 'pl" onload="x',
      })
    ).toContain('<html lang="en">');
  });

  it("escapes the language attribute exactly once at the shared string sink", () => {
    expect(
      buildPublicDocumentShell({ language: "pl", headHtml: "", bodyHtml: "<main>Dom</main>" })
    ).toBe('<!doctype html><html lang="pl"><head></head><body><main>Dom</main></body></html>');
  });
});
