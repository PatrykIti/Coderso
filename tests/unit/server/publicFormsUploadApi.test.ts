import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formFields, forms, formSubmissions, media } from "../../../core/db/schema";
import { handlePublicFormsApi } from "../../../core/server/publicFormsApi";
import { createForm, setFormFields } from "../../../core/services/forms/formsService";
import { createFormSubmissionNonce } from "../../../core/services/forms/submissionNonce";
import { __setMediaServiceDepsForTests } from "../../../core/services/media/mediaService";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";
import {
  SECURITY_SETTINGS_DEFAULTS,
  type SecuritySettings,
} from "../../../core/services/settings/securitySettings";

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

const originalNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
const createdFormIds: string[] = [];
const createdMediaIds = new Set<string>();

const pngOneByOne = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const fakeAdapter: MediaStorageAdapter = {
  async put() {
    throw new Error("generic_put_forbidden");
  },
  async putMedia(upload) {
    const key = `forms-test/${randomUUID()}${upload.identity.extension}`;
    return {
      key,
      get url(): string {
        throw new Error("provider_url_read_forbidden");
      },
    };
  },
  async get() {
    throw new Error("unused");
  },
  async delete() {},
  getPublicUrl() {
    throw new Error("get_public_url_forbidden");
  },
};

const getSecurity = (): SecuritySettings => ({
  ...SECURITY_SETTINGS_DEFAULTS,
  rateLimit: { ...SECURITY_SETTINGS_DEFAULTS.rateLimit, enabled: false },
  botProtection: { ...SECURITY_SETTINGS_DEFAULTS.botProtection, enabled: false },
});

const uploadRequest = (formId: string, fields: Record<string, string>, file?: Blob) => {
  const url = new URL(`http://localhost/forms/${formId}/uploads`);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append("file", file);
  return { url, request: new Request(url.toString(), { method: "POST", body: form }) };
};

const runUpload = async (formId: string, fields: Record<string, string>, file?: Blob) => {
  const { url, request } = uploadRequest(formId, fields, file);
  return handlePublicFormsApi(request, {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });
};

const makeForm = async (
  fieldSettings: Record<string, unknown>,
  submissionAccess: "public" | "internal" = "public"
) => {
  const form = await createForm({
    name: `Upload form ${randomUUID()}`,
    slug: `upload-form-${randomUUID()}`,
    status: "published",
    submissionAccess,
  });
  createdFormIds.push(form.id);
  await setFormFields(form.id, [
    { type: "file", label: "Attachment", name: "attachment", settings: fieldSettings },
  ]);
  return form;
};

beforeEach(() => {
  process.env.FORM_SUBMIT_NONCE_SECRET =
    originalNonceSecret && originalNonceSecret.trim().length > 0
      ? originalNonceSecret
      : "coderso_public_forms_nonce_test_secret_32";
  __setMediaServiceDepsForTests({
    loadConfig: async () => ({
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMime: ["image/*", "application/pdf"],
    }),
    resolveAdapter: async () => fakeAdapter,
    insertMedia: async (values) => {
      const [row] = await db.insert(media).values(values).returning();
      if (row) createdMediaIds.add(row.id);
      return row ?? null;
    },
  });
});

afterEach(async () => {
  __setMediaServiceDepsForTests(null);
  if (!hasDb) return;
  for (const id of createdMediaIds) {
    await db.delete(media).where(eq(media.id, id));
  }
  createdMediaIds.clear();
  for (const id of createdFormIds.splice(0)) {
    await db.delete(formSubmissions).where(eq(formSubmissions.formId, id));
    await db.delete(formFields).where(eq(formFields.formId, id));
    await db.delete(forms).where(eq(forms.id, id));
  }
});

afterAll(async () => {
  __setMediaServiceDepsForTests(null);
  if (originalNonceSecret === undefined) {
    delete process.env.FORM_SUBMIT_NONCE_SECRET;
  } else {
    process.env.FORM_SUBMIT_NONCE_SECRET = originalNonceSecret;
  }
});

testIfDb(
  "public upload: valid nonce + png passes field accept [image/png] against wildcard global",
  async () => {
    const form = await makeForm({ accept: ["image/png"], maxSizeMb: 5 });
    const file = new File([Uint8Array.from(pngOneByOne)], "attachment.png", { type: "image/png" });
    const response = await runUpload(
      form.id,
      { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
      file
    );

    expect(response?.status).toBe(200);
    const body = (await response?.json()) as {
      id: string;
      url: string;
      mimeType: string;
      size: number;
    };
    createdMediaIds.add(body.id);
    expect(body.mimeType).toBe("image/png");
    expect(body.size).toBe(pngOneByOne.length);
    expect(typeof body.url).toBe("string");
    // reference-only response — no bytes/key leaked
    expect(Object.keys(body).sort()).toEqual(["id", "mimeType", "size", "url"]);
  }
);

testIfDb("public upload: missing nonce → form_nonce_required (400)", async () => {
  const form = await makeForm({ accept: ["image/png"] });
  const file = new File([Uint8Array.from(pngOneByOne)], "attachment.png", { type: "image/png" });
  const response = await runUpload(form.id, { fieldName: "attachment" }, file);
  expect(response?.status).toBe(400);
  const body = (await response?.json()) as { error: { code: string } };
  expect(body.error.code).toBe("form_nonce_required");
});

testIfDb("public upload: wrong mime → 400 media_mime_not_allowed (field tightens)", async () => {
  const form = await makeForm({ accept: ["image/jpeg"] });
  const file = new File([Uint8Array.from(pngOneByOne)], "x.jpg", { type: "image/jpeg" });
  const response = await runUpload(
    form.id,
    { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
    file
  );
  expect(response?.status).toBe(400);
  const body = (await response?.json()) as { error: { code: string } };
  expect(body.error.code).toBe("media_mime_not_allowed");
  expect(createdMediaIds.size).toBe(0);
});

testIfDb(
  "public upload: active SVG bytes are rejected under wildcard-only image policy",
  async () => {
    const form = await makeForm({ accept: ["image/*"] });
    const svg = new File(
      [
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        ),
      ],
      "x.svg",
      { type: "image/svg+xml" }
    );
    const response = await runUpload(
      form.id,
      { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
      svg
    );
    expect(response?.status).toBe(400);
    const body = (await response?.json()) as { error: { code: string } };
    expect(body.error.code).toBe("media_mime_not_allowed");
  }
);

testIfDb(
  "public upload: spoofed image/png declaration cannot override unsafe markup bytes",
  async () => {
    const form = await makeForm({ accept: ["image/*"] });
    const spoof = new File(
      [
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        ),
      ],
      "evil.png",
      { type: "image/png" }
    );
    const response = await runUpload(
      form.id,
      { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
      spoof
    );
    expect(response?.status).toBe(400);
    const body = (await response?.json()) as { error: { code: string } };
    expect(body.error.code).toBe("media_mime_not_allowed");
  }
);

testIfDb(
  "public upload: oversized → 413 media_file_too_large (field maxSizeMb tighter than global)",
  async () => {
    const form = await makeForm({ accept: ["image/*"], maxSizeMb: 1 });
    const big = new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" });
    const response = await runUpload(
      form.id,
      { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
      big
    );
    expect(response?.status).toBe(413);
    const body = (await response?.json()) as { error: { code: string } };
    expect(body.error.code).toBe("media_file_too_large");
  }
);

testIfDb("public upload: unknown fieldName → form_field_invalid (400)", async () => {
  const form = await makeForm({ accept: ["image/png"] });
  const file = new File([Uint8Array.from(pngOneByOne)], "attachment.png", { type: "image/png" });
  const response = await runUpload(
    form.id,
    { fieldName: "nope", formNonce: createFormSubmissionNonce(form.id) },
    file
  );
  expect(response?.status).toBe(400);
  const body = (await response?.json()) as { error: { code: string } };
  expect(body.error.code).toBe("form_field_invalid");
});

testIfDb(
  "public upload: non-file `file` body (schema passes, isUploadFile fails) → form_field_invalid",
  async () => {
    const form = await makeForm({ accept: ["image/png"] });
    const url = new URL(`http://localhost/forms/${form.id}/uploads`);
    const response = await handlePublicFormsApi(
      new Request(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fieldName: "attachment",
          file: {},
          formNonce: createFormSubmissionNonce(form.id),
        }),
      }),
      { url, security: getSecurity(), ip: "127.0.0.1", userAgent: "test" }
    );
    expect(response?.status).toBe(400);
    const body = (await response?.json()) as { error: { code: string } };
    expect(body.error.code).toBe("form_field_invalid");
  }
);

testIfDb("public upload: unknown top-level key rejected (reject-unknown schema)", async () => {
  const form = await makeForm({ accept: ["image/png"] });
  const url = new URL(`http://localhost/forms/${form.id}/uploads`);
  const response = await handlePublicFormsApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fieldName: "attachment", file: {}, bogus: 1 }),
    }),
    { url, security: getSecurity(), ip: "127.0.0.1", userAgent: "test" }
  );
  expect(response?.status).toBe(400);
});

testIfDb("public upload: internal form without auth → 401", async () => {
  const form = await makeForm({ accept: ["image/png"] }, "internal");
  const file = new File([Uint8Array.from(pngOneByOne)], "attachment.png", { type: "image/png" });
  const response = await runUpload(form.id, { fieldName: "attachment" }, file);
  expect(response?.status).toBe(401);
});
