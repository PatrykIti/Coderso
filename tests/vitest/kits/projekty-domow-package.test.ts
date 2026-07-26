import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildFormaDomPackage,
  serializeFormaDomPackage,
} from "../../../scripts/projekty-domow/package";

const artifactPath = new URL("../../../_docs/_DEMO/projekty-domow.site.json", import.meta.url);

describe("canonical Projekty Domów package", () => {
  it("is byte-stable, formatter-stable and checked in with zero generator diff", async () => {
    const [first, second] = await Promise.all([
      serializeFormaDomPackage(),
      serializeFormaDomPackage(),
    ]);
    expect(first).toBe(second);
    expect(readFileSync(artifactPath, "utf8")).toBe(first);
  });

  it("pins metadata, brand, locale and exactly one shell reference each", () => {
    const pkg = buildFormaDomPackage();
    expect(pkg.key).toBe("formadom-studio");
    expect(pkg.metadata).toMatchObject({ name: "FormaDom Studio", locale: "pl-PL" });
    const setting = (key: string) => pkg.resources.settings.filter((seed) => seed.key === key);
    expect(setting("site.name")).toEqual([
      { key: "site.name", desired: { value: "FormaDom Studio" } },
    ]);
    expect(setting("site.locale")).toEqual([{ key: "site.locale", desired: { value: "pl" } }]);
    expect(setting("site.homepageId")[0]?.desired.value).toEqual({ ref: "page", key: "home" });
    expect(setting("site.navigationMenuId")[0]?.desired.value).toEqual({
      ref: "menu",
      key: "primary",
    });
    expect(setting("site.footerTemplateId")[0]?.desired.value).toEqual({
      ref: "page_template",
      key: "footer",
    });
    expect(setting("site.contentRoutes")).toHaveLength(1);
  });

  it("contains seven static pages, dynamic Aurora route, menu and footer", () => {
    const pkg = buildFormaDomPackage();
    expect(pkg.resources.pages).toHaveLength(7);
    expect(pkg.resources.entries.some((seed) => seed.key === "aurora")).toBe(true);
    expect(pkg.resources.menus).toHaveLength(1);
    expect(pkg.resources.pageTemplates).toHaveLength(1);
    const contentRoutes = pkg.resources.settings.find((seed) => seed.key === "site.contentRoutes")
      ?.desired.value as Array<{ listPath: string; detailPath: string }>;
    expect(contentRoutes).toHaveLength(1);
    expect(contentRoutes[0]).toMatchObject({
      listPath: "/projekty",
      detailPath: "/projekty/:slug",
    });
    expect(JSON.stringify(pkg)).not.toContain("/projekty-katalog");
  });

  it("renders footer navigation as real internal links", () => {
    const footer = buildFormaDomPackage().resources.pageTemplates[0]?.desired.document as {
      sections?: Array<{
        blocks?: Array<{ type?: string; props?: { label?: string; href?: string } }>;
      }>;
    };
    const links = (footer.sections ?? [])
      .flatMap((section) => section.blocks ?? [])
      .filter((block) => block.type === "button")
      .map((block) => [block.props?.label, block.props?.href]);
    expect(links).toEqual([
      ["Oferta", "/oferta"],
      ["Projekty", "/projekty"],
      ["Proces", "/proces"],
      ["Kontakt", "/kontakt"],
    ]);
  });

  it("pins complete safe residual evidence with all impact flags false", () => {
    const residuals = buildFormaDomPackage().compatibility?.unresolvedVisuals ?? [];
    expect(residuals.map((entry) => entry.id).sort()).toEqual([
      "css-effects-approximated",
      "exact-breakpoints-approximated",
      "favicon-not-installed",
      "real-project-and-team-imagery-not-installed",
    ]);
    for (const entry of residuals) {
      expect(Object.values(entry.impact).every((value) => value === false)).toBe(true);
      expect(entry.prototypeEvidence).toContain("_docs/_DEMO/projekty-domow.page.json");
      expect(entry.prototypeEvidence).not.toContain("projekty-domow-wow-site");
      expect(entry.cmsConstraint).not.toBe("");
      expect(entry.installedApproximation).not.toBe("");
      expect(entry.userVisibleDifference).not.toBe("");
      expect(entry.postInstallRemediation).not.toBe("");
    }
  });

  it("contains no legacy widget surface, media IDs, secrets or favicon resource", async () => {
    const output = await serializeFormaDomPackage();
    expect(output).not.toMatch(
      /widgetTemplates|mediaId|assetId|authorization|apiKey|password|secret/i
    );
    expect(output).not.toContain('"favicon"');
  });

  it("keeps settings as the final installer stage and exact smoke scenarios", () => {
    const pkg = buildFormaDomPackage();
    expect(pkg.verification?.scenarioIds).toEqual([
      "home-desktop-effects",
      "all-routes-desktop-shell",
      "tablet-responsive",
      "mobile-navigation",
      "portfolio-facets",
      "aurora-detail",
      "contact-form",
      "publish-rollback",
    ]);
    expect(pkg.resources.settings.at(-1)?.key).toBe("site.navigationMenuId");
  });
});
