import { redactAssistantText } from "./assistantRedaction";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import { getSiteBuilderIntakeOption } from "./assistantSiteBuilderIntakeRegistry";
import type {
  AssistantSiteBuilderBasicDefaultsFacts,
  AssistantSiteBuilderBasicMenuItemDefault,
  AssistantSiteBuilderBasicPageRouteDefault,
  AssistantSiteBuilderMenuPresetId,
  AssistantSiteBuilderPageRoleId,
  AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";

export const DEFAULT_BASIC_PAGE_ROLE_IDS = Object.freeze([
  "home",
  "services",
  "portfolio",
  "testimonials",
  "about",
  "faq",
  "contact",
] as const satisfies readonly AssistantSiteBuilderPageRoleId[]);

const basicPageRouteByRole = Object.freeze({
  home: "/",
  about: "/about",
  services: "/services",
  products: "/products",
  portfolio: "/portfolio",
  "case-studies": "/case-studies",
  pricing: "/pricing",
  testimonials: "/testimonials",
  blog: "/blog",
  faq: "/faq",
  team: "/team",
  locations: "/locations",
  contact: "/contact",
  legal: "/legal",
} satisfies Record<AssistantSiteBuilderPageRoleId, string>);

const groupedParentByRole = Object.freeze({
  home: null,
  about: "company",
  services: "offer",
  products: "offer",
  portfolio: "work",
  "case-studies": "work",
  pricing: "offer",
  testimonials: "proof",
  blog: "resources",
  faq: "resources",
  team: "company",
  locations: "resources",
  contact: null,
  legal: "resources",
} satisfies Record<AssistantSiteBuilderPageRoleId, string | null>);

const groupedParentLabels: Readonly<Record<string, string>> = Object.freeze({
  offer: "Offer",
  work: "Work",
  proof: "Proof",
  company: "Company",
  resources: "Resources",
});

const labelUnsafePattern =
  /(https?:\/\/|www\.|javascript:|data:|<\s*\/?\s*script|<\/|on[a-z]+\s*=|\/admin\b|\b(?:action|page|entry|setting|database)\.[a-z0-9._-]+\b)/iu;

const goalSignalPatterns = [
  {
    id: "booking",
    pattern:
      /\b(book|booking|appointment|reserve|reservation|rezerw\w*|wizyta|wizyt\w*|termin)\b/iu,
    sections: [
      "value-proposition",
      "services-overview",
      "process",
      "proof",
      "lead-capture",
      "contact",
    ],
  },
  {
    id: "sales",
    pattern:
      /\b(sell|sales|shop|store|product|catalog|catalogue|sklep|sprzed|produkt|katalog|cennik)\b/iu,
    sections: ["value-proposition", "featured-items", "pricing", "proof", "lead-capture"],
  },
  {
    id: "portfolio",
    pattern: /\b(portfolio|project|projects|work|case study|realiz|projekty|prace|galeria)\b/iu,
    sections: ["value-proposition", "featured-items", "proof", "process", "lead-capture"],
  },
  {
    id: "content",
    pattern: /\b(blog|article|articles|content|resources|guide|poradnik|wiedza|aktualnosci)\b/iu,
    sections: ["value-proposition", "content-feed", "proof", "faq", "lead-capture"],
  },
  {
    id: "trust",
    pattern: /\b(trust|proof|review|reviews|testimonial|testimonials|zauf|opinie|referencje)\b/iu,
    sections: ["value-proposition", "proof", "benefits", "faq", "lead-capture"],
  },
] as const;

const defaultHomepageSectionRoleIds = Object.freeze([
  "value-proposition",
  "services-overview",
  "proof",
  "lead-capture",
] as const satisfies readonly AssistantSiteBuilderSectionRoleId[]);

const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

const failInvalid = (field: string, value: unknown): never =>
  throwAssistantSiteBuilderIntakeError("intake_answer_invalid", { field, value });

const normalizeLabelValue = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") failInvalid(field, value);
  const text = String(value);

  const normalized = text
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  if (labelUnsafePattern.test(normalized)) failInvalid(field, "[unsafe-label]");

  const redacted = redactAssistantText(normalized, 80);
  if (redacted.includes("[REDACTED]")) failInvalid(field, "[secret-like-label]");
  return redacted;
};

export const normalizeBasicSiteMapLabel = (value: unknown, field = "label"): string | null =>
  normalizeLabelValue(value, field);

export const normalizeBasicPageRoleLabels = (
  value: unknown
): Partial<Record<AssistantSiteBuilderPageRoleId, string>> => {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failInvalid("customLabels", value);
  }

  const labels: Partial<Record<AssistantSiteBuilderPageRoleId, string>> = {};
  for (const [roleId, labelValue] of Object.entries(value as Record<string, unknown>)) {
    const resolvedRoleId = getSiteBuilderIntakeOption("pageRoles", roleId)
      .id as AssistantSiteBuilderPageRoleId;
    const label = normalizeLabelValue(labelValue, `customLabels.${resolvedRoleId}`);
    if (label) labels[resolvedRoleId] = label;
  }

  return labels;
};

export const resolveBasicPageRoles = (
  pageRoles: readonly AssistantSiteBuilderPageRoleId[] | undefined | null
): AssistantSiteBuilderPageRoleId[] => {
  const resolved = pageRoles?.length ? pageRoles : DEFAULT_BASIC_PAGE_ROLE_IDS;
  return unique(
    resolved.map(
      (roleId) =>
        getSiteBuilderIntakeOption("pageRoles", roleId).id as AssistantSiteBuilderPageRoleId
    )
  );
};

export const resolveBasicMenuPreset = (
  menuPreset: AssistantSiteBuilderMenuPresetId | undefined | null
): AssistantSiteBuilderMenuPresetId => {
  const candidate = menuPreset ?? "simple";
  return getSiteBuilderIntakeOption("menuPresets", candidate)
    .id as AssistantSiteBuilderMenuPresetId;
};

const getPageRoleLabel = (
  roleId: AssistantSiteBuilderPageRoleId,
  customLabels: Partial<Record<AssistantSiteBuilderPageRoleId, string>>
) => customLabels[roleId] ?? getSiteBuilderIntakeOption("pageRoles", roleId).label;

export const buildBasicPageRoutes = (input: {
  pageRoles?: readonly AssistantSiteBuilderPageRoleId[] | null;
  customLabels?: Partial<Record<AssistantSiteBuilderPageRoleId, string>>;
}): AssistantSiteBuilderBasicPageRouteDefault[] => {
  const labels = input.customLabels ?? {};
  return resolveBasicPageRoles(input.pageRoles).map((roleId) => {
    const label = getPageRoleLabel(roleId, labels);
    return {
      roleId,
      label,
      menuLabel: label,
      path: basicPageRouteByRole[roleId],
    };
  });
};

const buildMenuKey = (prefix: string, value: string) => `${prefix}-${value}`;

export const buildBasicMenuItems = (input: {
  pageRoutes: readonly AssistantSiteBuilderBasicPageRouteDefault[];
  menuPreset?: AssistantSiteBuilderMenuPresetId | null;
}): AssistantSiteBuilderBasicMenuItemDefault[] => {
  const menuPreset = resolveBasicMenuPreset(input.menuPreset);
  if (menuPreset !== "grouped" && menuPreset !== "content-heavy") {
    return input.pageRoutes.map((route, index) => ({
      key: buildMenuKey("page", route.roleId),
      roleId: route.roleId,
      label: route.menuLabel,
      href: route.path,
      parentKey: null,
      orderIndex: index,
    }));
  }

  const items: AssistantSiteBuilderBasicMenuItemDefault[] = [];
  const usedParents = new Set<string>();

  for (const route of input.pageRoutes) {
    const parentKey = groupedParentByRole[route.roleId];
    if (parentKey && !usedParents.has(parentKey)) {
      usedParents.add(parentKey);
      items.push({
        key: buildMenuKey("group", parentKey),
        roleId: null,
        label: groupedParentLabels[parentKey] ?? parentKey,
        href: null,
        parentKey: null,
        orderIndex: items.length,
      });
    }
    items.push({
      key: buildMenuKey("page", route.roleId),
      roleId: route.roleId,
      label: route.menuLabel,
      href: route.path,
      parentKey: parentKey ? buildMenuKey("group", parentKey) : null,
      orderIndex: items.length,
    });
  }

  return items;
};

const goalText = (goals: readonly string[] | undefined | null, primaryGoal?: string | null) =>
  [...(goals ?? []), primaryGoal ?? ""].join(" ").toLowerCase();

export const resolveBasicHomepageSectionRoles = (input: {
  goals?: readonly string[] | null;
  primaryGoal?: string | null;
  pageRoles?: readonly AssistantSiteBuilderPageRoleId[] | null;
  sectionRoles?: readonly AssistantSiteBuilderSectionRoleId[] | null;
}): {
  sectionRoles: AssistantSiteBuilderSectionRoleId[];
  goalSignals: string[];
} => {
  if (input.sectionRoles?.length) {
    return {
      sectionRoles: unique(
        input.sectionRoles.map(
          (sectionRoleId) =>
            getSiteBuilderIntakeOption("sectionRoles", sectionRoleId)
              .id as AssistantSiteBuilderSectionRoleId
        )
      ),
      goalSignals: ["user-selected"],
    };
  }

  const text = goalText(input.goals, input.primaryGoal);
  const matched = goalSignalPatterns.filter((signal) => signal.pattern.test(text));
  const goalSections = matched.flatMap((signal) => signal.sections);
  const pageRoleSections = [
    ...(input.pageRoles?.includes("products") ? (["featured-items", "pricing"] as const) : []),
    ...(input.pageRoles?.includes("blog") ? (["content-feed"] as const) : []),
    ...(input.pageRoles?.includes("testimonials") ? (["proof"] as const) : []),
    ...(input.pageRoles?.includes("faq") ? (["faq"] as const) : []),
  ];

  return {
    sectionRoles: unique(
      [...defaultHomepageSectionRoleIds, ...goalSections, ...pageRoleSections].map(
        (sectionRoleId) =>
          getSiteBuilderIntakeOption("sectionRoles", sectionRoleId)
            .id as AssistantSiteBuilderSectionRoleId
      )
    ),
    goalSignals: matched.map((signal) => signal.id),
  };
};

export const deriveBasicSiteMapDefaults = (input: {
  pageRoles?: readonly AssistantSiteBuilderPageRoleId[] | null;
  goals?: readonly string[] | null;
  primaryGoal?: string | null;
  menuPreset?: AssistantSiteBuilderMenuPresetId | null;
  sectionRoles?: readonly AssistantSiteBuilderSectionRoleId[] | null;
  customLabels?: Partial<Record<AssistantSiteBuilderPageRoleId, string>>;
}): AssistantSiteBuilderBasicDefaultsFacts => {
  const pageRoles = resolveBasicPageRoles(input.pageRoles);
  const menuPreset = resolveBasicMenuPreset(input.menuPreset);
  const pageRoutes = buildBasicPageRoutes({
    pageRoles,
    customLabels: input.customLabels,
  });
  const homepageSections = resolveBasicHomepageSectionRoles({
    goals: input.goals,
    primaryGoal: input.primaryGoal,
    pageRoles,
    sectionRoles: input.sectionRoles,
  });

  return {
    pageRoles,
    pageRoutes,
    menuPreset,
    menuItems: buildBasicMenuItems({ pageRoutes, menuPreset }),
    homepageSectionRoles: homepageSections.sectionRoles,
    goalSignals: homepageSections.goalSignals,
  };
};
