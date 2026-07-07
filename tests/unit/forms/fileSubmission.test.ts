import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formFields, forms, formSubmissions, media } from "../../../core/db/schema";
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

const createdFormIds: string[] = [];
const createdMediaIds: string[] = [];

const insertMedia = async (mimeType: string, size: number) => {
  const [row] = await db
    .insert(media)
    .values({
      key: `test/${crypto.randomUUID()}.bin`,
      url: `http://localhost/media/${crypto.randomUUID()}`,
      originalName: "attachment.bin",
      type: mimeType.startsWith("image/") ? "image" : "file",
      mimeType,
      size,
    })
    .returning();
  createdMediaIds.push(row.id);
  return row;
};

const makeFileForm = async (settings: Record<string, unknown>, required = false) => {
  const form = await createForm({
    name: `File form ${crypto.randomUUID()}`,
    slug: `file-form-${crypto.randomUUID()}`,
  });
  createdFormIds.push(form.id);
  await setFormFields(form.id, [
    { type: "file", label: "Attachment", name: "attachment", required, settings },
  ]);
  return form;
};

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdFormIds.splice(0)) {
    await db.delete(formSubmissions).where(eq(formSubmissions.formId, id));
    await db.delete(formFields).where(eq(formFields.formId, id));
    await db.delete(forms).where(eq(forms.id, id));
  }
  for (const id of createdMediaIds.splice(0)) {
    await db.delete(media).where(eq(media.id, id));
  }
});

testIfDb("submitForm accepts a valid owned media id for a file field", async () => {
  const asset = await insertMedia("image/png", 1024);
  const form = await makeFileForm({ accept: ["image/png"], maxSizeMb: 5 });

  const submission = await submitForm(form.id, { attachment: asset.id });
  expect(submission?.formId).toBe(form.id);
  expect((submission?.payload as Record<string, unknown>).attachment).toBe(asset.id);
});

testIfDb("submitForm rejects an unknown/cross-origin media id (backstop)", async () => {
  const form = await makeFileForm({ accept: ["image/png"] });
  await expect(submitForm(form.id, { attachment: crypto.randomUUID() })).rejects.toThrow(
    "form_payload_invalid"
  );
});

testIfDb("submitForm rejects a resolved row whose mime violates accept (backstop)", async () => {
  const asset = await insertMedia("application/pdf", 1024);
  const form = await makeFileForm({ accept: ["image/png"] });
  await expect(submitForm(form.id, { attachment: asset.id })).rejects.toThrow(
    "form_payload_invalid"
  );
});

testIfDb("submitForm rejects a resolved row larger than maxSizeMb (backstop)", async () => {
  const asset = await insertMedia("image/png", 3 * 1024 * 1024);
  const form = await makeFileForm({ accept: ["image/png"], maxSizeMb: 1 });
  await expect(submitForm(form.id, { attachment: asset.id })).rejects.toThrow(
    "form_payload_invalid"
  );
});

testIfDb("submitForm enforces a required file field", async () => {
  const form = await makeFileForm({ accept: ["image/png"] }, true);
  await expect(submitForm(form.id, {})).rejects.toThrow("form_payload_required");
});

testIfDb("submitForm stores multiple owned media ids as a string[]", async () => {
  const a = await insertMedia("image/png", 1024);
  const b = await insertMedia("image/png", 2048);
  const form = await makeFileForm({ accept: ["image/*"], multiple: true });

  const submission = await submitForm(form.id, { attachment: [a.id, b.id] });
  expect((submission?.payload as Record<string, unknown>).attachment).toEqual([a.id, b.id]);
});
