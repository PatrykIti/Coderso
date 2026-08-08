import { describe, expect, it } from "vitest";

import {
  buildProjectResources,
  normalizeProjectEntryDesired,
  validateProjectFixtures,
} from "../../../scripts/projekty-domow/content/buildProjectResources";
import {
  HOUSE_PROJECT_CATEGORIES,
  HOUSE_PROJECT_RESOURCE_KEY,
} from "../../../scripts/projekty-domow/content/constants";
import {
  PROJECT_FIXTURES,
  PROJECT_SEO_DESCRIPTION,
  type ProjectFixture,
} from "../../../scripts/projekty-domow/content/projectFixtures";
import {
  HOUSE_PROJECT_SCHEMA,
  HOUSE_PROJECT_SCHEMA_LIMITS,
} from "../../../scripts/projekty-domow/content/projectSchema";
import { cleanJsonObject } from "../../../scripts/projekty-domow/json";

const copyFixtures = (): ProjectFixture[] =>
  PROJECT_FIXTURES.map((fixture) => ({
    ...fixture,
    categories: [...fixture.categories],
    ...(fixture.detailStats
      ? { detailStats: fixture.detailStats.map((stat) => ({ ...stat })) }
      : {}),
    ...(fixture.assumptions
      ? { assumptions: fixture.assumptions.map((assumption) => ({ ...assumption })) }
      : {}),
  }));

const projectRef = {
  ref: "content_type" as const,
  key: HOUSE_PROJECT_RESOURCE_KEY,
};

describe("Projekty Domów project fixtures", () => {
  it("pins the exact six-row designated-reference matrix", () => {
    expect(HOUSE_PROJECT_CATEGORIES).toEqual(["barn", "villa", "single", "eco"]);
    expect(
      PROJECT_FIXTURES.map(
        ({ referenceOrder, key, slug, title, area, categories, cardDescription, cardHref }) => ({
          referenceOrder,
          key,
          slug,
          title,
          area,
          categories,
          cardDescription,
          cardHref,
        })
      )
    ).toEqual([
      {
        referenceOrder: 0,
        key: "aurora",
        slug: "aurora",
        title: "Dom Aurora",
        area: 142,
        categories: ["barn", "eco"],
        cardDescription: "142 m² · stodoła · eko",
        cardHref: "/projekty/aurora",
      },
      {
        referenceOrder: 1,
        key: "linea",
        slug: "linea",
        title: "Dom Linea",
        area: 188,
        categories: ["villa"],
        cardDescription: "188 m² · miejska willa",
        cardHref: "/projekty",
      },
      {
        referenceOrder: 2,
        key: "nova",
        slug: "nova",
        title: "Dom Nova",
        area: 121,
        categories: ["single", "eco"],
        cardDescription: "121 m² · parterowy",
        cardHref: "/projekty",
      },
      {
        referenceOrder: 3,
        key: "mono",
        slug: "mono",
        title: "Dom Mono",
        area: 156,
        categories: ["barn"],
        cardDescription: "156 m² · czarna elewacja",
        cardHref: "/projekty",
      },
      {
        referenceOrder: 4,
        key: "vista",
        slug: "vista",
        title: "Dom Vista",
        area: 206,
        categories: ["villa", "eco"],
        cardDescription: "206 m² · willa z patio",
        cardHref: "/projekty",
      },
      {
        referenceOrder: 5,
        key: "calm",
        slug: "calm",
        title: "Dom Calm",
        area: 98,
        categories: ["single"],
        cardDescription: "98 m² · kompaktowy",
        cardHref: "/projekty",
      },
    ]);
    expect(
      PROJECT_FIXTURES.every(({ seoDescription }) => seoDescription === PROJECT_SEO_DESCRIPTION)
    ).toBe(true);
  });

  it("pins Aurora detail and keeps all structural ids non-rendered", () => {
    expect(PROJECT_FIXTURES[0]).toMatchObject({
      detailEyebrow: "Projekt pokazowy",
      detailLead:
        "Nowoczesna stodoła z wysoką strefą dzienną, dużym przeszkleniem od ogrodu i spokojną elewacją z drewna oraz grafitowej blachy.",
      detailStats: [
        { id: "area", value: "142 m²", label: "powierzchnia" },
        { id: "bedrooms", value: "4", label: "sypialnie" },
        { id: "bathrooms", value: "2", label: "łazienki" },
        { id: "energy", value: "A++", label: "standard energii" },
      ],
      assumptionsEyebrow: "Założenia",
      assumptionsTitle: "Dom ma być efektowny, ale bardzo prosty w codziennym życiu.",
      assumptionsLead:
        "Układ rozdziela prywatną strefę sypialni od otwartego salonu, kuchni i jadalni. Główne przeszklenie kieruje uwagę na ogród.",
      assumptions: [
        {
          id: "living-zone",
          title: "Strefa dzienna",
          description:
            "Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i ukryta spiżarnia.",
        },
        {
          id: "private-zone",
          title: "Strefa prywatna",
          description: "Sypialnia master z garderobą, trzy pokoje oraz kompaktowa strefa pracy.",
        },
        {
          id: "facade",
          title: "Elewacja",
          description: "Drewno, grafit, ciepłe światło i proste detale bez zbędnych ozdobników.",
        },
      ],
    });
    for (const fixture of PROJECT_FIXTURES.slice(1)) {
      expect(
        Object.keys(fixture).some(
          (key) => key.startsWith("detail") || key.startsWith("assumptions")
        )
      ).toBe(false);
    }
  });

  it("owns only source-backed strict schema properties", () => {
    expect(HOUSE_PROJECT_SCHEMA.required).toEqual([
      "cardDescription",
      "cardHref",
      "area",
      "categories",
      "referenceOrder",
      "seoDescription",
    ]);
    expect(HOUSE_PROJECT_SCHEMA.additionalProperties).toBe(false);
    expect(Object.keys(HOUSE_PROJECT_SCHEMA.properties)).toEqual([
      "cardDescription",
      "cardHref",
      "area",
      "categories",
      "referenceOrder",
      "seoDescription",
      "detailEyebrow",
      "detailLead",
      "detailStats",
      "assumptionsEyebrow",
      "assumptionsTitle",
      "assumptionsLead",
      "assumptions",
    ]);
    expect(HOUSE_PROJECT_SCHEMA.properties.cardHref.enum).toEqual([
      "/projekty/aurora",
      "/projekty",
    ]);
    for (const obsolete of [
      "summary",
      "style",
      "storeys",
      "rooms",
      "energyClass",
      "category",
      "zones",
      "visualLabel",
    ]) {
      expect(HOUSE_PROJECT_SCHEMA.properties).not.toHaveProperty(obsolete);
    }
    expect(HOUSE_PROJECT_SCHEMA_LIMITS).toMatchObject({
      area: { min: 40, max: 500 },
      categories: { min: 1, max: 4 },
      referenceOrder: { min: 0, max: 5 },
      detailStats: { count: 4 },
      assumptions: { count: 3 },
    });
  });

  it("builds deterministic published content type and entry seeds", () => {
    const first = buildProjectResources();
    expect(first.contentTypes).toEqual([
      {
        key: HOUSE_PROJECT_RESOURCE_KEY,
        desired: expect.objectContaining({
          slug: HOUSE_PROJECT_RESOURCE_KEY,
          status: "published",
          schema: HOUSE_PROJECT_SCHEMA,
        }),
      },
    ]);
    expect(first.entries).toHaveLength(6);
    for (const entry of first.entries) {
      expect(entry.desired).toMatchObject({ status: "published", contentTypeId: projectRef });
      expect(JSON.stringify(entry)).not.toMatch(/"(?:mediaId|assetId|databaseId)":/);
    }
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(buildProjectResources()).toEqual(first);
    expect(Object.isFrozen(PROJECT_FIXTURES)).toBe(true);
    expect(PROJECT_FIXTURES.every(Object.isFrozen)).toBe(true);
    expect(PROJECT_FIXTURES.every(({ categories }) => Object.isFrozen(categories))).toBe(true);
    expect(Object.isFrozen(PROJECT_FIXTURES[0]?.detailStats)).toBe(true);
    expect(Object.isFrozen(PROJECT_FIXTURES[0]?.assumptions)).toBe(true);
  });

  it.each([
    [
      "duplicate key",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.key = "aurora"),
      "house_project_key_duplicate",
    ],
    [
      "duplicate slug",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.slug = "aurora"),
      "house_project_slug_duplicate",
    ],
    [
      "wrong order",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.referenceOrder = 4),
      "house_project_reference_order_invalid",
    ],
    [
      "unknown category",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.categories = ["other" as never]),
      "house_project_category_invalid",
    ],
    [
      "duplicate category",
      (fixtures: ProjectFixture[]) => (fixtures[0]!.categories = ["barn", "barn"]),
      "house_project_category_duplicate",
    ],
    [
      "wrong Aurora href",
      (fixtures: ProjectFixture[]) => (fixtures[0]!.cardHref = "/projekty"),
      "house_project_card_href_invalid",
    ],
    [
      "wrong sibling href",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.cardHref = "/projekty/aurora"),
      "house_project_card_href_invalid",
    ],
    [
      "remote href",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.cardHref = "https://example.com" as never),
      "house_project_card_href_invalid",
    ],
    [
      "area under minimum",
      (fixtures: ProjectFixture[]) => (fixtures[1]!.area = 39),
      "house_project_fixture_bounds_invalid",
    ],
  ])("rejects %s with a stable generator code", (_label, mutate, code) => {
    const fixtures = copyFixtures();
    mutate(fixtures);
    expect(() => validateProjectFixtures(fixtures)).toThrow(code);
  });

  it("enforces the exact Aurora detail owner and complete ordered group", () => {
    const missing = copyFixtures();
    for (const key of [
      "detailEyebrow",
      "detailLead",
      "detailStats",
      "assumptionsEyebrow",
      "assumptionsTitle",
      "assumptionsLead",
      "assumptions",
    ] as const) {
      delete missing[0]![key];
    }
    expect(() => validateProjectFixtures(missing)).toThrow("house_project_detail_owner_invalid");

    const partial = copyFixtures();
    delete partial[0]!.detailLead;
    expect(() => validateProjectFixtures(partial)).toThrow("house_project_detail_group_invalid");

    const moved = copyFixtures();
    Object.assign(moved[1]!, {
      detailEyebrow: moved[0]!.detailEyebrow,
      detailLead: moved[0]!.detailLead,
      detailStats: moved[0]!.detailStats,
      assumptionsEyebrow: moved[0]!.assumptionsEyebrow,
      assumptionsTitle: moved[0]!.assumptionsTitle,
      assumptionsLead: moved[0]!.assumptionsLead,
      assumptions: moved[0]!.assumptions,
    });
    expect(() => validateProjectFixtures(moved)).toThrow("house_project_detail_owner_invalid");

    const reordered = copyFixtures();
    reordered[0]!.detailStats = [...reordered[0]!.detailStats!].reverse();
    expect(() => validateProjectFixtures(reordered)).toThrow("house_project_detail_group_invalid");
  });

  it.each([
    undefined,
    { ref: "page", key: HOUSE_PROJECT_RESOURCE_KEY },
    { ref: "content_type", key: "wrong-project" },
    { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY, id: "forbidden" },
  ])("rejects a missing or non-exact content type reference", (contentTypeId) => {
    expect(() =>
      normalizeProjectEntryDesired({
        fixture: PROJECT_FIXTURES[0]!,
        contentTypeId,
        status: "published",
      })
    ).toThrow("house_project_content_type_ref_invalid");
  });

  it("rejects an entry target state other than published", () => {
    expect(() =>
      normalizeProjectEntryDesired({
        fixture: PROJECT_FIXTURES[0]!,
        contentTypeId: projectRef,
        status: "draft",
      })
    ).toThrow("house_project_status_invalid");
  });
});

describe("Projekty Domów strict JSON conversion", () => {
  it("clones deterministic plain values including null-prototype records and frozen arrays", () => {
    const nested = Object.create(null) as Record<string, unknown>;
    nested.value = Object.freeze([1, "two", true, null, { deep: "value" }]);
    const source = { nested };
    expect(cleanJsonObject(source)).toEqual(source);
    expect(cleanJsonObject(source)).not.toBe(source);
    expect(JSON.stringify(cleanJsonObject(source))).toBe(JSON.stringify(source));
  });

  it.each([
    ["undefined", () => ({ nested: { value: undefined } })],
    ["function", () => ({ nested: { value: () => undefined } })],
    ["symbol value", () => ({ nested: { value: Symbol("value") } })],
    ["bigint", () => ({ nested: { value: 1n } })],
    ["NaN", () => ({ nested: { value: Number.NaN } })],
    ["infinity", () => ({ nested: { value: Number.POSITIVE_INFINITY } })],
    ["date", () => ({ nested: new Date(0) })],
    ["custom prototype", () => ({ nested: Object.create({ inherited: true }) })],
    ["toJSON", () => ({ nested: { toJSON: "forbidden" } })],
    ["sparse array", () => ({ nested: new Array(2) })],
  ])("rejects %s recursively", (_label, build) => {
    expect(() => cleanJsonObject(build())).toThrow("projekty_domow_json_object_invalid");
  });

  it("rejects cycles and illegal own descriptors without invoking accessors", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => cleanJsonObject(cyclic)).toThrow("projekty_domow_json_object_invalid");

    let getterCalled = false;
    const accessor = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => {
        getterCalled = true;
        return "value";
      },
    });
    expect(() => cleanJsonObject({ accessor })).toThrow("projekty_domow_json_object_invalid");
    expect(getterCalled).toBe(false);

    const hidden = {};
    Object.defineProperty(hidden, "value", { enumerable: false, value: "value" });
    expect(() => cleanJsonObject({ hidden })).toThrow("projekty_domow_json_object_invalid");

    const symbolKey = { value: true };
    Object.defineProperty(symbolKey, Symbol("secret"), { enumerable: true, value: true });
    expect(() => cleanJsonObject({ symbolKey })).toThrow("projekty_domow_json_object_invalid");
  });

  it("rejects arrays with any non-intrinsic key shape", () => {
    for (const define of [
      (array: unknown[]) => Object.defineProperty(array, "extra", { enumerable: true, value: 1 }),
      (array: unknown[]) => Object.defineProperty(array, "hidden", { enumerable: false, value: 1 }),
      (array: unknown[]) => Object.defineProperty(array, "01", { enumerable: true, value: 1 }),
      (array: unknown[]) =>
        Object.defineProperty(array, Symbol("extra"), { enumerable: true, value: 1 }),
      (array: unknown[]) => Object.defineProperty(array, "0", { enumerable: true, get: () => 1 }),
    ]) {
      const array: unknown[] = [1];
      define(array);
      expect(() => cleanJsonObject({ array })).toThrow("projekty_domow_json_object_invalid");
    }
  });
});
