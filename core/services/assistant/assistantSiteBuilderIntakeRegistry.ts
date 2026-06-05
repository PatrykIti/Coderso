import {
  assistantSiteBuilderIntakeModes,
  assistantSiteBuilderIntakeOptionRegistryIds,
  assistantSiteBuilderIntakeStepIds,
  type AssistantSiteBuilderContentEngineId,
  type AssistantSiteBuilderHeroPresetId,
  type AssistantSiteBuilderIntakeMode,
  type AssistantSiteBuilderIntakeModeDefinition,
  type AssistantSiteBuilderIntakeOptionDefinition,
  type AssistantSiteBuilderIntakeOptionRegistryId,
  AssistantSiteBuilderIntakeRegistryError,
  type AssistantSiteBuilderIntakeRegistryErrorCode,
  type AssistantSiteBuilderIntakeStepDefinition,
  type AssistantSiteBuilderMediaPolicyId,
  type AssistantSiteBuilderMenuPresetId,
  type AssistantSiteBuilderPageRoleId,
  type AssistantSiteBuilderReviewStateId,
  type AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";

type RegistryItem = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
};

type AnyOptionDefinition = AssistantSiteBuilderIntakeOptionDefinition<string>;

const allModes = assistantSiteBuilderIntakeModes;
const advancedOnlyModes: readonly AssistantSiteBuilderIntakeMode[] = ["advanced"];

const createIntakeRegistryError = (
  code: AssistantSiteBuilderIntakeRegistryErrorCode,
  details: Readonly<Record<string, unknown>> = {}
) => new AssistantSiteBuilderIntakeRegistryError(code, details);

const assertRegistryItems = (items: readonly RegistryItem[], registryName: string) => {
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw createIntakeRegistryError("intake_registry_duplicate", {
        registryName,
        id: item.id,
      });
    }

    if (!item.label.trim() || !item.description.trim()) {
      throw createIntakeRegistryError("intake_registry_invalid", {
        registryName,
        id: item.id,
      });
    }

    seenIds.add(item.id);
  }
};

const freezeRegistry = <TItem extends RegistryItem>(
  items: readonly TItem[],
  registryName: string
): readonly TItem[] => {
  assertRegistryItems(items, registryName);
  return Object.freeze(items.map((item) => Object.freeze({ ...item }) as TItem));
};

const indexRegistryById = <TItem extends RegistryItem>(
  items: readonly TItem[],
  registryName: string
): ReadonlyMap<string, TItem> => {
  const entries = new Map<string, TItem>();

  for (const item of items) {
    if (entries.has(item.id)) {
      throw createIntakeRegistryError("intake_registry_duplicate", {
        registryName,
        id: item.id,
      });
    }

    entries.set(item.id, item);
  }

  return entries;
};

const getRegistryItem = <TItem extends RegistryItem>(
  registry: ReadonlyMap<string, TItem>,
  id: string,
  code: AssistantSiteBuilderIntakeRegistryErrorCode,
  details: Readonly<Record<string, unknown>>
): TItem => {
  const item = registry.get(id);

  if (!item) {
    throw createIntakeRegistryError(code, details);
  }

  return item;
};

export const siteBuilderIntakeModeDefinitions = freezeRegistry(
  [
    {
      id: "basic",
      label: "Basic",
      description:
        "Guided defaults for non-technical users who want the assistant to propose structure, copy, and media policy.",
      defaultStepId: "business-profile",
    },
    {
      id: "advanced",
      label: "Advanced",
      description:
        "Structured controls for users who want to choose design presets, references, and content-engine decisions.",
      defaultStepId: "business-profile",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeModeDefinition[],
  "modes"
);

export const siteBuilderIntakeStepDefinitions = freezeRegistry(
  [
    {
      id: "business-profile",
      label: "Site profile",
      description: "Captures the site name, topic, vertical, region, audience, and offer context.",
      required: true,
      modeAvailability: allModes,
    },
    {
      id: "site-goals",
      label: "Site goals",
      description: "Captures primary outcomes such as leads, bookings, sales, content, or trust.",
      required: true,
      modeAvailability: allModes,
    },
    {
      id: "site-map",
      label: "Site map",
      description: "Selects generic page roles that can represent many industries and site shapes.",
      required: true,
      modeAvailability: allModes,
      optionRegistryId: "pageRoles",
    },
    {
      id: "menu",
      label: "Menu",
      description: "Selects navigation density and conversion behavior without hardcoded pages.",
      required: true,
      modeAvailability: allModes,
      optionRegistryId: "menuPresets",
    },
    {
      id: "homepage-sections",
      label: "Homepage sections",
      description: "Selects reusable section roles for the homepage composition.",
      required: true,
      modeAvailability: allModes,
      optionRegistryId: "sectionRoles",
    },
    {
      id: "hero",
      label: "Hero",
      description: "Selects the opening section structure and emphasis.",
      required: true,
      modeAvailability: allModes,
      optionRegistryId: "heroPresets",
    },
    {
      id: "subpages",
      label: "Subpages",
      description: "Captures additional static or collection-backed pages needed for the site.",
      required: false,
      modeAvailability: allModes,
      optionRegistryId: "pageRoles",
    },
    {
      id: "media-policy",
      label: "Media policy",
      description:
        "Selects whether the assistant may use curated licensed media, existing library media, or placeholders.",
      required: true,
      modeAvailability: allModes,
      optionRegistryId: "mediaPolicies",
    },
    {
      id: "content-engine",
      label: "Content engine",
      description:
        "Chooses whether catalogs, posts, listings, or detail pages should back parts of the site.",
      required: false,
      modeAvailability: advancedOnlyModes,
      optionRegistryId: "contentEngines",
    },
    {
      id: "design-preset",
      label: "Design preset",
      description: "Captures controlled visual direction before token and widget preset mapping.",
      required: false,
      modeAvailability: advancedOnlyModes,
    },
    {
      id: "reference-intake",
      label: "Reference intake",
      description:
        "Captures safe design references as bounded evidence, not executable instructions.",
      required: false,
      modeAvailability: advancedOnlyModes,
    },
    {
      id: "review",
      label: "Review",
      description:
        "Summarizes normalized facts and requires explicit confirmation before planning execution.",
      required: true,
      modeAvailability: allModes,
      optionRegistryId: "reviewStates",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeStepDefinition[],
  "steps"
);

export const siteBuilderIntakePageRoleDefinitions = freezeRegistry(
  [
    {
      id: "home",
      label: "Home",
      description: "The primary landing page for the site.",
    },
    {
      id: "about",
      label: "About",
      description: "A company, creator, organization, or project overview page.",
    },
    {
      id: "services",
      label: "Services",
      description: "A page or collection for service offers.",
    },
    {
      id: "products",
      label: "Products",
      description: "A page or collection for products, packages, or purchasable items.",
    },
    {
      id: "portfolio",
      label: "Portfolio",
      description: "A page or collection for projects, work examples, or visual proof.",
    },
    {
      id: "case-studies",
      label: "Case studies",
      description: "A page or collection for detailed results, stories, or outcomes.",
    },
    {
      id: "pricing",
      label: "Pricing",
      description: "A page or section for plans, fees, packages, or estimates.",
    },
    {
      id: "testimonials",
      label: "Testimonials",
      description: "A page or section for reviews, references, or social proof.",
    },
    {
      id: "blog",
      label: "Blog",
      description: "A content hub for posts, updates, guides, or articles.",
    },
    {
      id: "faq",
      label: "FAQ",
      description: "A page or section for common questions and answers.",
    },
    {
      id: "team",
      label: "Team",
      description: "A page or section for people, experts, partners, or contributors.",
    },
    {
      id: "locations",
      label: "Locations",
      description: "A page or collection for offices, branches, service areas, or venues.",
    },
    {
      id: "contact",
      label: "Contact",
      description: "A page with contact details, lead capture, booking, or inquiry options.",
    },
    {
      id: "legal",
      label: "Legal",
      description: "Required policy pages such as privacy, terms, shipping, or returns.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderPageRoleId>[],
  "pageRoles"
);

export const siteBuilderIntakeMenuPresetDefinitions = freezeRegistry(
  [
    {
      id: "simple",
      label: "Simple",
      description: "A compact primary menu for small sites with a few key pages.",
    },
    {
      id: "grouped",
      label: "Grouped",
      description: "A menu with related pages grouped for broader sites.",
    },
    {
      id: "conversion-focused",
      label: "Conversion focused",
      description: "A menu that keeps the primary contact, inquiry, or purchase action prominent.",
    },
    {
      id: "content-heavy",
      label: "Content heavy",
      description: "A menu optimized for sites with blogs, catalogs, resources, or many subpages.",
    },
    {
      id: "location-aware",
      label: "Location aware",
      description:
        "A menu that emphasizes venues, locations, service areas, events, or contact paths.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderMenuPresetId>[],
  "menuPresets"
);

export const siteBuilderIntakeHeroPresetDefinitions = freezeRegistry(
  [
    {
      id: "copy-first",
      label: "Copy first",
      description: "Prioritizes headline, value proposition, and calls to action.",
    },
    {
      id: "media-first",
      label: "Media first",
      description:
        "Prioritizes a representative image or visual proof when trusted media is available.",
    },
    {
      id: "split-feature",
      label: "Split feature",
      description: "Balances copy, proof, and media in a two-column hero structure.",
    },
    {
      id: "offer-with-proof",
      label: "Offer with proof",
      description: "Pairs the main offer with metrics, reviews, logos, or featured outcomes.",
    },
    {
      id: "location-led",
      label: "Location led",
      description:
        "Highlights places, availability, contact, and credibility for location-sensitive sites.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderHeroPresetId>[],
  "heroPresets"
);

export const siteBuilderIntakeSectionRoleDefinitions = freezeRegistry(
  [
    {
      id: "value-proposition",
      label: "Value proposition",
      description: "Explains why the site visitor should trust the offer.",
    },
    {
      id: "services-overview",
      label: "Services overview",
      description: "Summarizes offers, categories, or service paths.",
    },
    {
      id: "featured-items",
      label: "Featured items",
      description: "Highlights products, services, projects, posts, packages, or locations.",
    },
    {
      id: "proof",
      label: "Proof",
      description:
        "Shows reviews, outcomes, metrics, clients, certifications, or portfolio evidence.",
    },
    {
      id: "process",
      label: "Process",
      description: "Explains steps, workflow, delivery method, or customer journey.",
    },
    {
      id: "benefits",
      label: "Benefits",
      description: "Highlights benefits, differentiators, features, or reasons to choose.",
    },
    {
      id: "comparison",
      label: "Comparison",
      description: "Compares plans, approaches, options, or before/after states.",
    },
    {
      id: "pricing",
      label: "Pricing",
      description: "Displays plans, packages, price ranges, or quote paths.",
    },
    {
      id: "faq",
      label: "FAQ",
      description: "Answers common objections and practical questions.",
    },
    {
      id: "lead-capture",
      label: "Lead capture",
      description: "Adds an inquiry, quote, booking, newsletter, or contact form path.",
    },
    {
      id: "contact",
      label: "Contact",
      description: "Shows contact details, hours, address, map, or direct contact actions.",
    },
    {
      id: "content-feed",
      label: "Content feed",
      description: "Shows posts, resources, listings, updates, or catalog entries.",
    },
    {
      id: "call-to-action",
      label: "Call to action",
      description: "Adds a focused next-step section near the end of the page.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderSectionRoleId>[],
  "sectionRoles"
);

export const siteBuilderIntakeMediaPolicyDefinitions = freezeRegistry(
  [
    {
      id: "curated",
      label: "Curated licensed media",
      description:
        "Allow backend-owned curated media profiles with license-documented public image URLs.",
    },
    {
      id: "library",
      label: "Media library only",
      description: "Use only existing media-library assets selected or confirmed by the user.",
    },
    {
      id: "placeholder",
      label: "Placeholder and review",
      description: "Create neutral media slots and review notes without attaching external media.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderMediaPolicyId>[],
  "mediaPolicies"
);

export const siteBuilderIntakeContentEngineDefinitions = freezeRegistry(
  [
    {
      id: "services",
      label: "Services",
      description: "Structured offers, service categories, or service detail pages.",
    },
    {
      id: "products",
      label: "Products",
      description: "Structured products, packages, menus, or purchasable items.",
    },
    {
      id: "portfolio",
      label: "Portfolio",
      description: "Structured projects, work examples, galleries, or showcases.",
    },
    {
      id: "case-studies",
      label: "Case studies",
      description: "Structured stories, outcomes, before/after records, or results.",
    },
    {
      id: "blog",
      label: "Blog",
      description: "Posts, updates, resources, guides, or editorial content.",
    },
    {
      id: "team",
      label: "Team",
      description: "People, contributors, experts, instructors, staff, or partners.",
    },
    {
      id: "locations",
      label: "Locations",
      description: "Venues, branches, offices, service areas, routes, or places.",
    },
    {
      id: "faq",
      label: "FAQ",
      description: "Reusable questions and answers that may appear on multiple pages.",
    },
    {
      id: "testimonials",
      label: "Testimonials",
      description: "Reviews, references, quotes, outcomes, or social proof entries.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderContentEngineId>[],
  "contentEngines"
);

export const siteBuilderIntakeReviewStateDefinitions = freezeRegistry(
  [
    {
      id: "draft",
      label: "Draft",
      description: "The session is still being edited.",
    },
    {
      id: "needs-input",
      label: "Needs input",
      description: "The assistant needs more structured input before review.",
    },
    {
      id: "ready",
      label: "Ready",
      description: "The normalized intake can be reviewed before planning.",
    },
    {
      id: "confirmed",
      label: "Confirmed",
      description: "The user confirmed the reviewed facts for planning.",
    },
    {
      id: "blocked",
      label: "Blocked",
      description: "The session contains a policy or validation issue that must be fixed.",
    },
  ] as const satisfies readonly AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderReviewStateId>[],
  "reviewStates"
);

const modeDefinitionsById = indexRegistryById(siteBuilderIntakeModeDefinitions, "modes");
const stepDefinitionsById = indexRegistryById(siteBuilderIntakeStepDefinitions, "steps");

const optionRegistries: Readonly<
  Record<AssistantSiteBuilderIntakeOptionRegistryId, readonly AnyOptionDefinition[]>
> = Object.freeze({
  pageRoles: siteBuilderIntakePageRoleDefinitions,
  menuPresets: siteBuilderIntakeMenuPresetDefinitions,
  heroPresets: siteBuilderIntakeHeroPresetDefinitions,
  sectionRoles: siteBuilderIntakeSectionRoleDefinitions,
  mediaPolicies: siteBuilderIntakeMediaPolicyDefinitions,
  contentEngines: siteBuilderIntakeContentEngineDefinitions,
  reviewStates: siteBuilderIntakeReviewStateDefinitions,
});

const optionRegistryIds = Object.freeze([...assistantSiteBuilderIntakeOptionRegistryIds]);
const optionRegistryIdSet = new Set<string>(optionRegistryIds);

const optionRegistryOptionMaps = Object.freeze(
  Object.fromEntries(
    optionRegistryIds.map((registryId) => [
      registryId,
      indexRegistryById(optionRegistries[registryId], registryId),
    ])
  )
) as Readonly<
  Record<AssistantSiteBuilderIntakeOptionRegistryId, ReadonlyMap<string, AnyOptionDefinition>>
>;

const getOptionRegistryId = (registryId: string): AssistantSiteBuilderIntakeOptionRegistryId => {
  if (!optionRegistryIdSet.has(registryId)) {
    throw createIntakeRegistryError("intake_option_registry_invalid", { registryId });
  }

  return registryId as AssistantSiteBuilderIntakeOptionRegistryId;
};

export const listSiteBuilderIntakeModes = (): readonly AssistantSiteBuilderIntakeModeDefinition[] =>
  siteBuilderIntakeModeDefinitions;

export const isSiteBuilderIntakeMode = (mode: string): mode is AssistantSiteBuilderIntakeMode =>
  modeDefinitionsById.has(mode);

export const getSiteBuilderIntakeModeDefinition = (
  mode: string
): AssistantSiteBuilderIntakeModeDefinition =>
  getRegistryItem(modeDefinitionsById, mode, "intake_mode_invalid", { mode });

export const listSiteBuilderIntakeStepDefinitions =
  (): readonly AssistantSiteBuilderIntakeStepDefinition[] => siteBuilderIntakeStepDefinitions;

export const isSiteBuilderIntakeStepId = (
  stepId: string
): stepId is (typeof assistantSiteBuilderIntakeStepIds)[number] => stepDefinitionsById.has(stepId);

export const getSiteBuilderIntakeStepDefinition = (
  stepId: string
): AssistantSiteBuilderIntakeStepDefinition =>
  getRegistryItem(stepDefinitionsById, stepId, "intake_step_invalid", { stepId });

export const listSiteBuilderIntakeStepDefinitionsForMode = (
  mode: string
): readonly AssistantSiteBuilderIntakeStepDefinition[] => {
  const modeDefinition = getSiteBuilderIntakeModeDefinition(mode);

  return Object.freeze(
    siteBuilderIntakeStepDefinitions.filter((definition) =>
      definition.modeAvailability.includes(modeDefinition.id)
    )
  );
};

export const listSiteBuilderIntakeOptionRegistryIds =
  (): readonly AssistantSiteBuilderIntakeOptionRegistryId[] => optionRegistryIds;

export const listSiteBuilderIntakeOptions = (registryId: string): readonly AnyOptionDefinition[] =>
  optionRegistries[getOptionRegistryId(registryId)];

export const getSiteBuilderIntakeOption = (
  registryId: string,
  optionId: string
): AnyOptionDefinition => {
  const resolvedRegistryId = getOptionRegistryId(registryId);

  return getRegistryItem(
    optionRegistryOptionMaps[resolvedRegistryId],
    optionId,
    "intake_option_invalid",
    {
      registryId: resolvedRegistryId,
      optionId,
    }
  );
};
