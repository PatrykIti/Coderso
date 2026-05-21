import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  bookingResources,
  bookingServiceResources,
  bookingServices,
  contentEntries,
  contentTypes,
  formFields,
  forms,
  pageRevisions,
  pages,
  previewTokens,
  users,
} from "../../../core/db/schema";
import { createContentType } from "../../../core/services/content/typeService";
import { createForm, setFormFields } from "../../../core/services/forms/formsService";
import {
  createBookingResource,
  createBookingService,
  setBookingServiceResources,
} from "../../../core/services/booking/bookingService";
import { createPage, publishPage, updatePage } from "../../../core/services/pages/pageService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { clearSiteCache, getSiteCacheStats } from "../../../core/site/cache/siteCache";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { contactDefaults } from "../../../core/widgets/core/contact";
import { newsletterDefaults } from "../../../core/widgets/core/newsletter";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 15_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedPageIds = new Set<string>();
const trackedUserIds = new Set<string>();
const trackedContentEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const trackedFormIds = new Set<string>();
const trackedBookingResourceIds = new Set<string>();
const trackedBookingServiceIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const trackPage = (id: string | undefined | null) => {
  if (id) trackedPageIds.add(id);
};

const trackUser = (id: string | undefined | null) => {
  if (id) trackedUserIds.add(id);
};

const trackContentEntry = (id: string | undefined | null) => {
  if (id) trackedContentEntryIds.add(id);
};

const trackContentType = (id: string | undefined | null) => {
  if (id) trackedContentTypeIds.add(id);
};

const trackForm = (id: string | undefined | null) => {
  if (id) trackedFormIds.add(id);
};

const trackBookingResource = (id: string | undefined | null) => {
  if (id) trackedBookingResourceIds.add(id);
};

const trackBookingService = (id: string | undefined | null) => {
  if (id) trackedBookingServiceIds.add(id);
};

const rememberSetting = async (key: string) => {
  if (settingSnapshots.has(key)) return;
  const row = await getSettingRecord(key);
  settingSnapshots.set(key, {
    exists: Boolean(row),
    value: row?.value,
  });
};

const setTestSetting = async (key: string, value: unknown) => {
  await rememberSetting(key);
  await setSetting(key, value);
};

const restoreSettings = async () => {
  for (const [key, snapshot] of [...settingSnapshots].reverse()) {
    if (snapshot.exists) {
      await setSetting(key, snapshot.value);
    } else {
      await deleteSetting(key);
    }
  }
  settingSnapshots.clear();
};

const cleanupTrackedRows = async () => {
  const pageIds = [...trackedPageIds];
  const userIds = [...trackedUserIds];
  const contentEntryIds = [...trackedContentEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const formIds = [...trackedFormIds];
  const bookingResourceIds = [...trackedBookingResourceIds];
  const bookingServiceIds = [...trackedBookingServiceIds];

  if (pageIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  if (contentEntryIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, contentEntryIds));
    await db.delete(contentEntries).where(inArray(contentEntries.id, contentEntryIds));
  }

  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }

  if (formIds.length > 0) {
    await db.delete(formFields).where(inArray(formFields.formId, formIds));
    await db.delete(forms).where(inArray(forms.id, formIds));
  }

  if (bookingServiceIds.length > 0) {
    await db
      .delete(bookingServiceResources)
      .where(inArray(bookingServiceResources.serviceId, bookingServiceIds));
    await db.delete(bookingServices).where(inArray(bookingServices.id, bookingServiceIds));
  }

  if (bookingResourceIds.length > 0) {
    await db.delete(bookingResources).where(inArray(bookingResources.id, bookingResourceIds));
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPageIds.clear();
  trackedUserIds.clear();
  trackedContentEntryIds.clear();
  trackedContentTypeIds.clear();
  trackedFormIds.clear();
  trackedBookingResourceIds.clear();
  trackedBookingServiceIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const pageData = (headline: string) => ({
  blocks: [
    {
      id: `hero-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      type: "hero",
      variant: "centered",
      data: {
        headline,
        subhead: `${headline} subhead`,
        body: `${headline} body`,
      },
    },
  ],
  settings: {
    template: "landing",
    showInNav: true,
  },
  seo: {
    description: `${headline} meta description`,
  },
});

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `pages-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  trackUser(actor?.id);
  if (!actor?.id) throw new Error("missing_test_actor");
  return actor;
};

const createPublishedPageWithDraft = async () => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const slug = `/runtime-page-${token}`;
  const created = await createPage({
    title: `Runtime Page ${token}`,
    slug,
    authorId: actor.id,
    data: pageData(`Initial Runtime ${token}`),
  });
  trackPage(created?.id);
  if (!created?.id) throw new Error("missing_test_page");

  await publishPage(created.id, actor.id, pageData(`Published Runtime ${token}`));
  await updatePage(created.id, {
    data: pageData(`Draft Runtime ${token}`),
  });

  return {
    actor,
    page: created,
    slug,
    token,
    publishedHeadline: `Published Runtime ${token}`,
    draftHeadline: `Draft Runtime ${token}`,
  };
};

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "pages-runtime-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

const extractNonceValues = (html: string, fieldName: "__nl_form_nonce" | "__nl_booking_nonce") =>
  [...html.matchAll(new RegExp(`name="${fieldName}" value="([^"]+)"`, "g"))].map(
    (match) => match[1] ?? ""
  );

testIfDbWithOptions(
  "public page runtime renders published data while preview renders current draft data",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);
    await setTestSetting("site.previewEnabled", true);

    const fixture = await createPublishedPageWithDraft();

    const publicResponse = await requestPublicPath(fixture.slug);
    expect(publicResponse.status).toBe(200);
    const publicHtml = await publicResponse.text();
    expect(publicHtml).toContain(fixture.publishedHeadline);
    expect(publicHtml).not.toContain(fixture.draftHeadline);
    expect(publicHtml).not.toContain("Preview mode");

    const { token } = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: 5,
    });
    const previewResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(token)}&device=mobile`
    );
    expect(previewResponse.status).toBe(200);
    const previewHtml = await previewResponse.text();
    expect(previewHtml).toContain(fixture.draftHeadline);
    expect(previewHtml).not.toContain(fixture.publishedHeadline);
    expect(previewHtml).toContain("Preview mode");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDb("public root renders the configured homepage by page id", async () => {
  resetRateLimitBuckets();
  await setTestSetting("site.cacheTtlSeconds", 0);
  await setTestSetting("site.contentRoutes", []);

  const fixture = await createPublishedPageWithDraft();
  await setTestSetting("site.homepageId", fixture.page.id);

  const response = await requestPublicPath("/");
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain(fixture.publishedHeadline);
  expect(html).not.toContain(fixture.draftHeadline);
});

testIfDb(
  "public page runtime rejects drafts and published rows without published data",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const draft = await createPage({
      title: "Draft Runtime Page",
      slug: `/runtime-draft-${randomUUID()}`,
      data: pageData("Draft-only Runtime"),
    });
    trackPage(draft?.id);
    const draftResponse = await requestPublicPath(draft.slug);
    expect(draftResponse.status).toBe(404);

    const [publishedWithoutData] = await db
      .insert(pages)
      .values({
        title: "Broken Published Runtime Page",
        slug: `/runtime-broken-${randomUUID()}`,
        status: "published",
        currentData: pageData("Broken Runtime"),
        publishedData: null,
      })
      .returning();
    trackPage(publishedWithoutData?.id);
    if (!publishedWithoutData) throw new Error("missing_broken_page");

    const brokenResponse = await requestPublicPath(publishedWithoutData.slug);
    expect(brokenResponse.status).toBe(404);
  }
);

testIfDbWithOptions(
  "public page runtime hydrates Contact bindings through the shared Forms runtime",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const previousNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
    process.env.FORM_SUBMIT_NONCE_SECRET = previousNonceSecret || "contact-runtime-secret";
    try {
      const actor = await createActor();
      const form = await createForm({
        name: `Contact Runtime ${randomUUID()}`,
        status: "published",
        submissionAccess: "public",
      });
      trackForm(form?.id);
      if (!form?.id) throw new Error("missing_test_form");

      await setFormFields(form.id, [
        { type: "text", label: "Full name", name: "full_name", required: true },
        { type: "email", label: "Reply email", name: "reply_email", required: true },
        { type: "textarea", label: "Message", name: "message_body", required: true },
      ]);

      const token = randomUUID().slice(0, 8);
      const slug = `/contact-runtime-${token}`;
      const data = {
        blocks: [
          {
            id: "contact-runtime",
            type: "contact",
            variant: "form-left",
            data: {
              ...contactDefaults,
              form: {
                ...contactDefaults.form,
                fields: ["name", "email", "message"],
                submission: {
                  ...contactDefaults.form?.submission,
                  mode: "forms-runtime",
                  formId: form.id,
                  fieldMap: {
                    name: "full_name",
                    email: "reply_email",
                    phone: "",
                    message: "message_body",
                  },
                },
              },
            },
          },
        ],
        settings: {
          template: "landing",
          showInNav: true,
        },
        seo: {
          description: `Contact runtime ${token}`,
        },
      };

      const page = await createPage({
        title: `Contact Runtime ${token}`,
        slug,
        authorId: actor.id,
        data,
      });
      trackPage(page?.id);
      if (!page?.id) throw new Error("missing_test_page");

      await publishPage(page.id, actor.id, data);

      const response = await requestPublicPath(slug);
      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).toContain(`action="/forms/${form.id}/submissions"`);
      expect(html).toContain('data-nextless-form-runtime="1"');
      expect(html).toContain('data-form-id="' + form.id + '"');
      expect(html).toContain('name="full_name"');
      expect(html).toContain('name="reply_email"');
      expect(html).toContain('name="message_body"');
      expect(html).toContain('name="__nl_form_nonce"');
      expect(html).not.toContain("This contact form is not connected yet.");
    } finally {
      process.env.FORM_SUBMIT_NONCE_SECRET = previousNonceSecret;
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public page runtime bypasses HTML cache when hydrated blocks include submission nonces",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const previousNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
    process.env.FORM_SUBMIT_NONCE_SECRET = previousNonceSecret || "contact-runtime-secret";

    try {
      const actor = await createActor();
      const form = await createForm({
        name: `Public Form ${randomUUID()}`,
        status: "published",
        submissionAccess: "public",
      });
      trackForm(form?.id);
      if (!form?.id) throw new Error("missing_test_form");

      const newsletterForm = await createForm({
        name: `Newsletter Runtime ${randomUUID()}`,
        status: "published",
        submissionAccess: "public",
      });
      trackForm(newsletterForm?.id);
      if (!newsletterForm?.id) throw new Error("missing_test_newsletter_form");

      await setFormFields(form.id, [
        { type: "text", label: "Full name", name: "full_name", required: true },
        { type: "email", label: "Reply email", name: "reply_email", required: true },
        { type: "textarea", label: "Message", name: "message_body", required: true },
      ]);

      await setFormFields(newsletterForm.id, [
        { type: "text", label: "First name", name: "full_name", required: true },
        { type: "email", label: "Reply email", name: "reply_email", required: true },
        { type: "checkbox", label: "Consent", name: "consent", required: false },
      ]);

      const bookingResource = await createBookingResource({
        name: `Runtime Resource ${randomUUID().slice(0, 8)}`,
        timezone: "UTC",
        status: "active",
      });
      trackBookingResource(bookingResource?.id);
      if (!bookingResource?.id) throw new Error("missing_booking_resource");

      const bookingService = await createBookingService({
        name: `Runtime Service ${randomUUID().slice(0, 8)}`,
        status: "active",
        durationMinutes: 30,
        settings: {
          submissionAccess: "public",
        },
      });
      trackBookingService(bookingService?.id);
      if (!bookingService?.id) throw new Error("missing_booking_service");

      await setBookingServiceResources(bookingService.id, [{ resourceId: bookingResource.id }]);

      const token = randomUUID().slice(0, 8);
      const slug = `/nonce-cache-runtime-${token}`;
      const data = {
        blocks: [
          {
            id: "form-embed-runtime",
            type: "form-embed",
            data: {
              formId: form.id,
              title: "Form Embed Runtime",
            },
          },
          {
            id: "contact-runtime",
            type: "contact",
            variant: "form-left",
            data: {
              ...contactDefaults,
              form: {
                ...contactDefaults.form,
                fields: ["name", "email", "message"],
                submission: {
                  ...contactDefaults.form?.submission,
                  mode: "forms-runtime",
                  formId: form.id,
                  fieldMap: {
                    name: "full_name",
                    email: "reply_email",
                    phone: "",
                    message: "message_body",
                  },
                },
              },
            },
          },
          {
            id: "appointment-form-runtime",
            type: "appointment-form",
            data: {
              flowId: "booking-flow",
            },
          },
          {
            id: "newsletter-runtime",
            type: "newsletter",
            variant: "inline",
            data: {
              ...newsletterDefaults,
              form: {
                ...newsletterDefaults.form,
                emailFieldName: "reply_email",
                firstName: {
                  ...newsletterDefaults.form?.firstName,
                  enabled: true,
                  fieldName: "full_name",
                  required: true,
                },
              },
              submission: {
                ...newsletterDefaults.submission,
                mode: "forms-runtime",
                formId: newsletterForm.id,
                analyticsEvent: "newsletter_submit",
              },
            },
          },
        ],
        settings: {
          template: "landing",
          showInNav: true,
        },
        seo: {
          description: `Nonce cache runtime ${token}`,
        },
      };

      const page = await createPage({
        title: `Nonce Cache Runtime ${token}`,
        slug,
        authorId: actor.id,
        data,
      });
      trackPage(page?.id);
      if (!page?.id) throw new Error("missing_test_page");

      await publishPage(page.id, actor.id, data);

      const firstResponse = await requestPublicPath(slug);
      expect(firstResponse.status).toBe(200);
      const firstHtml = await firstResponse.text();
      const firstFormNonces = extractNonceValues(firstHtml, "__nl_form_nonce");
      const firstBookingNonces = extractNonceValues(firstHtml, "__nl_booking_nonce");

      expect(firstFormNonces).toHaveLength(3);
      expect(firstBookingNonces).toHaveLength(1);
      expect(getSiteCacheStats().size).toBe(0);
      expect(firstHtml).toContain('data-newsletter-submission-mode="forms-runtime"');
      expect(firstHtml).toContain('name="full_name"');
      expect(firstHtml).toContain('name="reply_email"');

      await new Promise((resolve) => setTimeout(resolve, 5));

      const secondResponse = await requestPublicPath(slug);
      expect(secondResponse.status).toBe(200);
      const secondHtml = await secondResponse.text();
      const secondFormNonces = extractNonceValues(secondHtml, "__nl_form_nonce");
      const secondBookingNonces = extractNonceValues(secondHtml, "__nl_booking_nonce");

      expect(secondFormNonces).toHaveLength(3);
      expect(secondBookingNonces).toHaveLength(1);
      expect(secondFormNonces).not.toEqual(firstFormNonces);
      expect(secondBookingNonces).not.toEqual(firstBookingNonces);
      expect(getSiteCacheStats().size).toBe(0);
    } finally {
      process.env.FORM_SUBMIT_NONCE_SECRET = previousNonceSecret;
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDb(
  "page preview runtime rejects missing, invalid, expired, and disabled tokens",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.previewEnabled", true);
    await setTestSetting("site.cacheTtlSeconds", 0);

    const fixture = await createPublishedPageWithDraft();

    const missingToken = await requestPublicPath("/preview?type=page");
    expect(missingToken.status).toBe(404);

    const invalidType = await requestPublicPath("/preview?type=unknown&token=test");
    expect(invalidType.status).toBe(404);

    const expired = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: -1,
    });
    const expiredResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(expired.token)}`
    );
    expect(expiredResponse.status).toBe(410);
    expect(await expiredResponse.text()).toBe("Preview expired");

    const valid = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: 5,
    });
    await setTestSetting("site.previewEnabled", false);
    const disabledResponse = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(valid.token)}`
    );
    expect(disabledResponse.status).toBe(404);
  }
);

testIfDb("content preview renders generic entries whose type slug is post", async () => {
  resetRateLimitBuckets();
  await setTestSetting("site.previewEnabled", true);
  await setTestSetting("site.cacheTtlSeconds", 0);

  const [existingPostType] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, "post"));
  const contentType =
    existingPostType ??
    (await createContentType({
      name: "Generic Post Entries",
      slug: "post",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    }));
  if (!existingPostType) trackContentType(contentType.id);

  const entrySlug = `generic-preview-${randomUUID()}`;
  const [entry] = await db
    .insert(contentEntries)
    .values({
      typeId: contentType.id,
      title: `Generic Preview ${randomUUID()}`,
      slug: entrySlug,
      status: "draft",
      data: { title: "Generic preview body" },
    })
    .returning();
  trackContentEntry(entry?.id);
  if (!entry?.id) throw new Error("missing_content_preview_entry");

  const { token } = await createPreviewToken({
    targetType: "content",
    targetId: entry.id,
    ttlMinutes: 5,
  });

  const response = await requestPublicPath(
    `/preview?type=content&token=${encodeURIComponent(token)}&contentType=post&slug=${encodeURIComponent(entry.slug)}&device=desktop`
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toContain(entry.title);
});

testIfDb(
  "content route match takes precedence over a page slug until routes are cleared",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    const fixture = await createPublishedPageWithDraft();
    const contentRoutes: ContentRouteSetting[] = [
      {
        type: `missing-type-${fixture.token}`,
        listPath: fixture.slug,
        detailPath: `${fixture.slug}/:slug`,
        enabled: true,
      },
    ];

    await setTestSetting("site.contentRoutes", contentRoutes);
    const shadowedResponse = await requestPublicPath(fixture.slug);
    expect(shadowedResponse.status).toBe(404);

    await setTestSetting("site.contentRoutes", []);
    const pageResponse = await requestPublicPath(fixture.slug);
    expect(pageResponse.status).toBe(200);
    expect(await pageResponse.text()).toContain(fixture.publishedHeadline);
  }
);

testIfDbWithOptions(
  "content list public runtime honors block-scoped pagination params for load-more and view-all",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Articles ${token}`,
      slug: `runtime-articles-${token}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    const contentRows = await db
      .insert(contentEntries)
      .values([
        {
          typeId: contentType.id,
          title: `Runtime article A ${token}`,
          slug: `runtime-article-a-${token}`,
          status: "published",
          data: { title: "Runtime article A" },
          publishedAt: new Date("2026-05-19T12:00:00.000Z"),
          updatedAt: new Date("2026-05-19T12:00:00.000Z"),
        },
        {
          typeId: contentType.id,
          title: `Runtime article B ${token}`,
          slug: `runtime-article-b-${token}`,
          status: "published",
          data: { title: "Runtime article B" },
          publishedAt: new Date("2026-05-18T12:00:00.000Z"),
          updatedAt: new Date("2026-05-18T12:00:00.000Z"),
        },
        {
          typeId: contentType.id,
          title: `Runtime article C ${token}`,
          slug: `runtime-article-c-${token}`,
          status: "published",
          data: { title: "Runtime article C" },
          publishedAt: new Date("2026-05-17T12:00:00.000Z"),
          updatedAt: new Date("2026-05-17T12:00:00.000Z"),
        },
      ])
      .returning();
    contentRows.forEach((row) => trackContentEntry(row.id));

    const routeBase = `/runtime-articles-${token}`;
    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath: routeBase,
        detailPath: `${routeBase}/:slug`,
        enabled: true,
      } satisfies ContentRouteSetting,
    ]);

    const pageSlug = `/content-list-runtime-${token}`;
    const contentListPageData = (mode: "load-more" | "view-all") => ({
      blocks: [
        {
          id: "content-list-1",
          type: "content-list",
          variant: "cards",
          data: {
            source: {
              contentTypeId: contentType.id,
              statusScope: "published",
              limit: 3,
              sort: "published-desc",
            },
            pagination: {
              mode,
              pageSize: 1,
            },
            fields: {
              showExcerpt: false,
              showMeta: false,
              showCta: true,
            },
            emptyState: {
              title: "No articles found",
              description: "Publish your first article.",
            },
            style: {
              columns: "2",
              gap: "md",
              cardStyle: "outlined",
              ctaLabel: "Read article",
              backgroundColor: "var(--color-bg)",
              borderColor: "var(--color-border)",
              textColor: "var(--color-text)",
            },
          },
        },
      ],
      settings: {
        template: "landing",
        showInNav: false,
      },
    });

    const page = await createPage({
      title: `Content List Runtime ${token}`,
      slug: pageSlug,
      authorId: actor.id,
      data: contentListPageData("load-more"),
    });
    trackPage(page.id);
    await publishPage(page.id, actor.id, contentListPageData("load-more"));

    const loadMoreResponse = await requestPublicPath(`${pageSlug}?cl.content-list-1.page=2`);
    expect(loadMoreResponse.status).toBe(200);
    const loadMoreHtml = await loadMoreResponse.text();
    expect(loadMoreHtml).toContain('data-content-list-items="2"');
    expect(loadMoreHtml).toContain(`Runtime article A ${token}`);
    expect(loadMoreHtml).toContain(`Runtime article B ${token}`);
    expect(loadMoreHtml).toContain('href="?cl.content-list-1.page=3"');
    expect(loadMoreHtml).toContain("Load more");

    await publishPage(page.id, actor.id, contentListPageData("view-all"));

    const viewAllResponse = await requestPublicPath(`${pageSlug}?cl.content-list-1.page=2`);
    expect(viewAllResponse.status).toBe(200);
    const viewAllHtml = await viewAllResponse.text();
    expect(viewAllHtml).toContain('data-content-list-items="1"');
    expect(viewAllHtml).toContain(`Runtime article A ${token}`);
    expect(viewAllHtml).not.toContain(`Runtime article B ${token}`);
    expect(viewAllHtml).not.toContain("Load more");
    expect(viewAllHtml).not.toContain('href="?cl.content-list-1.page=3"');
  },
  { timeout: dbRuntimeTimeout }
);
