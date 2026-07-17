import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import { createTestPageData } from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan deletes pages through explicit delete actions", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "contact",
    data: createTestPageData(),
    authorId: "user-1",
  });
  await deps.publishPage(page.id, "user-1", createTestPageData());
  const plan: AssistantActionPlan = {
    id: "plan-delete-contact-page",
    status: "ready",
    intentId: "page-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Contact",
    answer: "I can delete the selected page.",
    summary: "Delete active page Contact.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-delete-contact",
        type: "page.delete",
        title: "Delete Contact",
        description: "Delete selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "published",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings).toContain(
    "This page is published and may be visible on the public site."
  );

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted page "Contact".');
  expect(await deps.getPage(page.id)).toBeNull();
});

test("executeAssistantActionPlan updates page metadata and preserves page sections", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "/contact",
    data: createTestPageData([
      createPageSectionV2("hero", {
        id: "hero-section",
        name: "Hero",
        blocks: [
          createPageBlockV2("heading", {
            id: "hero",
            props: { text: "Hello", level: "h1", align: "left" },
          }),
        ],
      }),
    ]),
  });
  const plan: AssistantActionPlan = {
    id: "plan-update-contact-page",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact",
    answer: "I can update the selected page.",
    summary: "Update active page metadata.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-contact",
        type: "page.update",
        title: "Update Contact",
        description: "Update selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "draft",
          patch: {
            title: "Contact Us",
            slug: "/contact-us",
            settings: {
              showInNav: false,
              template: "landing",
              seo: {
                title: "Contact Us",
                description: "Reach our team.",
              },
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(executed.results[0]?.message).toBe('Updated page "Contact Us".');
  expect(deps.__state.pages[0]?.title).toBe("Contact Us");
  expect(deps.__state.pages[0]?.slug).toBe("/contact-us");
  expect(
    (
      deps.__state.pages[0]?.currentData.sections as Array<{
        blocks?: Array<{ id?: string }>;
      }>
    )[0]?.blocks?.[0]?.id
  ).toBe("hero");
  expect((deps.__state.pages[0]?.currentData.settings as { showInNav?: boolean })?.showInNav).toBe(
    false
  );
});

test("executeAssistantActionPlan accepts normalized page slug matches for update guards", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "contact",
    data: createTestPageData([
      createPageSectionV2("hero", {
        id: "hero-section",
        name: "Hero",
        blocks: [
          createPageBlockV2("heading", {
            id: "hero",
            props: { text: "Hello", level: "h1", align: "left" },
          }),
        ],
      }),
    ]),
  });
  const plan: AssistantActionPlan = {
    id: "plan-update-contact-page-normalized-slug",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact",
    answer: "I can update the selected page.",
    summary: "Update active page metadata.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-contact-normalized-slug",
        type: "page.update",
        title: "Update Contact",
        description: "Update selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "draft",
          patch: {
            title: "Contact L04",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes[0]?.conflicts).toEqual([]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-normalized-slug-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.pages[0]?.title).toBe("Contact L04");
});

test("executeAssistantActionPlan refreshes published page state when updating a published page", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "contact",
    data: createTestPageData([
      createPageSectionV2("hero", {
        id: "hero-section",
        name: "Hero",
        blocks: [
          createPageBlockV2("heading", {
            id: "hero",
            props: { text: "Old public title", level: "h1", align: "left" },
          }),
        ],
      }),
    ]),
  });
  await deps.publishPage(page.id, "user-1", page.currentData);

  const plan: AssistantActionPlan = {
    id: "plan-update-published-contact-page",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact",
    answer: "I can update the selected page.",
    summary: "Update active page metadata.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-published-contact",
        type: "page.update",
        title: "Update Contact",
        description: "Update selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "published",
          patch: {
            title: "Contact L04",
            settings: {
              showInNav: false,
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-published-refresh-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.pages[0]?.title).toBe("Contact L04");
  expect(deps.__state.pages[0]?.publishedData).toEqual(deps.__state.pages[0]?.currentData);
  expect(
    (deps.__state.pages[0]?.publishedData?.settings as { showInNav?: boolean })?.showInNav
  ).toBe(false);
});

test("executeAssistantActionPlan does not publish unrelated pending draft page data", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "contact",
    data: createTestPageData([
      createPageSectionV2("hero", {
        id: "public-section",
        name: "Hero",
        blocks: [
          createPageBlockV2("heading", {
            id: "public-hero",
            props: { text: "Published", level: "h1", align: "left" },
          }),
        ],
      }),
    ]),
  });
  await deps.publishPage(page.id, "user-1", page.currentData);
  await deps.updatePage(page.id, {
    data: {
      ...createTestPageData([
        createPageSectionV2("hero", {
          id: "draft-section",
          name: "Hero",
          blocks: [
            createPageBlockV2("heading", {
              id: "draft-hero",
              props: { text: "Pending draft", level: "h1", align: "left" },
            }),
          ],
        }),
      ]),
      settings: { template: "page-v2", showInNav: true, draftOnly: true },
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-update-published-contact-page-draft-safe",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact",
    answer: "I can update the selected page.",
    summary: "Update active page metadata.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-published-contact-draft-safe",
        type: "page.update",
        title: "Update Contact",
        description: "Update selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "published",
          patch: {
            settings: {
              showInNav: false,
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-published-draft-safe-1",
    },
    deps
  );

  const currentData = deps.__state.pages[0]?.currentData as {
    sections?: Array<{ blocks?: Array<{ id?: string }> }>;
    settings?: { showInNav?: boolean; draftOnly?: boolean };
  };
  const publishedData = deps.__state.pages[0]?.publishedData as {
    sections?: Array<{ blocks?: Array<{ id?: string }> }>;
    settings?: { showInNav?: boolean; draftOnly?: boolean };
  };

  expect(currentData.sections?.[0]?.blocks?.[0]?.id).toBe("draft-hero");
  expect(currentData.settings?.draftOnly).toBe(true);
  expect(currentData.settings?.showInNav).toBe(false);
  expect(publishedData.sections?.[0]?.blocks?.[0]?.id).toBe("public-hero");
  expect(publishedData.settings?.draftOnly).toBeUndefined();
  expect(publishedData.settings?.showInNav).toBe(false);
});

test("executeAssistantActionPlan publishes page updates through page service", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Landing",
    slug: "/landing",
    data: createTestPageData(),
  });
  const plan: AssistantActionPlan = {
    id: "plan-publish-landing-page",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Publish Landing",
    answer: "I can publish the selected page.",
    summary: "Publish active page.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-landing",
        type: "page.update",
        title: "Publish Landing",
        description: "Publish selected page.",
        input: {
          id: page.id,
          title: "Landing",
          slug: "/landing",
          expectedStatus: "draft",
          patch: {
            status: "published",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.warnings[0]).toContain("public site");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-publish-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.pages[0]?.status).toBe("published");
  expect(deps.__state.pages[0]?.publishedData).not.toBeNull();
});
