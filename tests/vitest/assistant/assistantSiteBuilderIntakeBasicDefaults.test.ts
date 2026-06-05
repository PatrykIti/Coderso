import { expect, test } from "vitest";

import {
  DEFAULT_BASIC_PAGE_ROLE_IDS,
  deriveBasicSiteMapDefaults,
  normalizeBasicPageRoleLabels,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicDefaults";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import { ASSISTANT_SITE_BUILDER_INTAKE_VERSION } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

test("deriveBasicSiteMapDefaults builds deterministic generic pages and simple menu", () => {
  const defaults = deriveBasicSiteMapDefaults({
    goals: ["pokazac oferte i zbierac zapytania"],
  });

  expect(defaults.pageRoles).toEqual([...DEFAULT_BASIC_PAGE_ROLE_IDS]);
  expect(defaults.pageRoutes.map((route) => [route.roleId, route.path])).toEqual([
    ["home", "/"],
    ["services", "/services"],
    ["portfolio", "/portfolio"],
    ["testimonials", "/testimonials"],
    ["about", "/about"],
    ["faq", "/faq"],
    ["contact", "/contact"],
  ]);
  expect(defaults.menuPreset).toBe("simple");
  expect(defaults.menuItems.every((item) => item.parentKey === null)).toBe(true);
  expect(defaults.homepageSectionRoles).toEqual([
    "value-proposition",
    "services-overview",
    "proof",
    "lead-capture",
    "faq",
  ]);
});

test("deriveBasicSiteMapDefaults chooses section defaults from broad goals not industries", () => {
  const sales = deriveBasicSiteMapDefaults({
    goals: ["sprzedawac produkty i pokazac katalog"],
    pageRoles: ["home", "products", "pricing", "contact"],
  });
  expect(sales.goalSignals).toEqual(["sales"]);
  expect(sales.homepageSectionRoles).toEqual([
    "value-proposition",
    "services-overview",
    "proof",
    "lead-capture",
    "featured-items",
    "pricing",
  ]);

  const content = deriveBasicSiteMapDefaults({
    goals: ["prowadzic blog i poradniki dla klientow"],
    pageRoles: ["home", "blog", "faq", "contact"],
  });
  expect(content.goalSignals).toEqual(["content"]);
  expect(content.homepageSectionRoles).toContain("content-feed");
  expect(content.homepageSectionRoles).toContain("faq");

  const booking = deriveBasicSiteMapDefaults({
    goals: ["rezerwacje wizyt i kontakt"],
    pageRoles: ["home", "services", "contact"],
  });
  expect(booking.goalSignals).toEqual(["booking"]);
  expect(booking.homepageSectionRoles).toContain("process");
});

test("deriveBasicSiteMapDefaults builds bounded grouped menu without changing role paths", () => {
  const labels = normalizeBasicPageRoleLabels({
    services: "Oferta specjalna",
    contact: "Zapytaj teraz",
  });
  const defaults = deriveBasicSiteMapDefaults({
    pageRoles: ["home", "services", "portfolio", "about", "faq", "contact"],
    menuPreset: "grouped",
    customLabels: labels,
  });

  expect(defaults.pageRoutes.find((route) => route.roleId === "services")).toMatchObject({
    label: "Oferta specjalna",
    path: "/services",
  });
  expect(defaults.pageRoutes.find((route) => route.roleId === "contact")).toMatchObject({
    label: "Zapytaj teraz",
    path: "/contact",
  });
  expect(defaults.menuItems.map((item) => item.key)).toEqual([
    "page-home",
    "group-offer",
    "page-services",
    "group-work",
    "page-portfolio",
    "group-company",
    "page-about",
    "group-resources",
    "page-faq",
    "page-contact",
  ]);
  expect(defaults.menuItems.find((item) => item.key === "page-services")).toMatchObject({
    parentKey: "group-offer",
    href: "/services",
  });
});

test("deriveBasicSiteMapDefaults keeps user-selected sections instead of widening them", () => {
  const defaults = deriveBasicSiteMapDefaults({
    goals: ["sprzedawac produkty"],
    sectionRoles: ["pricing", "lead-capture"],
  });

  expect(defaults.homepageSectionRoles).toEqual(["pricing", "lead-capture"]);
  expect(defaults.goalSignals).toEqual(["user-selected"]);
});

test("Basic defaults fail closed for unknown ids and unsafe labels", () => {
  expect(() =>
    deriveBasicSiteMapDefaults({
      pageRoles: ["home", "database" as "home"],
    })
  ).toThrow("intake_option_invalid");

  expect(() =>
    deriveBasicSiteMapDefaults({
      menuPreset: "mega-admin" as "simple",
    })
  ).toThrow("intake_option_invalid");

  expect(() =>
    deriveBasicSiteMapDefaults({
      sectionRoles: ["lead-capture", "checkout" as "lead-capture"],
    })
  ).toThrow("intake_option_invalid");

  expect(() =>
    normalizeBasicPageRoleLabels({
      services: "Kliknij https://example.com",
    })
  ).toThrow("intake_answer_invalid");

  expect(() =>
    normalizeBasicPageRoleLabels({
      contact: "<script>alert(1)</script>",
    })
  ).toThrow("intake_answer_invalid");
});

test("normalizeAssistantSiteBuilderIntakeSession derives Basic defaults as advisory facts", () => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "basic",
    currentStepId: "homepage-sections",
    answers: [
      {
        stepId: "business-profile",
        values: {
          siteName: "Studio Uniwersalne",
          topic: "uslugi, portfolio i kontakt",
          locale: "pl",
        },
      },
      {
        stepId: "site-goals",
        values: {
          goals: ["pokazac portfolio i zaufanie"],
        },
      },
      {
        stepId: "site-map",
        values: {
          pageRoles: ["home", "services", "portfolio", "contact"],
          customLabels: {
            portfolio: "Realizacje",
          },
        },
      },
    ],
  });

  expect(normalized.facts?.pageRoles).toEqual(["home", "services", "portfolio", "contact"]);
  expect(normalized.facts?.sectionRoles).toBeUndefined();
  expect(normalized.facts?.pageRoleLabels).toEqual({
    portfolio: "Realizacje",
  });
  expect(normalized.facts?.basicDefaults).toMatchObject({
    pageRoles: ["home", "services", "portfolio", "contact"],
    homepageSectionRoles: [
      "value-proposition",
      "services-overview",
      "proof",
      "lead-capture",
      "featured-items",
      "process",
    ],
  });
  expect(
    normalized.facts?.basicDefaults?.pageRoutes.find((route) => route.roleId === "portfolio")
  ).toMatchObject({
    label: "Realizacje",
    path: "/portfolio",
  });
});
