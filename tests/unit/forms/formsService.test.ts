import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  formActionRuns,
  formActions,
  formFields,
  forms,
  formSubmissions,
} from "../../../core/db/schema";
import {
  createForm,
  deleteForm,
  listFormFields,
  listForms,
  setFormFields,
  updateForm,
} from "../../../core/services/forms/formsService";

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

testIfDb("create/update/delete form", async () => {
  const name = `Contact ${randomUUID()}`;
  const form = await createForm({
    name,
    successMessage: "Thanks for reaching out.",
    successRedirectUrl: "/thank-you",
    submissionAccess: "internal",
  });
  expect(form?.name).toBe(name);
  expect(form?.successMessage).toBe("Thanks for reaching out.");
  expect(form?.successRedirectUrl).toBe("/thank-you");
  expect(form?.submissionAccess).toBe("internal");

  const updated = await updateForm(form.id, {
    name: `${name} Updated`,
    successMessage: "Got it!",
    successRedirectUrl: null,
    submissionAccess: "public",
  });
  expect(updated?.name).toBe(`${name} Updated`);
  expect(updated?.successMessage).toBe("Got it!");
  expect(updated?.successRedirectUrl).toBeNull();
  expect(updated?.submissionAccess).toBe("public");

  const deleted = await deleteForm(form.id);
  expect(deleted?.id).toBe(form.id);
});

testIfDb("form slug must be unique", async () => {
  const slug = `contact-${randomUUID()}`;
  await createForm({ name: "Contact", slug });
  await expect(createForm({ name: "Contact 2", slug })).rejects.toThrow(
    "form_slug_exists"
  );
});

testIfDb("setFormFields replaces existing fields", async () => {
  const form = await createForm({ name: "Feedback" });
  await setFormFields(form.id, [
    { type: "text", label: "Name", name: "name", required: true },
  ]);

  let fields = await listFormFields(form.id);
  expect(fields.length).toBe(1);

  await setFormFields(form.id, [
    { type: "email", label: "Email", name: "email", required: false },
    { type: "textarea", label: "Message", name: "message", required: true },
  ]);

  fields = await listFormFields(form.id);
  expect(fields.length).toBe(2);
  expect(fields[0]?.name).toBe("email");
});

testIfDb("listForms returns latest updates first", async () => {
  await createForm({ name: "First Form" });
  await createForm({ name: "Second Form" });

  const list = await listForms();
  expect(list.length).toBe(2);
});
