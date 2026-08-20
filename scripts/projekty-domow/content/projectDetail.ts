import { normalizeDetailPageDocumentForWrite } from "../../../core/services/content/detailPageSchema";
import {
  convertDetailPageBindingsToV2,
  convertWidgetBlocksToV2Sections,
} from "../../../core/services/content/detailPageV2Conversion";
import type {
  DetailPageBinding,
  DetailPageLegacyWidgetBlockV1,
} from "../../../core/services/content/detailPageTypes";
import type { PageSectionV2 } from "../../../core/services/pages/pageDocumentV2";
import { normalizeContentRoutes } from "../../../core/services/settings/settingsContracts";
import type { JsonObject, PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import { HOUSE_PROJECT_RESOURCE_KEY } from "./constants";
import { cleanJsonObject } from "../json";

export const PROJECT_DETAIL_KEY = "project-detail";
export const PROJECT_LIST_PATH = "/projekty";
export const PROJECT_DETAIL_PATH = "/projekty/:slug";

const CONTENT_ID = "00000000-0000-4000-8000-000000000547";
const DETAIL_ID = "00000000-0000-4000-8000-000000000548";

const fullWidthLayout = {
  container: "full",
  padding: { top: "none", bottom: "none" },
  margin: { top: "none", bottom: "none" },
  background: { color: "transparent", image: null },
} as const;

const emptyFeatureItem = (id: string) => ({
  id,
  title: "—",
  description: "",
});

const buildSurfaceColumn = (input: {
  id: string;
  desktopSpan: string;
  tabletSpan: string;
  mobileSpan: string;
  minHeight: string;
  background: string;
}) => ({
  id: input.id,
  label: input.id,
  desktopSpan: input.desktopSpan,
  tabletSpan: input.tabletSpan,
  mobileSpan: input.mobileSpan,
  minHeight: input.minHeight,
  style: {
    surface: "on",
    background: input.background,
    padding: "none",
    radius: "2xl",
    overflow: "hidden",
  },
});

export const buildProjectDetailV1Blocks = () =>
  [
    {
      id: "project-back-link",
      type: "rich-text-section",
      variant: "single-column",
      layout: fullWidthLayout,
      data: {
        titleBlock: {},
        body: { html: '<p><a href="/projekty">← Wróć do projektów</a></p>' },
        options: { dropcap: false, toc: false, maxWidth: "full", outputMode: "html" },
      },
    },
    {
      id: "project-hero",
      type: "hero",
      variant: "centered",
      layout: fullWidthLayout,
      data: {
        headline: "—",
        subhead: "",
        body: "—",
        badge: {
          enabled: true,
          label: "—",
          tone: "primary",
          placement: "above-headline",
        },
        primaryCta: { label: "", href: "" },
        media: { type: "none", source: "external" },
      },
    },
    {
      id: "project-hero-art",
      type: "grid-columns",
      variant: "asymmetric",
      layout: fullWidthLayout,
      data: {
        columns: [
          buildSurfaceColumn({
            id: "hero-art-main",
            desktopSpan: "8",
            tabletSpan: "12",
            mobileSpan: "12",
            minHeight: "xl",
            background: "var(--color-primary)",
          }),
          buildSurfaceColumn({
            id: "hero-art-accent",
            desktopSpan: "4",
            tabletSpan: "12",
            mobileSpan: "12",
            minHeight: "xl",
            background: "var(--color-secondary)",
          }),
        ],
      },
      slots: {
        "column:hero-art-main": [],
        "column:hero-art-accent": [],
      },
    },
    {
      id: "project-statistics",
      type: "feature-grid",
      variant: "cards-4",
      layout: fullWidthLayout,
      data: {
        header: { eyebrow: "", title: "", description: "" },
        items: [
          emptyFeatureItem("area"),
          emptyFeatureItem("bedrooms"),
          emptyFeatureItem("bathrooms"),
          emptyFeatureItem("energy"),
        ],
        style: { columns: "4", cardPadding: "compact", hoverEffect: "none" },
      },
    },
    {
      id: "project-contact-cta",
      type: "cta-banner",
      variant: "centered",
      layout: fullWidthLayout,
      data: {
        content: { badge: "", title: "", description: "", showDescription: false },
        actions: {
          primaryCta: {
            label: "Chcę podobny dom",
            href: "/kontakt",
            enabled: true,
            openInNewTab: false,
            icon: "none",
          },
          secondaryCta: {
            label: "",
            href: "",
            enabled: false,
            openInNewTab: false,
            icon: "none",
          },
          tertiaryCta: {
            label: "",
            href: "",
            enabled: false,
            openInNewTab: false,
            icon: "none",
          },
        },
      },
    },
    {
      id: "project-assumptions",
      type: "feature-grid",
      variant: "cards-3",
      layout: fullWidthLayout,
      data: {
        header: { eyebrow: "—", title: "—", description: "—" },
        items: [
          emptyFeatureItem("living-zone"),
          emptyFeatureItem("private-zone"),
          emptyFeatureItem("facade"),
        ],
        style: { columns: "3", cardPadding: "spacious", hoverEffect: "none" },
      },
    },
    {
      id: "project-gallery",
      type: "grid-columns",
      variant: "asymmetric",
      layout: fullWidthLayout,
      data: {
        columns: [
          buildSurfaceColumn({
            id: "gallery-tall",
            desktopSpan: "5",
            tabletSpan: "12",
            mobileSpan: "12",
            minHeight: "xl",
            background: "var(--color-primary)",
          }),
          buildSurfaceColumn({
            id: "gallery-default",
            desktopSpan: "4",
            tabletSpan: "12",
            mobileSpan: "12",
            minHeight: "md",
            background: "var(--color-secondary)",
          }),
          buildSurfaceColumn({
            id: "gallery-warm",
            desktopSpan: "3",
            tabletSpan: "12",
            mobileSpan: "12",
            minHeight: "md",
            background: "var(--color-accent)",
          }),
        ],
      },
      slots: {
        "column:gallery-tall": [],
        "column:gallery-default": [],
        "column:gallery-warm": [],
      },
    },
  ] as const;

/**
 * Canonical v2 sections for the Aurora detail template (TASK-580-03-L02).
 * Built through the shared widget→V2 conversion so the seed output is
 * byte-for-byte the same contract the L03 SQL backfill and the read adapter
 * produce for stored v1 rows.
 */
export const buildProjectDetailSections = (): PageSectionV2[] =>
  convertWidgetBlocksToV2Sections(
    buildProjectDetailV1Blocks() as unknown as DetailPageLegacyWidgetBlockV1[]
  );

/**
 * v2 binding list for the Aurora detail template: v1 field paths remapped
 * onto the converted block ids/prop paths by the canonical conversion.
 */
export const buildProjectDetailV2Bindings = (): DetailPageBinding[] =>
  convertDetailPageBindingsToV2(
    PROJECT_DETAIL_BINDINGS as unknown as DetailPageBinding[],
    buildProjectDetailV1Blocks() as unknown as DetailPageLegacyWidgetBlockV1[],
    buildProjectDetailSections()
  ).bindings;

const entryFieldBinding = (id: string, blockId: string, propPath: string, field: string) => ({
  id,
  blockId,
  propPath,
  source: { kind: "entry-field", field },
  transform: "text",
  required: true,
});

export const PROJECT_DETAIL_BINDINGS = [
  entryFieldBinding("project-detail-eyebrow", "project-hero", "badge.label", "detailEyebrow"),
  {
    id: "project-title",
    blockId: "project-hero",
    propPath: "headline",
    source: { kind: "entry-meta", field: "title" },
    required: true,
  },
  entryFieldBinding("project-detail-lead", "project-hero", "body", "detailLead"),
  ...[0, 1, 2, 3].flatMap((index) => [
    entryFieldBinding(
      `project-stat-${index + 1}-value`,
      "project-statistics",
      `items.${index}.title`,
      `detailStats.${index}.value`
    ),
    entryFieldBinding(
      `project-stat-${index + 1}-label`,
      "project-statistics",
      `items.${index}.description`,
      `detailStats.${index}.label`
    ),
  ]),
  entryFieldBinding(
    "project-assumptions-eyebrow",
    "project-assumptions",
    "header.eyebrow",
    "assumptionsEyebrow"
  ),
  entryFieldBinding(
    "project-assumptions-title",
    "project-assumptions",
    "header.title",
    "assumptionsTitle"
  ),
  entryFieldBinding(
    "project-assumptions-lead",
    "project-assumptions",
    "header.description",
    "assumptionsLead"
  ),
  ...[0, 1, 2].flatMap((index) => [
    entryFieldBinding(
      `project-assumption-${index + 1}-title`,
      "project-assumptions",
      `items.${index}.title`,
      `assumptions.${index}.title`
    ),
    entryFieldBinding(
      `project-assumption-${index + 1}-description`,
      "project-assumptions",
      `items.${index}.description`,
      `assumptions.${index}.description`
    ),
  ]),
] as const;

const assertRef: (
  value: unknown,
  expected: { ref: PackageRef["ref"]; key: string },
  code: string
) => asserts value is PackageRef = (value, expected, code) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    (value as { ref?: unknown }).ref !== expected.ref ||
    (value as { key?: unknown }).key !== expected.key ||
    Object.keys(value).length !== 2
  ) {
    throw new Error(code);
  }
};

const compactNormalizedSections = (sections: JsonObject[]): JsonObject[] =>
  sections.map((section) => {
    const compact: JsonObject = {};
    for (const [key, value] of Object.entries(section)) {
      if (value !== undefined) compact[key] = value;
    }
    return compact;
  });

export const buildProjectDetailDesired = (
  contentTypeId: unknown,
  _legacyListingQueryId?: unknown
): JsonObject => {
  assertRef(
    contentTypeId,
    { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY },
    "house_project_detail_content_ref_invalid"
  );
  const normalized = normalizeDetailPageDocumentForWrite({
    schemaVersion: 2,
    id: DETAIL_ID,
    name: "Szczegóły projektu domu",
    contentTypeId: CONTENT_ID,
    contentTypeSlug: HOUSE_PROJECT_RESOURCE_KEY,
    status: "published",
    titlePattern: "{{ title }}",
    seo: {
      titlePattern: "{{ title }} — projekt pokazowy — FormaDom Studio",
      descriptionField: "seoDescription",
    },
    settings: { template: "project-detail", layout: {} },
    sections: buildProjectDetailSections(),
    bindings: buildProjectDetailV2Bindings(),
  });
  const { id: _nativeValidationId, sections, ...withoutDatabaseId } = normalized;
  return cleanJsonObject({
    ...withoutDatabaseId,
    contentTypeId,
    sections: compactNormalizedSections(sections as unknown as JsonObject[]),
  });
};

export const buildContentRouteSettingDesired = (detailPageId: unknown): JsonObject => {
  assertRef(
    detailPageId,
    { ref: "detail_page", key: PROJECT_DETAIL_KEY },
    "house_project_route_detail_ref_invalid"
  );
  const [normalized] = normalizeContentRoutes([
    {
      type: HOUSE_PROJECT_RESOURCE_KEY,
      listPath: PROJECT_LIST_PATH,
      detailPath: PROJECT_DETAIL_PATH,
      enabled: true,
      detailPageId: DETAIL_ID,
    },
  ]);
  if (!normalized) throw new Error("house_project_route_invalid");
  return cleanJsonObject({ value: [{ ...normalized, detailPageId }] });
};
