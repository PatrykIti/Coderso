import { expect, test } from "bun:test";
import { buildLeadCaptureSitePlan } from "../../../core/services/assistant/blueprints/leadCaptureBlueprint";
import { buildEditorialContentHubPlan } from "../../../core/services/assistant/blueprints/editorialContentHubBlueprint";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import { readPageBlockTypes } from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan upserts safe form automation without duplicates", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Contact",
    slug: "contact",
    status: "published",
    submissionAccess: "public",
  });
  const plan: AssistantActionPlan = {
    id: "plan-form-automation",
    status: "ready",
    intentId: "form-automation",
    promptKind: "refinement_request",
    intentFamily: "lead_capture_site",
    title: "Set form automation",
    answer: "I can set a form automation.",
    summary: "Set success message automation.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-success",
        type: "form.automation.upsert",
        title: "Set success message",
        description: "Set form success message automation.",
        input: {
          formId: form.id,
          action: {
            id: "success-message",
            type: "success_message",
            label: "Show success",
            enabled: true,
            continueOnError: true,
            condition: { operator: "always" },
            config: {
              message: "Thanks for your message.",
            },
            orderIndex: 0,
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-automation-1",
    },
    deps
  );

  expect(deps.__state.formActions.get(form.id)).toHaveLength(1);
  expect(deps.__state.formActions.get(form.id)?.[0]?.config).toEqual({
    message: "Thanks for your message.",
  });

  const formAction = plan.actions[0];
  if (!formAction || formAction.type !== "form.automation.upsert") {
    throw new Error("missing_form_action");
  }
  const updatedAction: Extract<AssistantPlannedAction, { type: "form.automation.upsert" }> = {
    ...formAction,
    input: {
      ...formAction.input,
      action: {
        ...formAction.input.action,
        config: {
          message: "Thanks. We will reply soon.",
        },
      },
    },
  };
  const updatedPlan: AssistantActionPlan = {
    ...plan,
    id: "plan-form-automation-update",
    actions: [updatedAction],
  };

  await executeAssistantActionPlan(
    {
      plan: updatedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-automation-2",
    },
    deps
  );
  expect(deps.__state.formActions.get(form.id)).toHaveLength(1);
  expect(deps.__state.formActions.get(form.id)?.[0]?.config).toEqual({
    message: "Thanks. We will reply soon.",
  });

  const noopPreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan creates lead capture form and landing page", async () => {
  const deps = createDeps();
  const plan = buildLeadCaptureSitePlan();

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes.map((change) => change.targetType)).toEqual(["form", "page"]);

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-lead-capture-1",
    },
    deps
  );

  expect(deps.__state.forms).toHaveLength(1);
  expect(deps.__state.forms[0]?.slug).toBe("lead-capture-inquiry");
  expect(deps.__state.formFields.get("form-1")).toHaveLength(4);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.pages[0]?.slug).toBe("/kontakt");
  expect(readPageBlockTypes(deps.__state.pages[0]?.currentData)).toEqual(
    expect.arrayContaining(["heading", "text", "form"])
  );

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-lead-capture-2",
    },
    deps
  );
  expect(deps.__state.forms).toHaveLength(1);
  expect(deps.__state.pages).toHaveLength(1);
});

test("executeAssistantActionPlan creates editorial hub page without post mutations", async () => {
  const deps = createDeps();
  const plan = buildEditorialContentHubPlan();

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-editorial-hub-1",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.pages[0]?.slug).toBe("/blog");
  const blockTypes = readPageBlockTypes(deps.__state.pages[0]?.currentData);
  expect(blockTypes).toEqual(expect.arrayContaining(["heading", "text", "list", "button"]));
  expect(blockTypes).not.toContain("collection");
});
