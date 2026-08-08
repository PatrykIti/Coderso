import type { ResourceSeed } from "../../../core/services/kits/fullSitePackage/types";
import { HOUSE_PROJECT_RESOURCE_KEY } from "./constants";
import {
  buildContentRouteSettingDesired,
  buildProjectDetailDesired,
  PROJECT_DETAIL_KEY,
} from "./projectDetail";
import {
  buildProjectCardsDesired,
  buildPublishedProjectQueryDesired,
  PROJECT_LISTING_QUERY_KEY,
  PROJECT_LISTING_TEMPLATE_KEY,
} from "./projectListing";

export const buildProjectDiscoveryResources = (): {
  listingTemplates: ResourceSeed[];
  listingQueries: ResourceSeed[];
  detailPages: ResourceSeed[];
  settings: ResourceSeed[];
} => {
  const contentRef = { ref: "content_type" as const, key: HOUSE_PROJECT_RESOURCE_KEY };
  const detailRef = { ref: "detail_page" as const, key: PROJECT_DETAIL_KEY };
  return {
    listingTemplates: [{ key: PROJECT_LISTING_TEMPLATE_KEY, desired: buildProjectCardsDesired() }],
    listingQueries: [
      {
        key: PROJECT_LISTING_QUERY_KEY,
        desired: buildPublishedProjectQueryDesired(contentRef),
      },
    ],
    detailPages: [
      {
        key: PROJECT_DETAIL_KEY,
        desired: buildProjectDetailDesired(contentRef),
      },
    ],
    settings: [
      {
        key: "site.contentRoutes",
        desired: buildContentRouteSettingDesired(detailRef),
      },
    ],
  };
};
