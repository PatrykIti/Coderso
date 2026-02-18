import { afterAll, beforeEach, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  formActionRuns,
  formActions,
  formFields,
  forms,
  formSubmissions,
} from "../../../core/db/schema";
import { createForm } from "../../../core/services/forms/formsService";
import {
  createFormActionRun,
  listFormActionRuns,
  listFormActions,
  setFormActions,
} from "../../../core/services/forms/formActionsService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(formActionRuns);
  await db.delete(formActions);
  await db.delete(formSubmissions);
  await db.delete(formFields);
  await db.delete(forms);
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("setFormActions stores normalized ordered actions", async () => {
  const form = await createForm({ name: "Automation test" });

  await setFormActions(form.id, [
    {
      type: "redirect",
      label: "Redirect",
      config: { url: "/thank-you" },
      orderIndex: 2,
    },
    {
      type: "success_message",
      label: "Success message",
      config: { message: "Thanks" },
      orderIndex: 0,
    },
  ]);

  const rows = await listFormActions(form.id);
  expect(rows).toHaveLength(2);
  expect(rows[0]?.type).toBe("success_message");
  expect(rows[0]?.orderIndex).toBe(0);
  expect(rows[1]?.type).toBe("redirect");
  expect(rows[1]?.orderIndex).toBe(1);
});

testIfDb("createFormActionRun persists run and listFormActionRuns returns it", async () => {
  const form = await createForm({ name: "Action runs" });
  const [action] = await setFormActions(form.id, [
    {
      type: "success_message",
      config: { message: "Thanks" },
    },
  ]);

  await createFormActionRun({
    formId: form.id,
    actionId: action?.id,
    actionType: "success_message",
    actionLabel: "Success message",
    status: "success",
    actionCondition: { operator: "always" },
    actionConfig: { message: "Thanks" },
    submissionPayload: { email: "lead@example.com" },
    responsePayload: { delivered: true },
  });

  const runs = await listFormActionRuns(form.id);
  expect(runs).toHaveLength(1);
  expect(runs[0]?.status).toBe("success");
  expect(runs[0]?.responsePayload).toEqual({ delivered: true });
});
