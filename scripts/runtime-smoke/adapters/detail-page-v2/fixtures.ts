// TASK-580-03-L07 detail-page-v2 smoke fixtures.
// Unique task-scoped fixtures are created and removed through the admin API
// (cookie + CSRF), mirroring the widget-contract fixture pattern. Cleanup is
// ordered: detail page before content type (the DB blocks content-type delete
// while detail pages exist), then entries, then the content-route setting is
// restored to its pre-run value.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { fetchAdminCsrfToken, requestAdminJson } from "../widget-contract/auth";
import { ADMIN_URL } from "./contracts";

export interface DetailPageV2FixturePlan {
  readonly runId: string;
  readonly slug: string;
  readonly legacySlug: string;
  readonly detailPath: string;
  readonly listPath: string;
  readonly legacyDetailPath: string;
  readonly legacyListPath: string;
  readonly contentTypeId: string;
  readonly legacyContentTypeId: string;
  readonly entryId: string;
  readonly legacyEntryId: string;
  readonly detailPageId: string;
  readonly entryTitle: string;
  readonly legacyMarker: string;
  readonly legacyDetailPageId: string;
}

export interface DetailPageV2FixtureSet {
  readonly plan: DetailPageV2FixturePlan;
  readonly restoreContentRoutes: () => Promise<void>;
  readonly cleanup: () => Promise<void>;
}

export interface CreatedDetailPageRecord {
  readonly id: string;
  readonly status: string;
}

interface ContentTypeRecord {
  readonly id: string;
}

interface EntryRecord {
  readonly id: string;
}

interface PreviewTokenRecord {
  readonly token: string;
  readonly previewUrl: string;
  readonly expiresAt: string;
}

const FIXTURE_PATH = "tests/fixtures/detailPageV2Conversion/project-detail.json";

function scopedSlug(runId: string): string {
  return `l07-house-${runId}`;
}

function buildContentSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary"],
    properties: {
      summary: { type: "string" },
      detailEyebrow: { type: "string" },
      detailLead: { type: "string" },
      detailStats: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { value: { type: "string" }, label: { type: "string" } },
        },
      },
      assumptionsEyebrow: { type: "string" },
      assumptionsTitle: { type: "string" },
      assumptionsLead: { type: "string" },
      assumptions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, description: { type: "string" } },
        },
      },
    },
  };
}

export async function readFormaDomV2Fixture(
  context: RuntimeSmokeContext
): Promise<Record<string, unknown>> {
  const absolute = resolveInsideRoot(context.root, FIXTURE_PATH, "detail-page-v2 fixture path");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absolute, "utf8")) as unknown;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 fixture is unreadable", {
      cause: error,
    });
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("expected" in parsed) ||
    typeof (parsed as Record<string, unknown>).expected !== "object" ||
    (parsed as Record<string, unknown>).expected === null
  ) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 fixture shape is invalid");
  }
  return (parsed as Record<string, unknown>).expected as Record<string, unknown>;
}

export function buildScopedV2Document(
  fixture: Record<string, unknown>,
  input: { id: string; contentTypeId: string; contentTypeSlug: string; name: string }
): Record<string, unknown> {
  return {
    ...fixture,
    id: input.id,
    name: input.name,
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: "draft",
  };
}

export function buildLegacyPlaceholderDocument(input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  marker: string;
}): Record<string, unknown> {
  const legacyBlockId = `${input.id}-booking-legacy`;
  const sectionId = `${input.id}-booking-section`;
  return {
    schemaVersion: 2,
    id: input.id,
    name: "Legacy Booking Detail Template",
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: "draft",
    titlePattern: "{{ title }}",
    settings: { template: "detail", layout: {} },
    sections: [
      {
        id: sectionId,
        type: "custom",
        name: "Custom",
        variant: "default",
        layout: {
          columns: 1,
          align: "start",
          justify: "start",
          maxWidth: 1080,
          stackVertical: false,
        },
        style: {
          background: "#ffffff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#0d9488",
          radius: 0,
          shadow: "none",
        },
        spacing: {
          paddingTop: 64,
          paddingBottom: 64,
          paddingLeft: 40,
          paddingRight: 40,
          gap: 24,
        },
        visibility: {
          visible: true,
          authOnly: false,
          anchor: null,
          startsAt: null,
          endsAt: null,
        },
        responsive: {},
        blocks: [
          {
            id: legacyBlockId,
            type: "legacy-widget",
            props: {
              legacyWidgetType: "booking-calendar",
              data: { calendarId: "demo-cal-7", secretMarker: input.marker },
            },
            visibility: { visible: true },
          },
        ],
      },
    ],
    bindings: [],
  };
}

export async function createFixtureSet(
  context: RuntimeSmokeContext,
  sessionValue: string
): Promise<DetailPageV2FixtureSet> {
  const runId = randomUUID().slice(0, 8);
  const slug = scopedSlug(runId);
  const legacySlug = `l07-legacy-${runId}`;
  const detailPath = `/${slug}/:slug`;
  const listPath = `/${slug}-list`;
  const legacyDetailPath = `/${legacySlug}/:slug`;
  const legacyListPath = `/${legacySlug}-list`;
  const entryTitle = `Demo Home ${runId}`;
  const legacyMarker = `l07-secret-marker-${runId}`;
  const csrf = await fetchAdminCsrfToken(ADMIN_URL, sessionValue);

  // 1. Content type
  const contentType = await requestAdminJson<ContentTypeRecord>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/content-types",
    method: "POST",
    body: { name: `L07 Smoke House Project ${runId}`, slug, schema: buildContentSchema() },
    csrfToken: csrf,
  });

  // 1b. Dedicated legacy-placeholder content type (route `type` must be unique)
  const legacyContentType = await requestAdminJson<ContentTypeRecord>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/content-types",
    method: "POST",
    body: {
      name: `L07 Smoke Legacy ${runId}`,
      slug: legacySlug,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: { summary: { type: "string" } },
      },
    },
    csrfToken: csrf,
  });

  // 2. Published entry
  const entry = await requestAdminJson<EntryRecord>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: `/api/content/${slug}/entries`,
    method: "POST",
    body: {
      title: entryTitle,
      slug: `demo-home-${runId}`,
      data: {
        summary: "A bounded smoke entry rendered by the converted v2 detail page.",
        detailEyebrow: `L07 Smoke ${runId}`,
        detailLead: "Bound lead rendered through the V2 pipeline.",
        detailStats: [
          { value: "4", label: "Rooms" },
          { value: "220", label: "m2" },
          { value: "2026", label: "Year" },
          { value: "A+", label: "Energy" },
        ],
        assumptionsEyebrow: "Assumptions",
        assumptionsTitle: "What we assumed",
        assumptionsLead: "Bounded assumptions rendered through the V2 pipeline.",
        assumptions: [
          { title: "Foundation", description: "Reinforced concrete slab." },
          { title: "Structure", description: "Timber frame with mineral wool." },
          { title: "Roof", description: "Gable roof, clay tile finish." },
        ],
      },
    },
    csrfToken: csrf,
  });
  await requestAdminJson<{ ok: boolean }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: `/api/content/${slug}/entries/${entry.id}/publish`,
    method: "POST",
    body: {},
    csrfToken: csrf,
  });

  // 2b. Published legacy-booking entry (scenario 4 targets its own slug)
  const legacyEntry = await requestAdminJson<EntryRecord>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: `/api/content/${legacySlug}/entries`,
    method: "POST",
    body: {
      title: `Legacy Booking ${runId}`,
      slug: `legacy-booking-${runId}`,
      data: {
        summary: "A bounded smoke entry for the legacy booking-calendar placeholder.",
      },
    },
    csrfToken: csrf,
  });
  await requestAdminJson<{ ok: boolean }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: `/api/content/${legacySlug}/entries/${legacyEntry.id}/publish`,
    method: "POST",
    body: {},
    csrfToken: csrf,
  });

  // 3. Converted FormaDom v2 detail page (hero + feature-grid statistics)
  const fixture = await readFormaDomV2Fixture(context);
  const detailPageId = randomUUID();
  const v2Document = buildScopedV2Document(fixture, {
    id: detailPageId,
    contentTypeId: contentType.id,
    contentTypeSlug: slug,
    name: `L07 Smoke ${runId} Detail Template`,
  });
  const detailPage = await requestAdminJson<CreatedDetailPageRecord>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/detail-pages",
    method: "POST",
    body: { document: v2Document },
    csrfToken: csrf,
  });
  await requestAdminJson<{ ok: boolean }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: `/api/detail-pages/${detailPage.id}/publish`,
    method: "POST",
    body: {},
    csrfToken: csrf,
  });

  // 4. Legacy placeholder detail page (booking-calendar unmapped widget)
  const legacyDetailPageId = randomUUID();
  const legacyDocument = buildLegacyPlaceholderDocument({
    id: legacyDetailPageId,
    contentTypeId: legacyContentType.id,
    contentTypeSlug: legacySlug,
    marker: legacyMarker,
  });
  await requestAdminJson<CreatedDetailPageRecord>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/detail-pages",
    method: "POST",
    body: { document: legacyDocument },
    csrfToken: csrf,
  });
  await requestAdminJson<{ ok: boolean }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: `/api/detail-pages/${legacyDetailPageId}/publish`,
    method: "POST",
    body: {},
    csrfToken: csrf,
  });

  // 5. Content route linking the converted detail page (append + restore)
  const priorRoutes = await requestAdminJson<{ key: string; value: unknown }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/settings/site.contentRoutes",
  });
  const existing = Array.isArray(priorRoutes.value) ? (priorRoutes.value as unknown[]) : [];
  const nextRoutes = [
    ...existing,
    {
      type: slug,
      listPath,
      detailPath,
      enabled: true,
      detailPageId: detailPage.id,
    },
    {
      type: legacySlug,
      listPath: legacyListPath,
      detailPath: legacyDetailPath,
      enabled: true,
      detailPageId: legacyDetailPageId,
    },
  ];
  await requestAdminJson<{ key: string; value: unknown }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/settings/site.contentRoutes",
    method: "PATCH",
    body: { value: nextRoutes },
    csrfToken: csrf,
  });

  const plan: DetailPageV2FixturePlan = Object.freeze({
    runId,
    slug,
    legacySlug,
    detailPath,
    listPath,
    legacyDetailPath,
    legacyListPath,
    contentTypeId: contentType.id,
    legacyContentTypeId: legacyContentType.id,
    entryId: entry.id,
    legacyEntryId: legacyEntry.id,
    detailPageId: detailPage.id,
    entryTitle,
    legacyMarker,
    legacyDetailPageId,
  });

  const restoreContentRoutes = async () => {
    const csrfRestore = await fetchAdminCsrfToken(ADMIN_URL, sessionValue);
    await requestAdminJson<{ key: string; value: unknown }>({
      adminUrl: ADMIN_URL,
      sessionValue,
      path: "/api/settings/site.contentRoutes",
      method: "PATCH",
      body: { value: existing },
      csrfToken: csrfRestore,
    });
  };

  const cleanup = async () => {
    const csrfCleanup = await fetchAdminCsrfToken(ADMIN_URL, sessionValue);
    const removeDetailPage = async (id: string) => {
      await requestAdminJson<{ ok: boolean }>({
        adminUrl: ADMIN_URL,
        sessionValue,
        path: `/api/detail-pages/${id}`,
        method: "DELETE",
        body: {},
        csrfToken: csrfCleanup,
      });
    };
    await removeDetailPage(legacyDetailPageId);
    await removeDetailPage(detailPageId);
    await requestAdminJson<{ ok: boolean }>({
      adminUrl: ADMIN_URL,
      sessionValue,
      path: `/api/content/${legacySlug}/entries/${legacyEntry.id}`,
      method: "DELETE",
      body: {},
      csrfToken: csrfCleanup,
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl: ADMIN_URL,
      sessionValue,
      path: `/api/content/${slug}/entries/${entry.id}`,
      method: "DELETE",
      body: {},
      csrfToken: csrfCleanup,
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl: ADMIN_URL,
      sessionValue,
      path: `/api/content-types/${legacyContentType.id}`,
      method: "DELETE",
      body: {},
      csrfToken: csrfCleanup,
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl: ADMIN_URL,
      sessionValue,
      path: `/api/content-types/${contentType.id}`,
      method: "DELETE",
      body: {},
      csrfToken: csrfCleanup,
    });
  };

  return Object.freeze({ plan, restoreContentRoutes, cleanup });
}

export async function createDetailPagePreviewToken(input: {
  sessionValue: string;
  detailPageId: string;
  sampleEntryId: string;
}): Promise<PreviewTokenRecord> {
  const csrf = await fetchAdminCsrfToken(ADMIN_URL, input.sessionValue);
  return requestAdminJson<PreviewTokenRecord>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: `/api/detail-pages/${input.detailPageId}/preview`,
    method: "POST",
    body: { sampleEntryId: input.sampleEntryId, ttlMinutes: 5 },
    csrfToken: csrf,
  });
}

export async function runCatalogFamilyBlueprintActions(input: {
  sessionValue: string;
  slug: string;
  idempotencyKey: string;
  plan: unknown;
}): Promise<unknown> {
  const csrf = await fetchAdminCsrfToken(ADMIN_URL, input.sessionValue);
  return requestAdminJson<unknown>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: "/api/assistant/actions/execute",
    method: "POST",
    body: { plan: input.plan, idempotencyKey: input.idempotencyKey },
    csrfToken: csrf,
  });
}

interface CatalogFamilyContentTypeActionInput {
  readonly slug?: unknown;
  readonly name?: unknown;
  readonly schema?: unknown;
}

interface CatalogFamilyDetailPageActionInput {
  readonly document?: unknown;
}

// Re-provisions the deterministic catalog detail template row the
// house-projects blueprint pins through `expectedExistingId`. The full-site
// install kit normally seeds this row; a previous smoke cleanup deletes it, so
// the scenario re-creates it (and the content type when absent) before the
// assistant plan executes. Without this seed the plan's detail-page.upsert
// fails with `detail_page_not_found` on a fresh catalog state.
export async function seedCatalogFamilyDetailPage(input: {
  sessionValue: string;
  plan: { actions?: unknown };
}): Promise<{ contentTypeId: string; detailPageId: string }> {
  const actions = Array.isArray(input.plan.actions) ? input.plan.actions : [];
  const contentTypeAction = actions.find(
    (action): action is { type: string; input?: CatalogFamilyContentTypeActionInput } =>
      typeof action === "object" &&
      action !== null &&
      (action as { type?: string }).type === "content-type.upsert"
  );
  const detailPageAction = actions.find(
    (action): action is { type: string; input?: CatalogFamilyDetailPageActionInput } =>
      typeof action === "object" &&
      action !== null &&
      (action as { type?: string }).type === "detail-page.upsert"
  );
  const contentTypeSlug = contentTypeAction?.input?.slug;
  const contentTypeName = contentTypeAction?.input?.name;
  const contentSchema = contentTypeAction?.input?.schema;
  const document = detailPageAction?.input?.document;
  if (
    typeof contentTypeSlug !== "string" ||
    typeof contentTypeName !== "string" ||
    contentSchema === undefined ||
    typeof document !== "object" ||
    document === null ||
    typeof (document as { id?: unknown }).id !== "string"
  ) {
    throw new Error("catalog seed plan is missing the content-type or detail-page action");
  }
  const detailPageId = (document as { id: string }).id;
  const csrf = await fetchAdminCsrfToken(ADMIN_URL, input.sessionValue);
  const existingTypes = await requestAdminJson<Array<{ id: string; slug: string }>>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: "/api/content-types",
    method: "GET",
  });
  const matchedType = existingTypes.find((record) => record.slug === contentTypeSlug);
  const contentType =
    matchedType ??
    (await requestAdminJson<ContentTypeRecord>({
      adminUrl: ADMIN_URL,
      sessionValue: input.sessionValue,
      path: "/api/content-types",
      method: "POST",
      body: { name: contentTypeName, slug: contentTypeSlug, schema: contentSchema },
      csrfToken: csrf,
    }));
  const existingPages = await requestAdminJson<{ items: Array<{ id: string }> }>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: "/api/detail-pages",
    method: "GET",
  });
  if (!existingPages.items.some((page) => page.id === detailPageId)) {
    // CRUD routes accept draft documents only; the assistant plan re-publishes
    // the deterministic template when it executes the detail-page.upsert.
    await requestAdminJson<CreatedDetailPageRecord>({
      adminUrl: ADMIN_URL,
      sessionValue: input.sessionValue,
      path: "/api/detail-pages",
      method: "POST",
      body: {
        document: { ...(document as object), status: "draft", contentTypeId: contentType.id },
      },
      csrfToken: csrf,
    });
  }
  return Object.freeze({ contentTypeId: contentType.id, detailPageId });
}
