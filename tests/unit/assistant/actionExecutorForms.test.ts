import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan deletes empty forms through explicit delete actions", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Contact Form",
    slug: "contact-form",
    status: "draft",
    description: "Contact intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  const plan: AssistantActionPlan = {
    id: "plan-form-delete",
    status: "ready",
    intentId: "form-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Contact Form",
    answer: "I can delete the selected form.",
    summary: "Delete empty form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-delete-1",
        type: "form.delete",
        title: "Delete Contact Form",
        description: "Delete selected form.",
        input: {
          id: form.id,
          name: "Contact Form",
          slug: "contact-form",
          expectedStatus: "draft",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.conflicts).toEqual([]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted form "Contact Form".');
  expect(deps.__state.forms).toHaveLength(0);
});

test("executeAssistantActionPlan blocks form hard delete when submissions exist", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Lead Capture",
    slug: "lead-capture",
    status: "published",
    description: "Lead intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  deps.__state.formSubmissionCounts.set(form.id, 2);
  const plan: AssistantActionPlan = {
    id: "plan-form-delete-blocked",
    status: "ready",
    intentId: "form-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Lead Capture",
    answer: "I can delete the selected form.",
    summary: "Delete selected form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-delete-1",
        type: "form.delete",
        title: "Delete Lead Capture",
        description: "Delete selected form.",
        input: {
          id: form.id,
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.warnings[0]).toContain("2 submissions");
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");
  expect(preview.readyToExecute).toBe(false);

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-form-delete-blocked-1",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");

  expect(deps.__state.forms).toHaveLength(1);
});

test("executeAssistantActionPlan archives forms while retaining submissions", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Lead Capture",
    slug: "lead-capture",
    status: "published",
    description: "Lead intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  deps.__state.formSubmissionCounts.set(form.id, 3);
  const plan: AssistantActionPlan = {
    id: "plan-form-archive",
    status: "ready",
    intentId: "form-archive",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Archive Lead Capture",
    answer: "I can archive the selected form.",
    summary: "Archive selected form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-archive-1",
        type: "form.archive",
        title: "Archive Lead Capture",
        description: "Archive selected form.",
        input: {
          id: form.id,
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");
  expect(preview.changes[0]?.warnings[0]).toContain("submissions are retained");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-archive-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(executed.results[0]?.message).toBe('Archived form "Lead Capture".');
  expect(deps.__state.forms[0]?.status).toBe("archived");
  expect(deps.__state.formSubmissionCounts.get(form.id)).toBe(3);
});

test("executeAssistantActionPlan updates forms without reading submissions", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Lead Capture",
    slug: "lead-capture",
    status: "published",
    description: "Lead intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  deps.__state.formSubmissionCounts.set(form.id, 3);
  const plan: AssistantActionPlan = {
    id: "plan-form-update",
    status: "ready",
    intentId: "form-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Lead Capture",
    answer: "I can update the selected form.",
    summary: "Update selected form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-update-1",
        type: "form.update",
        title: "Update Lead Capture",
        description: "Update selected form.",
        input: {
          id: form.id,
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
          patch: {
            name: "Lead Capture Updated",
            submissionAccess: "internal",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.forms[0]?.name).toBe("Lead Capture Updated");
  expect(deps.__state.forms[0]?.submissionAccess).toBe("internal");
  expect(deps.__state.formSubmissionCounts.get(form.id)).toBe(3);
});
