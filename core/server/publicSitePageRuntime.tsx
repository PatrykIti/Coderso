import { ANALYTICS_BEACON_PATH } from "./publicAnalyticsApi";
import { buildTrackingScript } from "../services/analytics/trackingSnippet";
import { createBeaconNonce } from "../services/analytics/beaconNonce";
import { isAnalyticsTrackingEnabled } from "../services/analytics/trackingSettings";
import {
  collectNavigationMenuPageIds,
  mapMenuNodesToNavigationItems,
} from "../services/navigation/navigationMenuMapping";
import { resolvePublishedMenuDocument } from "../services/menus/menuDocumentV2";
import { resolvePublishedMenuNavExtras } from "../services/menus/menuNavExtras";
import { resolvePublishedMenuAppearance } from "../services/menus/normalizeMenuAppearance";
import type { MenuWithItems } from "../services/menus/menuService";
import type { PageDocumentV2 } from "../services/pages/pageDocumentV2";
import { getPageSlugsByIds } from "../services/pages/pageService";
import { buildPageResponsiveCss } from "../services/pages/pageResponsiveCss";
import { resolvePublicSiteShell } from "../services/pages/publicSiteShell";
import { getSetting } from "../services/settings/settingsService";
import {
  SITE_FOOTER_SCOPE_SELECTOR,
  type SiteShellNavigation,
  type SiteShellRenderProps,
} from "../site/siteShell";

const buildNavigation = async (menu: MenuWithItems): Promise<SiteShellNavigation | null> => {
  const pageIds = collectNavigationMenuPageIds(menu.items);
  const pagePathById = await getPageSlugsByIds(pageIds);
  const items = mapMenuNodesToNavigationItems(menu.items, pagePathById, {
    includeDefaultTarget: true,
  });
  return items.length > 0 ? { label: menu.menu.name, items } : null;
};

export const resolveSiteShellRenderProps = async (): Promise<SiteShellRenderProps> => {
  try {
    const shell = await resolvePublicSiteShell();
    return {
      navigation: shell.navigation ? await buildNavigation(shell.navigation) : null,
      navigationAppearance: shell.navigation
        ? resolvePublishedMenuAppearance(shell.navigation.menu.settings)
        : null,
      navigationExtras: shell.navigation
        ? resolvePublishedMenuNavExtras(shell.navigation.menu.settings)
        : null,
      navigationDocument: shell.navigation
        ? resolvePublishedMenuDocument(shell.navigation.menu.settings)
        : null,
      footerDocument: shell.footerDocument,
    };
  } catch (error) {
    console.warn("site_shell_resolution_failed", error);
    return {
      navigation: null,
      navigationAppearance: null,
      navigationExtras: null,
      navigationDocument: null,
      footerDocument: null,
    };
  }
};

export const buildLiveAnalyticsScriptHtml = async (isPreview: boolean): Promise<string | null> => {
  if (isPreview) return null;
  try {
    if (!(await isAnalyticsTrackingEnabled())) return null;
    return buildTrackingScript({
      nonce: createBeaconNonce(),
      collectPath: ANALYTICS_BEACON_PATH,
    });
  } catch (error) {
    console.warn("analytics_snippet_build_failed", error);
    return null;
  }
};

export const buildResponsivePublicPageCss = (
  document: PageDocumentV2 | null,
  footerDocument: PageDocumentV2 | null
) => {
  let responsiveCss = "";
  if (document) {
    try {
      responsiveCss = buildPageResponsiveCss(document);
    } catch (error) {
      console.warn("page_responsive_css_emission_failed", error);
    }
  }
  if (!footerDocument) return responsiveCss;
  try {
    const footerCss = buildPageResponsiveCss(footerDocument, {
      scopeSelector: SITE_FOOTER_SCOPE_SELECTOR,
    });
    return footerCss && responsiveCss
      ? `${responsiveCss}\n${footerCss}`
      : footerCss || responsiveCss;
  } catch (error) {
    console.warn("site_footer_responsive_css_emission_failed", error);
    return responsiveCss;
  }
};

export const resolvePublicSiteShellContext = async (options: {
  document: PageDocumentV2 | null;
  includeResponsiveCss: boolean;
}) => {
  const siteShell = await resolveSiteShellRenderProps();
  const siteNameSetting = await getSetting("site.name");
  const siteName =
    typeof siteNameSetting === "string" && siteNameSetting.trim().length > 0
      ? siteNameSetting.trim()
      : null;
  return {
    siteShell,
    siteName,
    responsiveCss: options.includeResponsiveCss
      ? buildResponsivePublicPageCss(options.document, siteShell.footerDocument)
      : "",
  };
};
