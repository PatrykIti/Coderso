import { afterAll, beforeEach, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formFields, forms, formSubmissions } from "../../../core/db/schema";

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

testIfDb("forms tables accept inserts and cascade fields", async () => {
  const [form] = await db
    .insert(forms)
    .values({ name: "Contact", slug: "contact", status: "draft" })
    .returning();

  const [field] = await db
    .insert(formFields)
    .values({
      formId: form.id,
      type: "text",
      label: "Name",
      name: "name",
      required: true,
      settings: {},
      orderIndex: 0,
    })
    .returning();

  expect(field.formId).toBe(form.id);

  await db.delete(forms).where(eq(forms.id, form.id));
  const remaining = await db
    .select({ id: formFields.id })
    .from(formFields)
    .where(eq(formFields.formId, form.id));
  expect(remaining.length).toBe(0);
});

testIfDb("form submissions require valid form", async () => {
  await expect(
    db
      .insert(formSubmissions)
      .values({
        formId: "00000000-0000-0000-0000-000000000000",
        payload: {},
        status: "new",
      })
      .execute()
  ).rejects.toThrow();
});
