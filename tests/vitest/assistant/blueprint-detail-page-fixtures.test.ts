import { expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import { assembleComposedBlueprintPlan } from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { resolveBlueprintCandidates } from "../../../core/services/assistant/blueprints/blueprintCandidateResolver";
import type {
  BlueprintCompositionGraph,
  BlueprintCompositionNode,
} from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import { getBlueprintCapabilityRegistration } from "../../../core/services/assistant/blueprints/blueprintCapabilityRegistry";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";
import {
  buildDeterministicDetailPageId,
  normalizeDetailPageDocument,
} from "../../../core/services/content/detailPageSchema";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import {
  resolveDetailPageBlocks,
  type DetailPageBindingResolverEntry,
} from "../../../core/services/content/detailPageBindingResolver";

type DetailPageFixture = {
  key: string;
  prompt: string;
  capabilityId: string;
  intentFamily: AssistantIntentFamily;
  contentTypeId: string;
  contentTypeName: string;
  contentTypeSlug: string;
  listPath: string;
  detailPath: string;
  schema: Record<string, unknown>;
  document: DetailPageDocument;
  entryData: Record<string, unknown>;
  expectedBoundHeadline: string;
  expectedBoundKpi: string;
};

const layoutSettings = {
  wrapper: {
    container: "default",
    padding: { top: "md", bottom: "lg" },
    background: {
      color: "#ffffff",
      image: null,
      media: {
        type: "none",
        source: "external",
        src: null,
      },
    },
  },
  sections: {
    gap: "lg",
    defaults: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
    },
  },
  applyDefaultsToNewBlocks: false,
};

const textField = (title: string) => ({
  type: "string",
  title,
  xFieldType: "text",
});

const textareaField = (title: string) => ({
  type: "string",
  title,
  xFieldType: "textarea",
});

const createSchema = (fields: Record<string, Record<string, unknown>>) => ({
  type: "object",
  additionalProperties: false,
  properties: fields,
});

const buildDocument = (input: {
  id: string;
  name: string;
  contentTypeId: string;
  contentTypeSlug: string;
  titlePattern: string;
  staticHeadline: string;
  staticBody: string;
  sectionTitle: string;
  galleryCaption: string;
  ctaTitle: string;
  faqQuestion: string;
}) =>
  normalizeDetailPageDocument({
    schemaVersion: 1,
    id: input.id,
    name: input.name,
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: "published",
    titlePattern: input.titlePattern,
    settings: {
      template: "detail",
      layout: layoutSettings,
    },
    blocks: [
      {
        id: "detail-hero",
        type: "hero",
        variant: "centered",
        data: {
          headline: input.staticHeadline,
          body: input.staticBody,
          primaryCta: {
            label: "Open inquiry",
            href: "#inquiry",
          },
        },
      },
      {
        id: "detail-facts",
        type: "stats-kpi",
        data: {
          header: {
            title: "Key facts",
            description: "Composer-generated detail facts.",
          },
          items: [
            {
              id: "primary-fact",
              value: "TBD",
              label: "Primary",
              description: "Bound from entry data.",
            },
            {
              id: "secondary-fact",
              value: "Ready",
              label: "Status",
              description: "Static composer value.",
            },
          ],
        },
      },
      {
        id: "detail-section",
        type: "rich-text-section",
        data: {
          titleBlock: {
            eyebrow: "Detail",
            title: input.sectionTitle,
          },
          body: {
            blocks: [
              {
                id: "section-copy",
                heading: input.sectionTitle,
                content: input.staticBody,
              },
            ],
          },
          options: {
            outputMode: "blocks-fallback",
          },
        },
      },
      {
        id: "detail-gallery",
        type: "gallery-mosaic",
        data: {
          header: {
            title: "Gallery",
            description: "Selected visuals.",
          },
          items: [
            {
              id: "gallery-1",
              image: "https://cdn.coderso.test/detail-1.jpg",
              caption: input.galleryCaption,
              href: "#",
            },
            {
              id: "gallery-2",
              image: "https://cdn.coderso.test/detail-2.jpg",
              caption: "Secondary view",
              href: "#",
            },
          ],
        },
      },
      {
        id: "detail-faq",
        type: "faq-accordion",
        data: {
          items: [
            {
              id: "faq-1",
              question: input.faqQuestion,
              answer: "The detail page keeps canonical route ownership in site.contentRoutes.",
            },
          ],
        },
      },
      {
        id: "detail-cta",
        type: "cta-banner",
        data: {
          content: {
            badge: "Next step",
            title: input.ctaTitle,
            description: "Use the route-linked detail template for this entry.",
          },
          actions: {
            primaryCta: {
              label: "Ask now",
              href: "#inquiry",
            },
          },
        },
      },
      {
        id: "detail-form",
        type: "form-embed",
        data: {
          formId: "fixture-inquiry",
          title: "Inquiry form",
          description: "The form adapter is resolved by the forms owner at runtime.",
        },
      },
    ],
    bindings: [
      {
        id: "binding-headline",
        blockId: "detail-hero",
        propPath: "headline",
        source: {
          kind: "entry-field",
          field: "headline",
        },
        transform: "text",
        required: true,
      },
      {
        id: "binding-summary",
        blockId: "detail-hero",
        propPath: "body",
        source: {
          kind: "entry-field",
          field: "summary",
        },
        transform: "text",
        required: true,
      },
      {
        id: "binding-primary-fact",
        blockId: "detail-facts",
        propPath: "items.0.value",
        source: {
          kind: "entry-field",
          field: "primaryFact",
        },
        transform: "text",
        required: true,
      },
      {
        id: "binding-detail-href",
        blockId: "detail-cta",
        propPath: "actions.primaryCta.href",
        source: {
          kind: "computed",
          resolver: "detailHref",
        },
        transform: "text",
      },
    ],
    related: [
      {
        id: "same-type-related",
        kind: "same-content-type",
        label: "Related entries",
        limit: 3,
        excludeCurrentEntry: true,
      },
    ],
  });

const fixtures: DetailPageFixture[] = [
  {
    key: "house-project-catalog",
    prompt:
      "Create a house project catalog with detail pages, specs, price, CTA, form and related projects.",
    capabilityId: "house-projects-catalog",
    intentFamily: "catalog_showcase",
    contentTypeId: "19000000-0000-5000-8000-000000000101",
    contentTypeName: "House Projects",
    contentTypeSlug: "house-projects",
    listPath: "/projekty-domow",
    detailPath: "/projekty-domow/:slug",
    schema: createSchema({
      headline: textField("Headline"),
      summary: textareaField("Summary"),
      primaryFact: textField("Price"),
      galleryCaption: textField("Gallery caption"),
    }),
    entryData: {
      headline: "Modern house M42",
      summary: "A family house with a compact floor plan.",
      primaryFact: "from 420k PLN",
      galleryCaption: "Garden elevation",
    },
    expectedBoundHeadline: "Modern house M42",
    expectedBoundKpi: "from 420k PLN",
    document: buildDocument({
      id: buildDeterministicDetailPageId({
        contentTypeId: "19000000-0000-5000-8000-000000000101",
        pageRole: "supporting-page",
        compositionKey: "house-project-catalog",
      }),
      name: "House project detail",
      contentTypeId: "19000000-0000-5000-8000-000000000101",
      contentTypeSlug: "house-projects",
      titlePattern: "{{ title }} | House project",
      staticHeadline: "House project detail",
      staticBody: "Specification, pricing, gallery, CTA and inquiry form.",
      sectionTitle: "Specification table",
      galleryCaption: "Garden elevation",
      ctaTitle: "Ask about this house project",
      faqQuestion: "Can this project be customized?",
    }),
  },
  {
    key: "product-catalog",
    prompt:
      "Create a product catalog detail page with gallery, specs and inquiry form; keep checkout gated.",
    capabilityId: "product-catalog",
    intentFamily: "product_catalog",
    contentTypeId: "19000000-0000-5000-8000-000000000102",
    contentTypeName: "Products",
    contentTypeSlug: "products",
    listPath: "/products",
    detailPath: "/products/:slug",
    schema: createSchema({
      headline: textField("Product headline"),
      summary: textareaField("Product summary"),
      primaryFact: textField("Price"),
      galleryCaption: textField("Gallery caption"),
    }),
    entryData: {
      headline: "Edge Router Pro",
      summary: "Secure networking hardware for business sites.",
      primaryFact: "$799",
      galleryCaption: "Ports and casing",
    },
    expectedBoundHeadline: "Edge Router Pro",
    expectedBoundKpi: "$799",
    document: buildDocument({
      id: buildDeterministicDetailPageId({
        contentTypeId: "19000000-0000-5000-8000-000000000102",
        pageRole: "supporting-page",
        compositionKey: "product-catalog",
      }),
      name: "Product detail",
      contentTypeId: "19000000-0000-5000-8000-000000000102",
      contentTypeSlug: "products",
      titlePattern: "{{ title }} | Product",
      staticHeadline: "Product detail",
      staticBody: "Gallery, product specs and inquiry form.",
      sectionTitle: "Technical specification",
      galleryCaption: "Ports and casing",
      ctaTitle: "Ask about this product",
      faqQuestion: "Is checkout included?",
    }),
  },
  {
    key: "services-directory",
    prompt:
      "Create a services directory detail page with offer, process, FAQ and CTA; keep booking gated.",
    capabilityId: "services-directory",
    intentFamily: "services_directory",
    contentTypeId: "19000000-0000-5000-8000-000000000103",
    contentTypeName: "Services",
    contentTypeSlug: "services",
    listPath: "/services",
    detailPath: "/services/:slug",
    schema: createSchema({
      headline: textField("Service headline"),
      summary: textareaField("Offer summary"),
      primaryFact: textField("Timeline"),
      galleryCaption: textField("Process caption"),
    }),
    entryData: {
      headline: "Implementation workshop",
      summary: "Discovery, architecture and launch plan.",
      primaryFact: "2 weeks",
      galleryCaption: "Workshop process",
    },
    expectedBoundHeadline: "Implementation workshop",
    expectedBoundKpi: "2 weeks",
    document: buildDocument({
      id: buildDeterministicDetailPageId({
        contentTypeId: "19000000-0000-5000-8000-000000000103",
        pageRole: "supporting-page",
        compositionKey: "services-directory",
      }),
      name: "Service detail",
      contentTypeId: "19000000-0000-5000-8000-000000000103",
      contentTypeSlug: "services",
      titlePattern: "{{ title }} | Service",
      staticHeadline: "Service detail",
      staticBody: "Offer, delivery process, FAQ and CTA.",
      sectionTitle: "Delivery process",
      galleryCaption: "Workshop process",
      ctaTitle: "Request this service",
      faqQuestion: "Can booking be enabled now?",
    }),
  },
  {
    key: "portfolio-case-study",
    prompt:
      "Create a portfolio case study detail page with challenge, solution, results, testimonial, gallery and CTA.",
    capabilityId: "portfolio-projects",
    intentFamily: "portfolio_projects",
    contentTypeId: "19000000-0000-5000-8000-000000000104",
    contentTypeName: "Case Studies",
    contentTypeSlug: "case-studies",
    listPath: "/case-studies",
    detailPath: "/case-studies/:slug",
    schema: createSchema({
      headline: textField("Case headline"),
      summary: textareaField("Result summary"),
      primaryFact: textField("Result metric"),
      galleryCaption: textField("Gallery caption"),
    }),
    entryData: {
      headline: "Marketplace rebuild",
      summary: "Challenge, solution and measurable outcome.",
      primaryFact: "+64% conversion",
      galleryCaption: "Before and after",
    },
    expectedBoundHeadline: "Marketplace rebuild",
    expectedBoundKpi: "+64% conversion",
    document: buildDocument({
      id: buildDeterministicDetailPageId({
        contentTypeId: "19000000-0000-5000-8000-000000000104",
        pageRole: "supporting-page",
        compositionKey: "portfolio-case-study",
      }),
      name: "Case study detail",
      contentTypeId: "19000000-0000-5000-8000-000000000104",
      contentTypeSlug: "case-studies",
      titlePattern: "{{ title }} | Case study",
      staticHeadline: "Case study detail",
      staticBody: "Challenge, solution, result, testimonial, gallery and CTA.",
      sectionTitle: "Challenge and solution",
      galleryCaption: "Before and after",
      ctaTitle: "Discuss a similar project",
      faqQuestion: "Can this be reused for other case studies?",
    }),
  },
];

const createEntry = (fixture: DetailPageFixture): DetailPageBindingResolverEntry => ({
  id: `${fixture.key}-entry`,
  typeId: fixture.contentTypeId,
  title: `${fixture.contentTypeName} sample`,
  slug: `${fixture.key}-sample`,
  status: "published",
  data: fixture.entryData,
  tags: [],
  publishedAt: new Date("2026-05-10T09:00:00.000Z"),
  scheduledAt: null,
  createdAt: new Date("2026-05-10T08:00:00.000Z"),
  updatedAt: new Date("2026-05-10T09:00:00.000Z"),
  author: {
    id: "fixture-author",
    name: "Fixture Author",
    email: "fixture-author@example.com",
  },
});

const createFixtureActions = (fixture: DetailPageFixture): AssistantPlannedAction[] => [
  {
    id: `${fixture.key}-content-type`,
    type: "content-type.upsert",
    title: `Create ${fixture.contentTypeName}`,
    description: `Create the ${fixture.contentTypeName} content type.`,
    input: {
      slug: fixture.contentTypeSlug,
      name: fixture.contentTypeName,
      schema: fixture.schema,
    },
  },
  {
    id: `${fixture.key}-detail-page`,
    type: "detail-page.upsert",
    title: `Create ${fixture.contentTypeName} detail page`,
    description: `Create the ${fixture.contentTypeName} route-linked detail template.`,
    input: {
      document: fixture.document,
      expectedExistingId: fixture.document.id,
    },
  },
  {
    id: `${fixture.key}-content-route`,
    type: "setting.content-route.upsert",
    title: `Link ${fixture.contentTypeName} public route`,
    description: `Link the canonical public route to the detail-page document.`,
    input: {
      typeSlug: fixture.contentTypeSlug,
      listPath: fixture.listPath,
      detailPath: fixture.detailPath,
      enabled: true,
      detailPageId: fixture.document.id,
    },
  },
];

const createCompositionNode = (
  fixture: DetailPageFixture,
  score: number
): BlueprintCompositionNode => {
  const registration = getBlueprintCapabilityRegistration(fixture.capabilityId);
  if (!registration) throw new Error(`registration_missing:${fixture.capabilityId}`);
  return {
    capabilityId: registration.capability.id,
    role: "primary",
    score,
    matchedSignals: [`fixture:${fixture.key}`],
    reasons: [`Fixture ${fixture.key} validates local detail-page composition.`],
    capability: registration.capability,
  };
};

const assembleFixturePlan = (fixture: DetailPageFixture): AssistantActionPlan => {
  const primary = createCompositionNode(fixture, 100);
  const actions = createFixtureActions(fixture);
  const fragments = [
    {
      capabilityId: primary.capability.id,
      planId: `plan-${fixture.key}`,
      title: `${fixture.contentTypeName} detail fixture`,
      assumptions: [
        "Local deterministic fixture uses a pre-existing contentTypeId so detail-page.upsert can stay executable without provider target resolution.",
      ],
      actions,
    },
  ];
  const graph = {
    primary,
    adjuncts: [],
    gated: [],
    resources: [],
    conflicts: resolveBlueprintCompositionConflicts({ fragments }),
    fragments,
    selectedCapabilityIds: [primary.capability.id],
  } satisfies BlueprintCompositionGraph;

  const plan = assembleComposedBlueprintPlan({
    prompt: fixture.prompt,
    promptKind: "setup_request",
    intentFamily: fixture.intentFamily,
    graph,
  });
  if (!plan) throw new Error(`fixture_plan_missing:${fixture.key}`);
  return plan;
};

test.each(fixtures)("composes a valid route-linked detail page for $key", async (fixture) => {
  const plan = assembleFixturePlan(fixture);

  expect(plan.status).toBe("ready");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
  ]);
  expect(
    plan.actions.find((action) => action.type === "setting.content-route.upsert")
  ).toMatchObject({
    input: {
      typeSlug: fixture.contentTypeSlug,
      detailPageId: fixture.document.id,
    },
  });

  const detailPageAction = plan.actions.find((action) => action.type === "detail-page.upsert");
  expect(detailPageAction).toMatchObject({
    type: "detail-page.upsert",
    input: {
      expectedExistingId: fixture.document.id,
      document: {
        id: fixture.document.id,
        contentTypeId: fixture.contentTypeId,
        contentTypeSlug: fixture.contentTypeSlug,
        status: "published",
      },
    },
  });

  const resolved = await resolveDetailPageBlocks({
    document: fixture.document,
    entry: createEntry(fixture),
    contentType: {
      id: fixture.contentTypeId,
      slug: fixture.contentTypeSlug,
      schema: fixture.schema,
    },
    preview: false,
    contentRoutes: [
      {
        type: fixture.contentTypeSlug,
        listPath: fixture.listPath,
        detailPath: fixture.detailPath,
        enabled: true,
        detailPageId: fixture.document.id,
      },
    ],
  });
  expect(resolved.find((block) => block.id === "detail-hero")?.data).toMatchObject({
    headline: fixture.expectedBoundHeadline,
    body: fixture.entryData.summary,
  });
  expect(resolved.find((block) => block.id === "detail-facts")?.data).toMatchObject({
    items: expect.arrayContaining([
      expect.objectContaining({
        id: "primary-fact",
        value: fixture.expectedBoundKpi,
      }),
    ]),
  });
});

test("detail-page fixture rejects bindings to missing schema fields", async () => {
  const fixture = fixtures[0]!;
  const document = normalizeDetailPageDocument({
    ...fixture.document,
    bindings: [
      ...fixture.document.bindings,
      {
        id: "binding-missing-field",
        blockId: "detail-hero",
        propPath: "subhead",
        source: {
          kind: "entry-field",
          field: "doesNotExist",
        },
        transform: "text",
        required: true,
      },
    ],
  });

  await expect(
    resolveDetailPageBlocks({
      document,
      entry: createEntry(fixture),
      contentType: {
        id: fixture.contentTypeId,
        slug: fixture.contentTypeSlug,
        schema: fixture.schema,
      },
      preview: false,
    })
  ).rejects.toMatchObject({
    code: "detail_page_binding_field_missing",
    bindingId: "binding-missing-field",
    field: "doesNotExist",
  });
});

test("detail-page fixture rejects secret-like entry-field bindings during normalization", () => {
  const fixture = fixtures[0]!;
  expect(() =>
    normalizeDetailPageDocument({
      ...fixture.document,
      bindings: [
        {
          id: "binding-secret-field",
          blockId: "detail-hero",
          propPath: "headline",
          source: {
            kind: "entry-field",
            field: "apiToken",
          },
          transform: "text",
        },
      ],
    })
  ).toThrow("detail_page_document_invalid");
});

test("detail-page fixture returns needs_input for duplicate canonical routes", () => {
  const fixture = fixtures[1]!;
  const primary = createCompositionNode(fixture, 100);
  const actions = createFixtureActions(fixture);
  const conflictingRoute = {
    ...actions[2]!,
    id: "conflicting-content-route",
    input: {
      ...actions[2]!.input,
      detailPath: "/products/:id",
    },
  } as AssistantPlannedAction;
  const fragments = [
    {
      capabilityId: primary.capability.id,
      planId: "plan-product-route-a",
      title: "Product route A",
      assumptions: [],
      actions,
    },
    {
      capabilityId: `${primary.capability.id}-route-addon`,
      planId: "plan-product-route-b",
      title: "Product route B",
      assumptions: [],
      actions: [conflictingRoute],
    },
  ];
  const graph = {
    primary,
    adjuncts: [],
    gated: [],
    resources: [],
    conflicts: resolveBlueprintCompositionConflicts({ fragments }),
    fragments,
    selectedCapabilityIds: [primary.capability.id, "route-addon"],
  } satisfies BlueprintCompositionGraph;

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with conflicting detail routes.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph,
  });

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "needs_input",
    actions: [],
  });
  expect(plan?.questions[0]?.id).toContain("blueprint-route-conflict");
});

test("detail-page fixture rejects provider-injected action payload outside document", () => {
  const fixture = fixtures[1]!;
  expect(() =>
    normalizeAssistantActionPlan({
      id: "plan-provider-injected-detail-page",
      status: "ready",
      intentId: "provider-injected-detail-page",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      title: "Provider injected detail page",
      answer: "Rejected.",
      summary: "Rejected.",
      confidence: 0.4,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "detail-page-provider-injected",
          type: "detail-page.upsert",
          title: "Provider injected detail page",
          description: "Provider tried to add top-level state.",
          input: {
            status: "published",
            document: fixture.document,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("gated checkout and booking domains stay review metadata only", () => {
  const checkoutCandidates = resolveBlueprintCandidates({
    prompt: "Create a product catalog with checkout and payment.",
  });
  const checkoutPlan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with checkout and payment.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: buildBlueprintCompositionGraph({
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      candidates: checkoutCandidates,
    }),
  });

  expect(checkoutCandidates.map((candidate) => candidate.capabilityId)).toContain(
    "checkout-payment"
  );
  expect(checkoutPlan).toMatchObject({
    status: "needs_input",
    responseKind: "gated",
    actions: [],
  });
  expect(checkoutPlan?.answer).toContain("Checkout and payment remains gated");

  const bookingCandidates = resolveBlueprintCandidates({
    prompt: "Create a services directory with booking calendar and reservations.",
  });
  const bookingPlan = assembleComposedBlueprintPlan({
    prompt: "Create a services directory with booking calendar and reservations.",
    promptKind: "setup_request",
    intentFamily: "services_directory",
    graph: buildBlueprintCompositionGraph({
      promptKind: "setup_request",
      intentFamily: "services_directory",
      candidates: bookingCandidates,
    }),
  });

  expect(bookingCandidates.map((candidate) => candidate.capabilityId)).toContain("booking-service");
  expect(bookingPlan).toMatchObject({
    status: "needs_input",
    responseKind: "gated",
    actions: [],
  });
  expect(bookingPlan?.answer).toContain("Booking setup remains gated");
});
