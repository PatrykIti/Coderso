import type { ContentRouteMatch } from "../site/contentRouteMatcher";

export type PublicSiteRouteTarget = "content-detail" | "static-page" | "content-list" | "not-found";

/**
 * Resolves the intentional overlap between an authored Page and a generated
 * content-list route. Dynamic detail paths remain content-owned, while an
 * exact static Page wins the list path so it can host native filters and a
 * collection without exposing a second public catalogue URL.
 */
export const resolvePublicSiteRouteTarget = (
  match: Pick<ContentRouteMatch, "mode"> | null,
  hasPublishedStaticPage: boolean
): PublicSiteRouteTarget => {
  if (match?.mode === "detail") return "content-detail";
  if (hasPublishedStaticPage) return "static-page";
  if (match?.mode === "list") return "content-list";
  return "not-found";
};
