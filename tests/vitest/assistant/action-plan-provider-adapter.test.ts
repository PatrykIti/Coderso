import { expect, test } from "vitest";

import { adaptProviderDraftPlan } from "../../../core/services/assistant/actionPlanProviderAdapter";

const validContentTypeAction = {
  id: "content-type-products",
  type: "content-type.upsert",
  title: "Create products",
  description: "Create product content model.",
  input: {
    slug: "products",
    name: "Products",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
      },
    },
  },
};

test("adaptProviderDraftPlan maps valid provider drafts through strict schema", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "create product catalog",
    draft: {
      intentId: "product-catalog",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      title: "Product Catalog",
      answer: "I can create a product catalog.",
      summary: "Create products content type.",
      confidence: 0.8,
      assumptions: ["Use products as the catalog domain."],
      actions: [validContentTypeAction],
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.actions[0]?.type).toBe("content-type.upsert");
});

test("adaptProviderDraftPlan returns questions for unsupported actions", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "create product catalog",
    draft: {
      actions: [
        {
          type: "database.drop",
          input: {},
        },
      ],
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.actions).toHaveLength(0);
  expect(plan.summary).toContain("unsupported actions");
});

test("adaptProviderDraftPlan treats contract-only actions as unsupported until executable", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "create sample entries",
    draft: {
      actions: [
        {
          type: "entry.sample.create",
          input: {
            contentTypeSlug: "products",
            samples: [],
          },
        },
      ],
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.summary).toContain("unsupported actions");
});

test("adaptProviderDraftPlan accepts executable entry draft actions", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "create sample entry",
    draft: {
      actions: [
        {
          type: "entry.upsert-draft",
          input: {
            contentTypeSlug: "products",
            title: "Sample",
            slug: "sample",
            values: {
              title: "Sample",
            },
          },
        },
      ],
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("entry.upsert-draft");
});

test("adaptProviderDraftPlan accepts executable menu item actions", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "add products to navigation",
    draft: {
      actions: [
        {
          type: "menu.item.upsert",
          input: {
            menuId: "menu-primary",
            label: "Products",
            href: "/products",
          },
        },
      ],
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("menu.item.upsert");
});

test("adaptProviderDraftPlan accepts executable seo document actions", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "update page SEO",
    draft: {
      actions: [
        {
          type: "seo.document.upsert",
          input: {
            targetType: "page",
            targetId: "page-products",
            seo: {
              title: "Products",
              description: "Browse products.",
            },
          },
        },
      ],
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("seo.document.upsert");
});

test("adaptProviderDraftPlan accepts executable media reference actions", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "attach hero image",
    draft: {
      actions: [
        {
          type: "media.reference.attach",
          input: {
            mediaId: "media-1",
            targetType: "entry",
            targetId: "entry-1",
            field: "heroImage",
          },
        },
      ],
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]?.type).toBe("media.reference.attach");
});

test("adaptProviderDraftPlan rejects unknown fields and secret-like keys", () => {
  const unknown = adaptProviderDraftPlan({
    prompt: "create product catalog",
    draft: {
      actions: [validContentTypeAction],
      debug: true,
    },
  });

  const secret = adaptProviderDraftPlan({
    prompt: "create product catalog",
    draft: {
      actions: [validContentTypeAction],
      apiKey: "never",
    },
  });

  expect(unknown.status).toBe("needs_input");
  expect(unknown.summary).toContain("unknown fields");
  expect(secret.status).toBe("needs_input");
  expect(secret.summary).toContain("secret-like keys");
});

test("adaptProviderDraftPlan returns typed provider questions when no actions exist", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "create catalog",
    draft: {
      questions: [
        {
          id: "catalog-kind",
          label: "Catalog kind",
          description: "What records should I create?",
          required: true,
        },
      ],
      actions: [],
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.questions).toEqual([
    {
      id: "catalog-kind",
      label: "Catalog kind",
      description: "What records should I create?",
      required: true,
    },
  ]);
});

test("adaptProviderDraftPlan recovers from malformed drafts", () => {
  const plan = adaptProviderDraftPlan({
    prompt: "create catalog",
    draft: "not-json-object",
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.questions[0]?.id).toBe("provider-draft-clarification");
});
