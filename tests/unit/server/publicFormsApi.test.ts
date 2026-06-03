import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formFields, forms, formSubmissions } from "../../../core/db/schema";
import { handlePublicFormsApi } from "../../../core/server/publicFormsApi";
import { createForm, setFormFields } from "../../../core/services/forms/formsService";
import { createFormSubmissionNonce } from "../../../core/services/forms/submissionNonce";
import {
  SECURITY_SETTINGS_DEFAULTS,
  type SecuritySettings,
} from "../../../core/services/settings/securitySettings";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const originalNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
const createdFormIds: string[] = [];

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const getSecurity = (): SecuritySettings => ({
  ...SECURITY_SETTINGS_DEFAULTS,
  rateLimit: {
    ...SECURITY_SETTINGS_DEFAULTS.rateLimit,
    enabled: false,
  },
  botProtection: {
    ...SECURITY_SETTINGS_DEFAULTS.botProtection,
    enabled: false,
  },
});

const cleanup = async () => {
  if (!hasDb || createdFormIds.length === 0) return;
  const formIds = [...new Set(createdFormIds)];
  await db.delete(formSubmissions).where(inArray(formSubmissions.formId, formIds));
  await db.delete(formFields).where(inArray(formFields.formId, formIds));
  await db.delete(forms).where(inArray(forms.id, formIds));
  createdFormIds.length = 0;
};

const createTrackedForm = async () => {
  const form = await createForm({
    name: `Public form ${randomUUID()}`,
    status: "published",
    submissionAccess: "public",
    successMessage: "Form thanks",
  });
  createdFormIds.push(form.id);
  return form;
};

beforeEach(() => {
  process.env.FORM_SUBMIT_NONCE_SECRET =
    originalNonceSecret && originalNonceSecret.trim().length > 0
      ? originalNonceSecret
      : "coderso_public_forms_nonce_test_secret_32";
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  if (originalNonceSecret === undefined) {
    delete process.env.FORM_SUBMIT_NONCE_SECRET;
  } else {
    process.env.FORM_SUBMIT_NONCE_SECRET = originalNonceSecret;
  }
});

test("public forms handler returns null for non-form submission paths", async () => {
  const url = new URL("http://localhost/api/search?q=test");
  const response = await handlePublicFormsApi(new Request(url.toString()), {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });
  expect(response).toBeNull();
});

testIfDb("public forms handler accepts signed public widget submissions", async () => {
  const form = await createTrackedForm();
  await setFormFields(form.id, [
    { type: "text", label: "Name", name: "name", required: true },
    { type: "checkbox", label: "Consent", name: "consent", required: false },
  ]);

  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          name: "Alice",
          consent: true,
        },
        formNonce: createFormSubmissionNonce(form.id),
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(200);
  const payload = (await response?.json()) as {
    formId: string;
    payload: Record<string, unknown>;
    runtime: { successMessage: string | null };
  };
  expect(payload.formId).toBe(form.id);
  expect(payload.payload).toEqual({
    name: "Alice",
    consent: true,
  });
  expect(payload.runtime.successMessage).toBe("Form thanks");
});

testIfDb("public forms handler maps invalid payloads through Forms errors", async () => {
  const form = await createTrackedForm();
  await setFormFields(form.id, [{ type: "text", label: "Name", name: "name", required: true }]);

  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          name: "Alice",
          extra: "nope",
        },
        formNonce: createFormSubmissionNonce(form.id),
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(400);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("form_payload_unknown_field");
});
