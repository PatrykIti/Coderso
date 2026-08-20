import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MenuDocumentV2 } from "../../../core/services/menus/menuDocumentV2";
import { SiteHeaderMenuDocumentRender } from "../../../core/site/siteShell";
import {
  PROJECT_BRIEF_FORM_TITLE,
  PROJECT_BRIEF_INITIAL_NOTE,
} from "../../../scripts/projekty-domow/content/projectForm";
import { PROJECT_SEO_DESCRIPTION } from "../../../scripts/projekty-domow/content/projectFixtures";
import {
  FORMA_DOM_SCENARIO_IDS,
  buildFormaDomPackage,
  serializeFormaDomPackage,
} from "../../../scripts/projekty-domow/package";
import { FORMA_DOM_PAGE_SEO_DESCRIPTION } from "../../../scripts/projekty-domow/pages/shared";

const artifactPath = new URL("../../../_docs/_DEMO/projekty-domow.site.json", import.meta.url);

type JsonRecord = Record<string, unknown>;

type PageBlockRecord = JsonRecord & {
  id?: string;
  type?: string;
  props?: JsonRecord;
  slots?: Record<string, PageBlockRecord[]>;
};

const isRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const flattenBlocks = (blocks: unknown): PageBlockRecord[] => {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const block = candidate as PageBlockRecord;
    const children = isRecord(block.slots) ? Object.values(block.slots).flatMap(flattenBlocks) : [];
    return [block, ...children];
  });
};

const readPageBlocks = (document: unknown): PageBlockRecord[] => {
  if (!isRecord(document) || !Array.isArray(document.sections)) return [];
  return document.sections.flatMap((section) =>
    isRecord(section) ? flattenBlocks(section.blocks) : []
  );
};

const expectedMenu = [
  ["Start", "home", "/"],
  ["Oferta", "oferta", "/oferta"],
  ["Projekty", "projekty", "/projekty"],
  ["Proces", "proces", "/proces"],
  ["Cennik", "cennik", "/cennik"],
  ["O nas", "o-nas", "/o-nas"],
  ["Kontakt", "kontakt", "/kontakt"],
] as const;

const staticSeo = {
  home: "Nowoczesne projekty domów — FormaDom Studio",
  oferta: "Oferta — FormaDom Studio",
  projekty: "Projekty domów — FormaDom Studio",
  proces: "Proces projektowy — FormaDom Studio",
  cennik: "Cennik — FormaDom Studio",
  "o-nas": "O nas — FormaDom Studio",
  kontakt: "Kontakt — FormaDom Studio",
} as const;

describe("canonical Projekty Domów package", () => {
  it("is byte-stable, formatter-stable and checked in with zero generator diff", async () => {
    const [first, second] = await Promise.all([
      serializeFormaDomPackage(),
      serializeFormaDomPackage(),
    ]);
    expect(first).toBe(second);
    expect(readFileSync(artifactPath, "utf8")).toBe(first);
  });

  it("pins exact metadata and seven deterministic Page-backed menu items", () => {
    const pkg = buildFormaDomPackage();
    const menu = pkg.resources.menus[0]!;
    expect(pkg.key).toBe("formadom-studio");
    expect(pkg.metadata).toEqual({
      name: "FormaDom Studio",
      locale: "pl-PL",
      description: "Kompletny przykład witryny pracowni projektów domów.",
    });
    expect(menu.key).toBe("primary");
    expect(menu.desired.name).toBe("Główna nawigacja");
    expect(menu.desired.name).not.toBe("Menu główne FormaDom");
    expect(menu.desired).toMatchObject({ location: "primary", status: "published" });
    expect(menu.desired.items).toEqual(
      expectedMenu.map(([label, key], orderIndex) => ({
        id: `00000000-0000-4000-8000-${String(570 + orderIndex).padStart(12, "0")}`,
        label,
        href: null,
        pageId: { ref: "page", key },
        parentId: null,
        orderIndex,
        settings: {},
      }))
    );
  });

  it("pins native brand, disclosure, responsive CTAs and visibly distinct scrolled frame", () => {
    const menu = buildFormaDomPackage().resources.menus[0]!;
    const document = menu.desired.document as unknown as MenuDocumentV2;
    const section = document.sections[0]!;
    const [brand, nav, desktopCta, responsiveCta] = section.blocks;
    expect(section).toMatchObject({
      id: "menu-primary-section",
      type: "menu-bar",
      name: "Główna nawigacja",
      layout: {
        surfaceColor: "rgba(8, 17, 31, 0.62)",
        surfaceColorScrolled: "rgba(8, 17, 31, 0.84)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderColorScrolled: "rgba(255, 255, 255, 0.18)",
        borderWidth: 1,
        paddingX: 16,
        paddingY: 12,
        alignment: "space-between",
        sticky: true,
        radius: 40,
        shadowCustom: "0 18px 50px rgba(0, 0, 0, 0.24)",
        shadowCustomScrolled: "0 18px 50px rgba(0, 0, 0, 0.24)",
      },
    });
    expect(brand).toMatchObject({
      id: "menu-brand",
      type: "brand",
      props: { mode: "icon", icon: "house", showText: true, text: "FormaDom", href: "/" },
    });
    expect(nav).toMatchObject({
      id: "menu-items",
      type: "nav-items",
      props: {
        mobileMode: "disclosure",
        orientation: "horizontal",
        linkColor: "#a8b5c7",
        linkHoverTextColor: "#f7fbff",
      },
    });
    expect(desktopCta).toMatchObject({
      id: "menu-desktop-cta",
      props: { label: "Zacznij projekt", href: "/kontakt" },
      visibility: { visible: true },
      responsive: {
        tablet: { visibility: { visible: false } },
        mobile: { visibility: { visible: false } },
      },
    });
    expect(responsiveCta).toMatchObject({
      id: "menu-responsive-cta",
      props: { label: "Umów konsultację", href: "/kontakt" },
      visibility: { visible: false },
      responsive: {
        tablet: { visibility: { visible: true } },
        mobile: { visibility: { visible: true } },
      },
    });
    expect(section.responsive?.tablet?.navProps).toMatchObject({
      itemGap: 3,
      linkPaddingX: 6,
      linkPaddingY: 8,
      fontSize: 13,
    });
    expect(section.responsive?.mobile?.navProps).toMatchObject({ orientation: "vertical" });
    expect(menu.desired.appearance).toEqual({
      alignment: "space-between",
      borderColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      dropdownDirection: "bottom",
      fontSize: 14,
      fontWeight: 600,
      itemGap: 8,
      linkActiveColor: "rgba(255, 255, 255, 0.12)",
      linkColor: "#a8b5c7",
      linkHoverColor: "rgba(255, 255, 255, 0.08)",
      linkHoverTextColor: "#f7fbff",
      linkPaddingX: 12,
      linkPaddingY: 8,
      linkRadius: 32,
      mobileMode: "disclosure",
      orientation: "horizontal",
      paddingX: 16,
      paddingY: 12,
      shadow: "md",
      surfaceColor: "rgba(8, 17, 31, 0.62)",
      sticky: true,
      textTransform: "none",
    });
  });

  it("renders one longest-prefix current link, a closed keyboard disclosure and scroll state", () => {
    const menu = buildFormaDomPackage().resources.menus[0]!;
    const document = menu.desired.document as unknown as MenuDocumentV2;
    const navigation = {
      label: "Główna nawigacja",
      items: expectedMenu.map(([label, , href]) => ({ label, href })),
    };
    const markup = renderToStaticMarkup(
      createElement(SiteHeaderMenuDocumentRender, {
        document,
        navigation,
        siteName: "FormaDom Studio",
        activePath: "/projekty/aurora",
      })
    );
    expect(markup.match(/<a[^>]*aria-current="page"[^>]*>/g)).toHaveLength(1);
    const projectsLink = markup.match(/<a[^>]*href="\/projekty"[^>]*>Projekty<\/a>/)?.[0];
    expect(projectsLink).toContain('aria-current="page"');
    expect(markup).toContain("<details");
    expect(markup).toContain("<summary>Menu</summary>");
    expect(markup).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    for (const [label, , href] of expectedMenu) {
      expect(markup).toContain(`href="${href}"`);
      expect(markup).toContain(`>${label}</a>`);
    }
    expect(markup).toContain('[data-scrolled="true"]');
    expect(markup).toContain('setAttribute("data-scrolled","true")');
    expect(markup).toContain('removeAttribute("data-scrolled")');
  });

  it("pins the complete footer order, exact copy, links and sanitizer-owned house SVG", () => {
    const footer = buildFormaDomPackage().resources.pageTemplates[0]!;
    const document = footer.desired.document;
    const blocks = readPageBlocks(document);
    expect(footer).toMatchObject({
      key: "footer",
      desired: { name: "Stopka FormaDom", slug: "footer", status: "published" },
    });
    expect(blocks.map(({ id }) => id)).toEqual([
      "footer-brand-column",
      "footer-house-mark",
      "footer-brand-link",
      "footer-brand-subline",
      "footer-brand-copy",
      "footer-menu-column",
      "footer-menu-title",
      "footer-menu-offer",
      "footer-menu-projects",
      "footer-menu-process",
      "footer-menu-pricing",
      "footer-contact-column",
      "footer-contact-title",
      "footer-contact-email",
      "footer-contact-phone",
      "footer-contact-location",
      "footer-start-column",
      "footer-start-title",
      "footer-start-copy",
      "footer-start-cta",
      "footer-bottom-row",
      "footer-copyright",
      "footer-motto",
    ]);
    expect(
      blocks.filter(({ type }) => type === "button").map(({ props }) => [props?.label, props?.href])
    ).toEqual([
      ["FormaDom", "/"],
      ["Oferta", "/oferta"],
      ["Projekty", "/projekty"],
      ["Proces", "/proces"],
      ["Cennik", "/cennik"],
      ["kontakt@formadom.studio", "mailto:kontakt@formadom.studio"],
      ["+48 500 100 200", "tel:+48500100200"],
      ["Wyślij brief", "/kontakt"],
    ]);
    expect(blocks.filter(({ type }) => type === "heading").map(({ props }) => props?.text)).toEqual(
      ["Menu", "Kontakt", "Start projektu"]
    );
    expect(blocks.filter(({ type }) => type === "text").map(({ props }) => props?.text)).toEqual([
      "Domy z charakterem",
      "Nowoczesne projekty domów jednorodzinnych, adaptacje, koncepcje premium i wizualizacje, które pomagają podjąć dobrą decyzję jeszcze przed budową.",
      "Warszawa / praca zdalna w całej Polsce",
      "Masz działkę, inspiracje albo tylko ogólną wizję? Przekujemy to w konkretny plan.",
      "© 2026 FormaDom Studio. Projekt demo.",
      "Minimalizm · komfort · nowoczesność",
    ]);
    const svg = blocks.find(({ id }) => id === "footer-house-mark")?.props?.svg;
    expect(typeof svg).toBe("string");
    if (typeof svg !== "string") throw new TypeError("footer_house_svg_invalid");
    expect(svg).toContain('viewBox="0 0 48 48"');
    expect(svg.match(/<path\b/g)).toHaveLength(2);
    expect(svg).not.toMatch(/(?:href|src)=["']https?:|javascript:|<script/i);
  });

  it("pins one exact shell setting per key and the source-derived design token subset", () => {
    const resources = buildFormaDomPackage().resources;
    const settings = resources.settings;
    const setting = (key: string) => settings.filter((seed) => seed.key === key);
    expect(settings).toHaveLength(7);
    expect(new Set(settings.map(({ key }) => key)).size).toBe(settings.length);
    expect(Object.keys(resources).at(-1)).toBe("settings");
    expect(settings.at(-1)?.key).toBe("site.navigationMenuId");
    expect(setting("site.name")).toEqual([
      { key: "site.name", desired: { value: "FormaDom Studio" } },
    ]);
    expect(setting("site.locale")).toEqual([{ key: "site.locale", desired: { value: "pl" } }]);
    expect(setting("site.homepageId")).toEqual([
      { key: "site.homepageId", desired: { value: { ref: "page", key: "home" } } },
    ]);
    expect(setting("site.navigationMenuId")).toEqual([
      {
        key: "site.navigationMenuId",
        desired: { value: { ref: "menu", key: "primary" } },
      },
    ]);
    expect(setting("site.footerTemplateId")).toEqual([
      {
        key: "site.footerTemplateId",
        desired: { value: { ref: "page_template", key: "footer" } },
      },
    ]);
    expect(setting("site.contentRoutes")).toHaveLength(1);
    expect(setting("design.tokens")[0]?.desired.value).toEqual({
      colors: { primary: "#8ee8ff", secondary: "#c7b7ff", accent: "#adffd8" },
      neutrals: {
        bg: "#07111f",
        surface: "#0b1628",
        border: "rgba(255,255,255,.14)",
        text: "#f7fbff",
      },
      radius: { sm: "18px", md: "18px", lg: "28px", xl: "28px" },
      typography: {
        sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
    });
  });

  it("preserves seven static SEO pairs, Aurora dynamic SEO and one content route", () => {
    const pkg = buildFormaDomPackage();
    expect(pkg.resources.pages).toHaveLength(7);
    expect(
      Object.fromEntries(
        pkg.resources.pages.map((page) => {
          const data = page.desired.data as JsonRecord;
          return [page.key, (data.seo as JsonRecord).title];
        })
      )
    ).toEqual(staticSeo);
    for (const page of pkg.resources.pages) {
      const data = page.desired.data as JsonRecord;
      expect(data.seo).toMatchObject({ description: FORMA_DOM_PAGE_SEO_DESCRIPTION });
      expect(page.desired).not.toHaveProperty("document");
    }
    const aurora = pkg.resources.entries.find(({ key }) => key === "aurora")!;
    const detail = pkg.resources.detailPages.find(({ key }) => key === "project-detail")!;
    expect(aurora.desired).toMatchObject({
      title: "Dom Aurora",
      slug: "aurora",
      data: { seoDescription: PROJECT_SEO_DESCRIPTION },
    });
    expect(detail.desired.seo).toEqual({
      titlePattern: "{{ title }} — projekt pokazowy — FormaDom Studio",
      descriptionField: "seoDescription",
    });
    expect(
      String((detail.desired.seo as JsonRecord).titlePattern).replace(
        "{{ title }}",
        String(aurora.desired.title)
      )
    ).toBe("Dom Aurora — projekt pokazowy — FormaDom Studio");
    const contentRoutes = pkg.resources.settings.find(({ key }) => key === "site.contentRoutes")
      ?.desired.value;
    expect(contentRoutes).toEqual([
      {
        type: "house-project",
        listPath: "/projekty",
        detailPath: "/projekty/:slug",
        enabled: true,
        detailPageId: { ref: "detail_page", key: "project-detail" },
      },
    ]);
    expect(JSON.stringify(pkg)).not.toContain("/projekty-katalog");
  });

  it("keeps the Form title and supporting note in their single owning resources", () => {
    const pkg = buildFormaDomPackage();
    const contact = pkg.resources.pages.find(({ key }) => key === "kontakt")!;
    const contactBlocks = readPageBlocks(contact.desired.data);
    const formBlocks = contactBlocks.filter(({ type }) => type === "form");
    expect(formBlocks).toHaveLength(1);
    expect(formBlocks[0]?.props).toMatchObject({
      formId: { ref: "form", key: "project-brief" },
      title: PROJECT_BRIEF_FORM_TITLE,
    });
    expect(JSON.stringify(pkg.resources.pages)).not.toContain(PROJECT_BRIEF_INITIAL_NOTE);
    const form = pkg.resources.forms.find(({ key }) => key === "project-brief")!;
    expect(form.desired.name).toBe(PROJECT_BRIEF_FORM_TITLE);
    expect(form.desired.settings).toMatchObject({
      theme: { submit: { supportingText: PROJECT_BRIEF_INITIAL_NOTE } },
    });
  });

  it("pins the exact complete residual set and final verification scenarios", () => {
    const pkg = buildFormaDomPackage();
    const residuals = pkg.compatibility?.unresolvedVisuals ?? [];
    expect(residuals.map(({ id }) => id)).toEqual([
      "exact-breakpoints-approximated",
      "favicon-not-installed",
      "header-brand-and-floating-frame-approximated",
      "native-form-heading-approximated",
      "portfolio-filter-and-card-chrome-approximated",
      "prototype-css-art-and-motion-approximated",
      "theme-color-not-installed",
    ]);
    for (const entry of residuals) {
      expect(entry.impact).toEqual({
        functional: false,
        accessibility: false,
        data: false,
        security: false,
        testIntegrity: false,
      });
      expect(entry.prototypeEvidence).not.toBe("");
      expect(entry.prototypeEvidence).not.toContain("_docs/_DEMO/projekty-domow.page.json");
      expect(entry.cmsConstraint).not.toBe("");
      expect(entry.installedApproximation).not.toBe("");
      expect(entry.userVisibleDifference).not.toBe("");
      expect(entry.postInstallRemediation).not.toBe("");
    }
    expect(residuals.map(({ id }) => id)).not.toContain(
      "real-project-and-team-imagery-not-installed"
    );
    const filterResidual = residuals.find(
      ({ id }) => id === "portfolio-filter-and-card-chrome-approximated"
    )!;
    expect(filterResidual.installedApproximation).toContain("Wszystkie");
    expect(filterResidual.installedApproximation).toContain("Pokaż projekty");
    expect(filterResidual.userVisibleDifference).toContain("Filtruj wyniki");
    expect(filterResidual.userVisibleDifference).toContain("Kategoria");
    expect(filterResidual.userVisibleDifference).toContain("Brak wyników");
    const motionResidual = residuals.find(
      ({ id }) => id === "prototype-css-art-and-motion-approximated"
    )!;
    expect(motionResidual.userVisibleDifference).toContain("Przewiń do treści");
    expect(motionResidual.userVisibleDifference).toContain("scrollHint");
    expect(pkg.verification?.scenarioIds).toEqual([...FORMA_DOM_SCENARIO_IDS]);
  });

  it("contains no legacy widget/media surface, secret field or favicon resource", async () => {
    const output = await serializeFormaDomPackage();
    expect(output).not.toMatch(
      /widgetTemplates|mediaId|"assetId":(?!\s*null)|authorization|apiKey|password|secret/i
    );
    expect(output).not.toContain('"favicon"');
  });
});
