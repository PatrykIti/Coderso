import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { formFields, forms, formSubmissions, media } from "../../db/schema";
import { toFieldRecord } from "./formsService";
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
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [form] = await tx
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.id, formId))
        .for("key share");
      if (!form) throw new Error("form_not_found");
      const fields = await tx
        .select()
        .from(formFields)
        .where(eq(formFields.formId, formId))
        .orderBy(asc(formFields.orderIndex));
      const normalizedFields = fields.map(toFieldRecord);
      const normalizedPayload = validateSubmissionPayload(payload, normalizedFields);
      await verifyFileReferences(normalizedFields, normalizedPayload, {
        loadMediaByIds: async (ids) =>
          ids.length === 0
            ? []
            : tx
                .select({ id: media.id, mimeType: media.mimeType, size: media.size })
                .from(media)
                .where(inArray(media.id, [...ids]))
                .orderBy(asc(media.id)),
      });
      const [row] = await tx
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
    },
    { isolationLevel: "read committed" }
  );
}
