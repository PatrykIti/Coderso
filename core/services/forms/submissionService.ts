import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { formSubmissions } from "../../db/schema";
import { getForm, listFormFields, toFieldRecord } from "./formsService";
import { validateSubmissionPayload } from "./validation";
import { verifyFileReferences } from "./formAttachment";

export type SubmissionMeta = {
  ip?: string;
  userAgent?: string;
};

export async function listSubmissions(formId: string) {
  return db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId))
    .orderBy(desc(formSubmissions.createdAt));
}

export async function getSubmission(id: string) {
  const [row] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id));
  return row ?? null;
}

export async function submitForm(formId: string, payload: unknown, meta?: SubmissionMeta) {
  const form = await getForm(formId);
  if (!form) throw new Error("form_not_found");

  const fields = await listFormFields(formId);
  const normalizedFields = fields.map(toFieldRecord);
  const normalizedPayload = validateSubmissionPayload(payload, normalizedFields);

  // DB-backed backstop: resolve + re-check every file reference against the media table
  // (defence-in-depth — rejects unknown/cross-origin ids and mime/size violations even
  // if the upload path was bypassed).
  await verifyFileReferences(normalizedFields, normalizedPayload);

  const [row] = await db
    .insert(formSubmissions)
    .values({
      formId,
      payload: normalizedPayload,
      status: "new",
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    })
    .returning();

  return row ?? null;
}
