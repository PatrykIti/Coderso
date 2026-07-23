import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { forms, formSubmissions } from "../../../core/db/schema";
import { listMediaUsage } from "../../../core/services/media/mediaUsageService";

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

const createdFormIds: string[] = [];

const insertForm = async () => {
  const [form] = await db
    .insert(forms)
    .values({
      name: "Attachment form",
      slug: `usage-form-${crypto.randomUUID()}`,
    })
    .returning();
  createdFormIds.push(form.id);
  return form;
};

const insertSubmission = async (formId: string, payload: unknown) => {
  const [row] = await db
    .insert(formSubmissions)
    .values({ formId, payload, status: "new" })
    .returning();
  return row;
};

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdFormIds.splice(0)) {
    await db.delete(formSubmissions).where(eq(formSubmissions.formId, id));
    await db.delete(forms).where(eq(forms.id, id));
  }
});

testIfDb("listMediaUsage surfaces a media id referenced by a submission payload", async () => {
  const mediaId = crypto.randomUUID();
  const form = await insertForm();
  const submission = await insertSubmission(form.id, { attachment: mediaId });

  const usage = await listMediaUsage(mediaId);
  const entry = usage.find((u) => u.type === "submission");
  expect(entry).toBeDefined();
  expect(entry?.targetId).toBe(submission.id);
  expect(entry?.adminHref).toBe(`/advanced/forms/${form.id}/submissions`);
});

testIfDb("listMediaUsage surfaces a media id nested in a string[] payload", async () => {
  const mediaId = crypto.randomUUID();
  const form = await insertForm();
  await insertSubmission(form.id, { attachment: [crypto.randomUUID(), mediaId] });

  const usage = await listMediaUsage(mediaId);
  expect(usage.some((u) => u.type === "submission")).toBe(true);
});

testIfDb("listMediaUsage returns no submission entry when the id is absent", async () => {
  const form = await insertForm();
  await insertSubmission(form.id, { attachment: crypto.randomUUID() });

  const usage = await listMediaUsage(crypto.randomUUID());
  expect(usage.some((u) => u.type === "submission")).toBe(false);
});

testIfDb("listMediaUsage clamps the submission family by limitPerFamily", async () => {
  const mediaId = crypto.randomUUID();
  const form = await insertForm();
  await insertSubmission(form.id, { attachment: mediaId });
  await insertSubmission(form.id, { attachment: mediaId });
  await insertSubmission(form.id, { attachment: mediaId });

  const usage = await listMediaUsage(mediaId, { limitPerFamily: 1 });
  expect(usage.filter((u) => u.type === "submission").length).toBe(1);
});
