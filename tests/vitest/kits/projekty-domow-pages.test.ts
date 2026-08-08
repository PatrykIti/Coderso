import { describe, expect, it } from "vitest";

import type {
  PageBlockV2,
  PageDocumentV2,
  PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { buildFormaDomPages } from "../../../scripts/projekty-domow/pages";

const refs = {
  contentType: { ref: "content_type", key: "house-project" } as const,
  listingQuery: { ref: "listing_query", key: "published-projects" } as const,
  listingTemplate: { ref: "listing_template", key: "project-cards" } as const,
  form: { ref: "form", key: "project-brief" } as const,
};

const pages = () => buildFormaDomPages(refs);
const page = (key: string) => pages().find((seed) => seed.key === key)!;
const document = (key: string) => page(key).desired.data as unknown as PageDocumentV2;
const serialized = (key: string) => JSON.stringify(page(key).desired);

const walkBlocks = (blocks: PageBlockV2[]): PageBlockV2[] =>
  blocks.flatMap((block) => [
    block,
    ...Object.values(block.slots ?? {}).flatMap((children) => walkBlocks(children ?? [])),
  ]);

const allBlocks = (key: string) =>
  document(key).sections.flatMap((entry) => walkBlocks(entry.blocks));

const sectionById = (key: string, id: string): PageSectionV2 =>
  document(key).sections.find((entry) => entry.id === id)!;

const blockById = (key: string, id: string): PageBlockV2 =>
  allBlocks(key).find((entry) => entry.id === id)!;

const collectPackageRefs = (
  value: unknown,
  path: string[] = []
): Array<{ path: string; ref: string; key: string }> => {
  if (!value || typeof value !== "object") return [];
  if (!Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.ref === "string" && typeof record.key === "string") {
      return [{ path: path.join("."), ref: record.ref, key: record.key }];
    }
  }
  return Object.entries(value).flatMap(([key, child]) => collectPackageRefs(child, [...path, key]));
};

describe("FormaDom Page v2 package documents", () => {
  it("emits exactly seven published desired.data envelopes in canonical route order", () => {
    expect(pages().map((seed) => [seed.key, seed.desired.slug, seed.desired.title])).toEqual([
      ["home", "/", "Nowoczesne projekty domów — FormaDom Studio"],
      ["oferta", "/oferta", "Oferta — FormaDom Studio"],
      ["projekty", "/projekty", "Projekty domów — FormaDom Studio"],
      ["proces", "/proces", "Proces projektowy — FormaDom Studio"],
      ["cennik", "/cennik", "Cennik — FormaDom Studio"],
      ["o-nas", "/o-nas", "O nas — FormaDom Studio"],
      ["kontakt", "/kontakt", "Kontakt — FormaDom Studio"],
    ]);

    const sectionIds = {
      home: [
        "home-hero",
        "home-intro",
        "home-services",
        "home-switcher",
        "home-projects",
        "home-process",
        "home-cta",
      ],
      oferta: [
        "offer-hero",
        "offer-individual",
        "offer-adaptation",
        "offer-visualization",
        "offer-plot",
        "offer-interiors",
        "offer-comparison",
      ],
      projekty: ["projects-hero", "projects-browser"],
      proces: ["process-hero", "process-timeline", "process-cta"],
      cennik: ["pricing-hero", "pricing-packages"],
      "o-nas": ["about-hero", "about-approach", "about-team"],
      kontakt: ["contact-hero", "contact-form-section"],
    } as const;

    for (const seed of pages()) {
      expect(seed.desired.status).toBe("published");
      expect(seed.desired).toHaveProperty("data");
      expect(seed.desired).not.toHaveProperty("document");
      expect(seed.desired).not.toHaveProperty("id");
      expect(seed.desired.data).toMatchObject({
        schemaVersion: 2,
        breakpoints: ["desktop", "tablet", "mobile"],
        seo: {
          title: seed.desired.title,
          description:
            "Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.",
        },
        settings: { template: "page-v2", background: "#07111f" },
      });
      expect(
        (seed.desired.data as unknown as PageDocumentV2).sections.map((section) => section.id)
      ).toEqual(sectionIds[seed.key as keyof typeof sectionIds]);
    }
  });

  it("attaches exactly the five allowlisted package references under desired.data", () => {
    const found = pages().flatMap((seed) =>
      collectPackageRefs(seed.desired.data, [seed.key]).map((entry) => ({
        ...entry,
        path: entry.path.replace(/\.sections\.(\d+)\.blocks\.(\d+)/, ".sections.$1.blocks.$2"),
      }))
    );
    expect(found).toEqual([
      {
        path: "projekty.sections.1.blocks.1.props.queryId",
        ref: "listing_query",
        key: "published-projects",
      },
      {
        path: "projekty.sections.1.blocks.2.props.contentTypeId",
        ref: "content_type",
        key: "house-project",
      },
      {
        path: "projekty.sections.1.blocks.2.props.queryId",
        ref: "listing_query",
        key: "published-projects",
      },
      {
        path: "projekty.sections.1.blocks.2.props.templateId",
        ref: "listing_template",
        key: "project-cards",
      },
      {
        path: "kontakt.sections.1.blocks.0.props.formId",
        ref: "form",
        key: "project-brief",
      },
    ]);
  });

  it("preserves the premium home composition and the authored Polish switcher name", () => {
    expect(sectionById("home", "home-hero")).toMatchObject({
      type: "hero",
      variant: "split",
      layout: { columns: 2 },
      style: {
        backgroundType: "gradient",
        columnTemplate: "minmax(0,1fr) minmax(420px,.9fr)",
        surfacePreset: "ambient-orbs",
        fullBleed: true,
        noiseOverlay: true,
      },
    });
    expect(blockById("home", "home-title")).toMatchObject({
      props: { text: "Dom, który wygląda jak przyszłość — i czuje się jak Ty." },
      style: { fontSizeCustom: "clamp(2.8rem,6vw,6.5rem)" },
    });
    expect(blockById("home", "home-style-switcher").props).toMatchObject({
      ariaLabel: "Wybór stylu domu",
      tabs: [{ label: "Nowoczesna stodoła" }, { label: "Miejska willa" }, { label: "Dom eko" }],
    });
    expect(blockById("home", "home-contact-cta").style?.magnetic).toBe(true);
    expect(serialized("home")).toContain('"type":"customSvg"');
    expect(serialized("home")).not.toContain('"type":"scrollHint"');
  });

  it("keeps offer, project, process and pricing source matrices exact", () => {
    expect(
      document("oferta")
        .sections.map((entry) => entry.visibility.anchor)
        .filter(Boolean)
    ).toEqual(["indywidualne", "adaptacje", "wizualizacje"]);
    expect(sectionById("oferta", "offer-comparison")).toMatchObject({
      type: "comparison",
      variant: "cards",
      layout: { columns: 3 },
    });

    expect(blockById("projekty", "projects-filters").props).toMatchObject({
      queryId: refs.listingQuery,
      layout: "horizontal",
      showSearch: false,
      autoApply: false,
    });
    expect(blockById("projekty", "projects-collection").props).toMatchObject({
      contentTypeId: refs.contentType,
      queryId: refs.listingQuery,
      templateId: refs.listingTemplate,
      showCta: false,
    });

    expect(sectionById("proces", "process-timeline").blocks.map((block) => block.id)).toEqual([
      "process-step-1",
      "process-step-2",
      "process-step-3",
      "process-step-4",
      "process-step-5",
    ]);

    expect(sectionById("cennik", "pricing-packages").blocks.map((block) => block.id)).toEqual([
      "pricing-start",
      "pricing-premium",
      "pricing-complete",
    ]);
    expect(blockById("cennik", "pricing-premium").style).toMatchObject({
      backgroundType: "gradient",
      borderColor: "#8ee8ff",
      borderWidth: 2,
      glow: { color: "rgba(173,255,216,.28)", blur: 48, spread: 3 },
    });
  });

  it("keeps about and contact native presentation on Page blocks", () => {
    expect(sectionById("o-nas", "about-approach").blocks.map((block) => block.id)).toEqual([
      "about-approach-title",
      "about-approach-copy-1",
      "about-approach-copy-2",
      "about-value-shape",
      "about-value-light",
      "about-value-function",
      "about-value-premium",
    ]);
    expect(sectionById("o-nas", "about-team").blocks).toHaveLength(3);

    expect(blockById("kontakt", "contact-form").props).toMatchObject({
      formId: refs.form,
      title: "Zacznij projekt",
      textareaRows: 5,
      showSelectPrompt: false,
      loadingLabel: "Wysyłanie...",
      successBehavior: "show-message-keep-form",
    });
    expect(blockById("kontakt", "contact-email").props).toMatchObject({
      label: "kontakt@formadom.studio",
      href: "mailto:kontakt@formadom.studio",
    });
    expect(blockById("kontakt", "contact-phone").props).toMatchObject({
      label: "+48 500 100 200",
      href: "tel:+48500100200",
    });
    expect(serialized("kontakt")).not.toMatch(
      /Poniedziałek–piątek|pierwsza rozmowa|ul\. Architektów 12/
    );
  });

  it("resolves every authored hash CTA to a real target anchor", () => {
    const pageByPath = new Map(pages().map((seed) => [seed.desired.slug, seed]));
    const hashHrefs = pages().flatMap((seed) =>
      (seed.desired.data as unknown as PageDocumentV2).sections
        .flatMap((entry) => walkBlocks(entry.blocks))
        .filter((block) => block.type === "button")
        .map((block) => block.props.href)
        .filter((href): href is string => typeof href === "string" && href.includes("#"))
    );
    expect(hashHrefs).toHaveLength(4);
    for (const href of hashHrefs) {
      const targetUrl = new URL(href, "https://formadom.test");
      const target = pageByPath.get(targetUrl.pathname);
      expect(target, `Missing target page for ${href}`).toBeDefined();
      const anchors = new Set(
        (target!.desired.data as unknown as PageDocumentV2).sections
          .map((entry) => entry.visibility.anchor)
          .filter(Boolean)
      );
      expect(anchors.has(targetUrl.hash.slice(1)), `Missing section anchor for ${href}`).toBe(true);
    }
  });

  it("emits no forbidden package aliases or unsafe Page content and stays deterministic", () => {
    const output = JSON.stringify(pages());
    expect(output).not.toMatch(/(?:desired\.document|mediaId|assetId|<script|javascript:|rawCss)/i);
    expect(output).not.toContain('"type":"embed"');
    expect(output).not.toContain("/projekty-katalog");
    expect(pages()).toEqual(pages());
  });
});
