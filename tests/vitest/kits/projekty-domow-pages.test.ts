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
const document = (key: string) => page(key).desired.document as unknown as PageDocumentV2;
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

describe("Projekty Domów Page v2 documents", () => {
  it("builds exactly seven published routes with complete normalized documents", () => {
    const minimumSectionCount = new Map<string, number>([
      ["kontakt", 2],
    ]);
    expect(pages().map((seed) => [seed.key, seed.desired.slug])).toEqual([
      ["home", "/"],
      ["oferta", "/oferta"],
      ["projekty", "/projekty"],
      ["proces", "/proces"],
      ["cennik", "/cennik"],
      ["o-nas", "/o-nas"],
      ["kontakt", "/kontakt"],
    ]);
    for (const seed of pages()) {
      expect(seed.desired.status).toBe("published");
      expect(seed.desired.document).toMatchObject({
        schemaVersion: 2,
        breakpoints: ["desktop", "tablet", "mobile"],
        settings: { template: "page-v2", background: "#07111f" },
      });
      expect(
        (seed.desired.document as unknown as PageDocumentV2).sections.length
      ).toBeGreaterThanOrEqual(minimumSectionCount.get(seed.key) ?? 4);
      expect(seed.desired).not.toHaveProperty("id");
    }
  });

  it("ships a premium homepage composition with visible Page-v2 effects", () => {
    const hero = sectionById("home", "home-hero");
    const features = sectionById("home", "home-features");

    expect(hero).toMatchObject({
      type: "hero",
      variant: "split",
      layout: { columns: 2 },
      style: {
        backgroundType: "gradient",
        columnTemplate: "minmax(0,1fr) minmax(420px,.9fr)",
        surfacePreset: "ambient-orbs",
        glow: { color: "rgba(142,232,255,0.2)" },
      },
    });
    expect(hero.style.background).toContain("), linear-gradient(");
    expect(allBlocks("home").find((block) => block.id === "home-title")?.style).toMatchObject({
      fontSizeCustom: "clamp(2.8rem,6vw,6.5rem)",
    });
    expect(features.style.border).toEqual({
      top: { color: "rgba(255,255,255,0.1)", width: 1, style: "solid" },
      right: { color: "rgba(142,232,255,0.22)", width: 2, style: "solid" },
      bottom: { color: "rgba(255,255,255,0.1)", width: 1, style: "solid" },
      left: { color: "rgba(142,232,255,0.22)", width: 2, style: "solid" },
    });
    expect(allBlocks("home").some((block) => block.style?.colSpan === 2)).toBe(true);
    expect(allBlocks("home").some((block) => block.style?.rowSpan === 2)).toBe(true);
    expect(serialized("home")).toContain('"type":"switcher"');
    expect(serialized("home")).toContain('"type":"scrollHint"');
    expect(serialized("home")).toContain('"magnetic":true');
  });

  it("resolves every hash CTA to a real section anchor on its target page", () => {
    const pageByPath = new Map(pages().map((seed) => [seed.desired.slug, seed]));
    const hashHrefs = pages().flatMap((seed) => {
      const doc = seed.desired.document as unknown as PageDocumentV2;
      return doc.sections
        .flatMap((entry) => walkBlocks(entry.blocks))
        .filter((block) => block.type === "button")
        .map((block) => block.props.href)
        .filter((href): href is string => typeof href === "string" && href.includes("#"));
    });

    expect(hashHrefs.length).toBeGreaterThan(12);
    for (const href of hashHrefs) {
      const targetUrl = new URL(href, "https://formadom.test");
      const target = pageByPath.get(targetUrl.pathname);
      expect(target, `Missing target page for ${href}`).toBeDefined();
      const anchors = new Set(
        (target!.desired.document as unknown as PageDocumentV2).sections
          .map((entry) => entry.visibility.anchor)
          .filter(Boolean)
      );
      expect(anchors.has(targetUrl.hash.slice(1)), `Missing section anchor for ${href}`).toBe(true);
    }
  });

  it("builds offer cards, three service anchors and a comparison section", () => {
    expect(
      document("oferta")
        .sections.map((entry) => entry.visibility.anchor)
        .filter(Boolean)
    ).toEqual(
      expect.arrayContaining([
        "zakres",
        "projekt-indywidualny",
        "adaptacja",
        "wizualizacje",
        "porownanie",
      ])
    );
    expect(sectionById("oferta", "offer-comparison")).toMatchObject({
      type: "comparison",
      variant: "cards",
      layout: { columns: 3 },
    });
    expect(
      allBlocks("oferta").filter(
        (block) => block.id.startsWith("offer-compare-") && block.type === "group"
      )
    ).toHaveLength(3);
  });

  it("keeps filters and collection refs on the authored /projekty catalogue page", () => {
    const blocks = allBlocks("projekty");
    const collection = blocks.find((block) => block.type === "collection");
    expect(sectionById("projekty", "projects-browser")).toMatchObject({
      type: "collection",
      visibility: { anchor: "katalog" },
    });
    expect(collection?.props).toMatchObject({
      contentTypeId: refs.contentType,
      queryId: refs.listingQuery,
      templateId: refs.listingTemplate,
      limit: 24,
    });
    expect(blocks.find((block) => block.type === "filters")?.props).toMatchObject({
      queryId: refs.listingQuery,
      showSearch: true,
      facets: expect.any(Array),
    });
  });

  it("renders one visible five-step timeline instead of five generic sections", () => {
    const timelines = document("proces").sections.filter((entry) => entry.type === "timeline");
    expect(timelines).toHaveLength(1);
    expect(timelines[0]).toMatchObject({
      id: "process-timeline",
      visibility: { visible: true, anchor: "etapy" },
    });
    expect(
      timelines[0]!.blocks.filter((block) => /^process-step-[1-5]$/.test(block.id))
    ).toHaveLength(5);
    expect(document("proces").sections.some((entry) => /^process-step-[1-5]$/.test(entry.id))).toBe(
      false
    );
  });

  it("builds three pricing packages with a genuinely highlighted middle package", () => {
    const packages = sectionById("cennik", "pricing-packages");
    const cards = packages.blocks.filter(
      (block) => block.type === "group" && block.id.startsWith("pricing-package-")
    );
    expect(packages).toMatchObject({
      type: "comparison",
      variant: "cards",
      visibility: { anchor: "pakiety" },
      layout: { columns: 3 },
    });
    expect(cards).toHaveLength(3);
    expect(cards[1]).toMatchObject({
      id: "pricing-package-project",
      style: {
        backgroundType: "gradient",
        borderColor: "#d8ff7a",
        borderWidth: 2,
        shadow: "lg",
        glow: { color: "rgba(216,255,122,0.3)", blur: 52, spread: 4 },
      },
    });
    expect(cards[1]!.style?.background).toContain("), linear-gradient(");
  });

  it("includes approach, values, team, contact form and map approximation compositions", () => {
    expect(document("o-nas").sections.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["about-approach", "about-values", "about-team"])
    );
    expect(sectionById("o-nas", "about-approach").style.columnTemplate).toBe("1fr 1.2fr");
    expect(
      allBlocks("o-nas").filter(
        (block) => block.id.startsWith("about-team-") && block.type === "group"
      )
    ).toHaveLength(3);

    expect(allBlocks("kontakt").find((block) => block.id === "contact-eyebrow")?.props).toMatchObject({
      text: "Zacznij projekt",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-title")?.props).toMatchObject({
      text: "Opowiedz nam o działce, marzeniu albo pomyśle na dom.",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-lead")?.props).toMatchObject({
      text:
        "Nie musisz mieć gotowego planu ani wiedzy technicznej. Wystarczy kilka zdań — resztę spokojnie ustalimy razem.",
    });
    expect(sectionById("kontakt", "contact-form-section")).toMatchObject({
      type: "lead-form",
      visibility: { anchor: "formularz" },
      style: { columnTemplate: "1.15fr .85fr" },
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-form")?.props).toMatchObject({
      formId: refs.form,
      title: "Zacznij projekt",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-direct-title")?.props).toMatchObject({
      text: "Kontakt bezpośredni",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-direct-email")?.props).toMatchObject({
      label: "kontakt@formadom.studio",
      href: "mailto:kontakt@formadom.studio",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-direct-phone")?.props).toMatchObject({
      label: "+48 500 100 200",
      href: "tel:+48500100200",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-direct-copy")?.props).toMatchObject({
      text: "Warszawa / projekty online w całej Polsce",
    });
    expect(allBlocks("kontakt").find((block) => block.id === "contact-map-label")?.props).toMatchObject({
      text: "Studio",
    });
    expect(
      allBlocks("kontakt").find((block) => block.id === "contact-map-approximation")
    ).toBeDefined();
    expect(document("kontakt").sections.map((entry) => entry.id)).not.toContain("contact-next");
    expect(serialized("kontakt")).not.toContain("Poniedziałek–piątek");
    expect(serialized("kontakt")).not.toContain("pierwsza rozmowa");
    expect(serialized("kontakt")).not.toContain("ul. Architektów 12");
  });

  it("uses no media IDs, raw CSS, scripts or unsupported embed widgets", () => {
    const output = JSON.stringify(pages());
    expect(output).not.toMatch(/(?:mediaId|assetId|<script|javascript:|rawCss)/i);
    expect(output).not.toContain('"type":"embed"');
    expect(output).not.toContain("/projekty-katalog");
  });

  it("is deterministic", () => {
    expect(pages()).toEqual(pages());
  });
});
