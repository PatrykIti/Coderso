/**
 * Public-site preview/token render helpers (TASK-491-01-L02, extracted from
 * `publicSite.tsx` to keep that orchestrator module under the repository line
 * gate). Owns the token-gated detail-page preview render and the shared
 * public theme-name resolution used by every public render path.
 */
import type { DeviceTarget } from "../widgets/types";
import type { ContentSchema } from "../services/content/validation";
import { getEntry } from "../services/content/entryService";
import { getContentType } from "../services/content/typeService";
import { resolvePreviewDetailPageRuntime } from "../services/content/detailPageRuntimeResolver";
import { getSetting } from "../services/settings/settingsService";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import { getActiveThemeProfile } from "../services/themes/themeProfileService";
import { renderPublicPageRuntimeHtml } from "../site/renderPublicPage";
import { resolvePublicStyles } from "./publicSiteAssets";
import {
  collectPrehydratedDetailBlockIds,
  resolveDetailPageRuntimeSeo,
} from "./publicSiteEntryRuntime";
import { resolvePublicSiteShellContext } from "./publicSitePageRuntime";
import { hydrateRuntimeBlocks } from "./publicSiteRenderContext";
import { isEntryPublished } from "./publicSiteRouteRuntime";

export const resolvePublicThemeName = async () => {
  const profile = await getActiveThemeProfile();
  return profile?.themeName ?? "default";
};

export const renderDetailPagePreviewHtml = async (input: {
  detailPageId: string;
  sampleEntryId: string;
  previewDevice: DeviceTarget;
  runtimeSearchParams: URLSearchParams;
}) => {
  const entryDetail = await getEntry(input.sampleEntryId);
  if (!entryDetail || !isEntryPublished(entryDetail)) return null;

  const contentType = await getContentType(entryDetail.typeId);
  if (!contentType) return null;

  const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
  const detailPage = await resolvePreviewDetailPageRuntime({
    detailPageId: input.detailPageId,
    documentSource: "current",
    entry: {
      id: entryDetail.id,
      typeId: entryDetail.typeId,
      title: entryDetail.title,
      slug: entryDetail.slug,
      status: entryDetail.status,
      visibility: entryDetail.visibility,
      hasPassword: entryDetail.hasPassword,
      tags: entryDetail.tags ?? [],
      data: entryDetail.data ?? {},
      publishedAt: entryDetail.publishedAt ?? null,
      scheduledAt: entryDetail.scheduledAt ?? null,
      createdAt: entryDetail.createdAt ?? null,
      updatedAt: entryDetail.updatedAt ?? null,
      author: entryDetail.author ?? null,
    },
    contentType: {
      id: contentType.id,
      slug: contentType.slug,
      schema: contentType.schema as ContentSchema,
    },
    contentRoutes,
  });
  if (!detailPage) return null;

  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const detailSeo = resolveDetailPageRuntimeSeo({
    document: detailPage.document,
    entry: entryDetail,
    contentTypeName: contentType.name,
  });
  const { siteShell, siteName } = await resolvePublicSiteShellContext({
    document: null,
    includeResponsiveCss: false,
  });

  return renderPublicPageRuntimeHtml({
    title: detailSeo.title,
    blocks: await hydrateRuntimeBlocks(detailPage.blocks, {
      preview: true,
      contentRoutes,
      runtimeSearchParams: input.runtimeSearchParams,
      runtimeCache: {},
      prehydratedBlockIds: collectPrehydratedDetailBlockIds(detailPage.document),
    }),
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview: true,
    previewDevice: input.previewDevice,
    layoutSettings: detailPage.document.settings.layout,
    metaDescription: detailSeo.metaDescription,
    canonicalUrl: detailSeo.canonicalUrl,
    robots: entryDetail.seo?.robots ?? null,
    siteShell,
    siteName,
    siteLocale: await getSetting("site.locale"),
    imageUrl: detailSeo.imageUrl,
    themeName: await resolvePublicThemeName(),
    templateKey: detailPage.document.settings.template,
  });
};
