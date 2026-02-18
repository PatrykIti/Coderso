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
import { createForm, setFormFields } from "../../../core/services/forms/formsService";
import { submitForm } from "../../../core/services/forms/submissionService";

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

testIfDb("submitForm validates required fields", async () => {
  const form = await createForm({ name: "Support" });
  await setFormFields(form.id, [
    { type: "text", label: "Name", name: "name", required: true },
    { type: "email", label: "Email", name: "email", required: true },
  ]);

  await expect(submitForm(form.id, { name: "Patryk" })).rejects.toThrow(
    "form_payload_required"
  );
});

testIfDb("submitForm accepts valid payload", async () => {
  const form = await createForm({ name: "Support" });
  await setFormFields(form.id, [
    { type: "text", label: "Name", name: "name", required: true },
    { type: "email", label: "Email", name: "email", required: true },
  ]);

  const submission = await submitForm(form.id, {
    name: "Patryk",
    email: "patryk@example.com",
  });

  expect(submission?.formId).toBe(form.id);
});

testIfDb("submitForm rejects unknown fields", async () => {
  const form = await createForm({ name: "Support" });
  await setFormFields(form.id, [
    { type: "text", label: "Name", name: "name", required: true },
  ]);

  await expect(
    submitForm(form.id, { name: "Patryk", extra: "nope" })
  ).rejects.toThrow("form_payload_unknown_field");
});
