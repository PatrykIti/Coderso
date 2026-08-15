import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formFields, forms, formSubmissions, media, users } from "../../../core/db/schema";
import {
  __setFormWriteExecutorDepsForTests,
  handlePublicFormsApi,
} from "../../../core/server/publicFormsApi";
import { createForm, setFormFields } from "../../../core/services/forms/formsService";
import { createFormSubmissionNonce } from "../../../core/services/forms/submissionNonce";
import { __setMediaServiceDepsForTests } from "../../../core/services/media/mediaService";
import type {
  CanonicalStoredUpload,
  MediaStorageAdapter,
} from "../../../core/services/media/storage/adapter";
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
const originalFetch = globalThis.fetch;
const createdFormIds: string[] = [];
const createdMediaIds = new Set<string>();
const createdUserIds = new Set<string>();
const canonicalUploads: CanonicalStoredUpload[] = [];

const pngOneByOne = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const fakeAdapter: MediaStorageAdapter = {
  async put() {
    throw new Error("generic_put_forbidden");
  },
  async putMedia(upload) {
    canonicalUploads.push(upload);
    const key = `forms-test/${randomUUID()}${upload.identity.extension}`;
    return {
      key,
      get url(): string {
        throw new Error("provider_url_read_forbidden");
      },
    };
  },
  async putAt() {
    throw new Error("generic_put_forbidden");
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

const getCaptchaSecurity = (): SecuritySettings => ({
  ...getSecurity(),
  botProtection: {
    ...SECURITY_SETTINGS_DEFAULTS.botProtection,
    enabled: true,
    siteKey: "forms-upload-site-key",
    secretKey: "forms-upload-secret-key",
    enforceOnLocalhost: true,
  },
});

const uploadRequest = (
  formId: string,
  fields: Record<string, string>,
  file?: Blob,
  headers?: HeadersInit
) => {
  const url = new URL(`http://localhost/forms/${formId}/uploads`);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append("file", file);
  return { url, request: new Request(url.toString(), { method: "POST", headers, body: form }) };
};

const runUpload = async (
  formId: string,
  fields: Record<string, string>,
  file?: Blob,
  options: {
    headers?: HeadersInit;
    ip?: string;
    security?: SecuritySettings;
  } = {}
) => {
  const { url, request } = uploadRequest(formId, fields, file, options.headers);
  return handlePublicFormsApi(request, {
    url,
    security: options.security ?? getSecurity(),
    ip: options.ip ?? "127.0.0.1",
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

const makeUser = async () => {
  const token = randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      email: `forms-upload-${token}@example.invalid`,
      passwordHash: "forms-upload-test-only",
    })
    .returning({ id: users.id });
  if (!user) throw new Error("forms_upload_user_fixture_failed");
  createdUserIds.add(user.id);
  return user;
};

const expectCanonicalPngUpload = async (
  response: Response | null,
  uploadIndex: number,
  expectedOriginalName: string
) => {
  expect(response?.status).toBe(200);
  const body = (await response?.json()) as {
    id: string;
    url: string;
    mimeType: string;
    size: number;
  };
  createdMediaIds.add(body.id);
  expect(body).toMatchObject({
    mimeType: "image/png",
    size: pngOneByOne.length,
  });
  expect(body.url).toMatch(/^\/media\/forms-test\/[0-9a-f-]+\.png$/i);
  expect(Object.keys(body).sort()).toEqual(["id", "mimeType", "size", "url"]);

  expect(canonicalUploads).toHaveLength(uploadIndex + 1);
  const adapterUpload = canonicalUploads[uploadIndex];
  expect(adapterUpload?.identity).toEqual({
    mimeType: "image/png",
    extension: ".png",
    delivery: "inline",
  });
  expect(adapterUpload?.downloadName).toBe(expectedOriginalName);
  expect(Buffer.from(await adapterUpload!.bytes.arrayBuffer())).toEqual(pngOneByOne);

  const [row] = await db.select().from(media).where(eq(media.id, body.id));
  expect(row).toMatchObject({
    id: body.id,
    key: body.url.slice("/media/".length),
    url: body.url,
    originalName: expectedOriginalName,
    mimeType: "image/png",
    type: "image",
    size: pngOneByOne.length,
  });
  return body;
};

beforeEach(() => {
  __setFormWriteExecutorDepsForTests(null);
  canonicalUploads.length = 0;
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
  __setFormWriteExecutorDepsForTests(null);
  __setMediaServiceDepsForTests(null);
  globalThis.fetch = originalFetch;
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
  for (const id of createdUserIds) {
    await db.delete(users).where(eq(users.id, id));
  }
  createdUserIds.clear();
});

afterAll(async () => {
  __setFormWriteExecutorDepsForTests(null);
  __setMediaServiceDepsForTests(null);
  globalThis.fetch = originalFetch;
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
    const file = new File([Uint8Array.from(pngOneByOne)], "folder/attachment.jpg.exe", {
      type: "text/html",
    });
    const response = await runUpload(
      form.id,
      { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
      file
    );

    await expectCanonicalPngUpload(response, 0, "attachment.jpg.exe");
  }
);

testIfDb(
  "public anonymous upload inspects bytes after successful captcha verification",
  async () => {
    const form = await makeForm({ accept: ["image/png"], maxSizeMb: 5 });
    const captchaRequests: Array<{ url: string; body: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captchaRequests.push({
        url: String(input),
        body: String(init?.body ?? ""),
      });
      return new Response(JSON.stringify({ success: true, score: 1, action: "public_write" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    const file = new File([Uint8Array.from(pngOneByOne)], "captcha-proof.pdf.exe", {
      type: "application/pdf",
    });

    const response = await runUpload(
      form.id,
      {
        fieldName: "attachment",
        formNonce: createFormSubmissionNonce(form.id),
        captchaToken: "captcha-token",
      },
      file,
      { ip: "198.51.100.20", security: getCaptchaSecurity() }
    );

    await expectCanonicalPngUpload(response, 0, "captcha-proof.pdf.exe");
    expect(captchaRequests).toHaveLength(1);
    expect(captchaRequests[0]?.url).toBe("https://www.google.com/recaptcha/api/siteverify");
    const captchaBody = new URLSearchParams(captchaRequests[0]?.body);
    expect(captchaBody.get("response")).toBe("captcha-token");
    expect(captchaBody.get("remoteip")).toBe("198.51.100.20");
  }
);

testIfDb(
  "public cookie session keeps nonce and byte inspection while captcha stays bypassed",
  async () => {
    const form = await makeForm({ accept: ["image/png"], maxSizeMb: 5 });
    const user = await makeUser();
    let captchaCalls = 0;
    globalThis.fetch = (async () => {
      captchaCalls += 1;
      throw new Error("public_session_captcha_forbidden");
    }) as typeof globalThis.fetch;
    __setFormWriteExecutorDepsForTests({
      async attachSession(ctx) {
        ctx.user = { id: user.id };
        ctx.sessionId = randomUUID();
      },
    });
    const file = new File([Uint8Array.from(pngOneByOne)], "cookie-session.svg.html", {
      type: "image/svg+xml",
    });

    const response = await runUpload(
      form.id,
      { fieldName: "attachment", formNonce: createFormSubmissionNonce(form.id) },
      file,
      {
        headers: { cookie: "coderso_session=test" },
        ip: "198.51.100.21",
        security: getCaptchaSecurity(),
      }
    );

    await expectCanonicalPngUpload(response, 0, "cookie-session.svg.html");
    expect(captchaCalls).toBe(0);
  }
);

testIfDb("internal session runs CSRF and RBAC before the same canonical byte upload", async () => {
  const form = await makeForm({ accept: ["image/png"], maxSizeMb: 5 }, "internal");
  const user = await makeUser();
  const order: string[] = [];
  __setFormWriteExecutorDepsForTests({
    async attachSession(ctx) {
      order.push("session");
      ctx.user = { id: user.id };
      ctx.sessionId = randomUUID();
    },
    async enforceSessionCsrf(req) {
      order.push("csrf");
      expect(req.headers.get("x-csrf-token")).toBe("valid-test-csrf");
    },
    async requireSessionFormsWrite() {
      order.push("rbac");
    },
  });
  const file = new File([Uint8Array.from(pngOneByOne)], "internal-session.txt.exe", {
    type: "text/plain",
  });

  const response = await runUpload(form.id, { fieldName: "attachment" }, file, {
    headers: { cookie: "coderso_session=test", "x-csrf-token": "valid-test-csrf" },
    ip: "198.51.100.22",
    security: getCaptchaSecurity(),
  });

  await expectCanonicalPngUpload(response, 0, "internal-session.txt.exe");
  expect(order).toEqual(["session", "csrf", "rbac"]);
});

testIfDb(
  "internal forms.submit API key reaches the same canonical byte upload without CSRF",
  async () => {
    const form = await makeForm({ accept: ["image/png"], maxSizeMb: 5 }, "internal");
    let authenticateCalls = 0;
    let csrfCalls = 0;
    __setFormWriteExecutorDepsForTests({
      async authenticateApiKey(authorization) {
        authenticateCalls += 1;
        expect(authorization).toBe("Bearer forms-upload-key");
        return {
          id: "forms-upload-key-id",
          name: "Forms upload key",
          scopes: ["forms.submit"],
          prefix: "forms-upload",
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
          lastUsedAt: null,
          revokedAt: null,
        };
      },
      async enforceSessionCsrf() {
        csrfCalls += 1;
        throw new Error("api_key_csrf_forbidden");
      },
    });
    const file = new File([Uint8Array.from(pngOneByOne)], "api-key.gif.exe", {
      type: "image/gif",
    });

    const response = await runUpload(form.id, { fieldName: "attachment" }, file, {
      headers: { authorization: "Bearer forms-upload-key" },
      ip: "198.51.100.23",
      security: getCaptchaSecurity(),
    });

    await expectCanonicalPngUpload(response, 0, "api-key.gif.exe");
    expect(authenticateCalls).toBe(1);
    expect(csrfCalls).toBe(0);
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
