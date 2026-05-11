import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
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
  countFormSubmissions,
  countFormActionRuns,
  createForm,
  deleteForm,
  listFormFields,
  listForms,
  setFormFields,
  updateForm,
} from "../../../core/services/forms/formsService";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import {
  buildSiteCacheKey,
  clearSiteCache,
  configureSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
let originalContentRoutes: ContentRouteSetting[] | null = null;

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
  clearSiteCache();
  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
    originalContentRoutes = null;
  }
  await db.delete(formActionRuns);
  await db.delete(formActions);
  await db.delete(formSubmissions);
  await db.delete(formFields);
  await db.delete(forms);
};

beforeEach(async () => {
  await cleanup();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

const enableLinkedDetailRouteCache = async () => {
  originalContentRoutes =
    originalContentRoutes ??
    ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ??
    [];
  await setSetting("site.contentRoutes", [
    {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: "14d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    } satisfies ContentRouteSetting,
  ]);
  configureSiteCache(300);
  const key = buildSiteCacheKey("profile-1", "/products/example");
  setSiteCacheEntry(key, "<html>cached</html>", 300, 0);
  expect(getSiteCacheEntry(key, 1)).toBe("<html>cached</html>");
  return key;
};

testIfDbWithOptions(
  "create/update/delete form",
  async () => {
    const name = `Contact ${randomUUID()}`;
    const form = await createForm({
      name,
      successMessage: "Thanks for reaching out.",
      successRedirectUrl: "/thank-you",
      submissionAccess: "internal",
      settings: {
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: ["Contact", "Details"],
        preset: "service_intake",
        automationRetry: {
          enabled: true,
          maxAttempts: 3,
          baseDelayMs: 200,
          maxDelayMs: 1200,
        },
      },
    });
    expect(form?.name).toBe(name);
    expect(form?.successMessage).toBe("Thanks for reaching out.");
    expect(form?.successRedirectUrl).toBe("/thank-you");
    expect(form?.submissionAccess).toBe("internal");
    expect((form?.settings as { layoutMode?: string })?.layoutMode).toBe("multi_step");

    const updated = await updateForm(form.id, {
      name: `${name} Updated`,
      successMessage: "Got it!",
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      },
    });
    expect(updated?.name).toBe(`${name} Updated`);
    expect(updated?.successMessage).toBe("Got it!");
    expect(updated?.successRedirectUrl).toBeNull();
    expect(updated?.submissionAccess).toBe("public");
    expect((updated?.settings as { layoutMode?: string })?.layoutMode).toBe("single");

    const deleted = await deleteForm(form.id);
    expect(deleted?.id).toBe(form.id);
  },
  { timeout: 30_000 }
);

testIfDb("form slug must be unique", async () => {
  const slug = `contact-${randomUUID()}`;
  await createForm({ name: "Contact", slug });
  await expect(createForm({ name: "Contact 2", slug })).rejects.toThrow("form_slug_exists");
});

testIfDb("retained submissions block hard delete with stable domain error", async () => {
  const form = await createForm({ name: "Counted Form" });
  await db.insert(formSubmissions).values({
    formId: form.id,
    payload: { email: "lead@example.com" },
    status: "new",
    createdAt: new Date(),
  });

  await expect(deleteForm(form.id)).rejects.toThrow("form_delete_restricted");
  await expect(countFormSubmissions(form.id)).resolves.toBe(1);
});

testIfDb("retained action runs block hard delete with stable domain error", async () => {
  const form = await createForm({ name: "Action Run Form" });
  await db.insert(formActionRuns).values({
    formId: form.id,
    actionType: "success_message",
    actionLabel: "Success message",
    status: "failed",
    attempt: 1,
    trigger: "submission",
    actionCondition: { operator: "always" },
    actionConfig: {},
    submissionPayload: {},
    createdAt: new Date(),
  });

  await expect(deleteForm(form.id)).rejects.toThrow("form_delete_restricted");
  await expect(countFormActionRuns(form.id)).resolves.toBe(1);
});

testIfDb("setFormFields replaces existing fields", async () => {
  const form = await createForm({ name: "Feedback" });
  await setFormFields(form.id, [{ type: "text", label: "Name", name: "name", required: true }]);

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

testIfDb("form owner seams invalidate linked detail-route cache on update and delete", async () => {
  const cacheKey = await enableLinkedDetailRouteCache();
  const form = await createForm({ name: `Cached Form ${randomUUID()}` });

  await updateForm(form.id, { name: `${form.name} Updated` });
  expect(getSiteCacheEntry(cacheKey, 1)).toBeNull();

  setSiteCacheEntry(cacheKey, "<html>cached</html>", 300, 0);
  expect(getSiteCacheEntry(cacheKey, 1)).toBe("<html>cached</html>");

  await deleteForm(form.id);
  expect(getSiteCacheEntry(cacheKey, 1)).toBeNull();
});
