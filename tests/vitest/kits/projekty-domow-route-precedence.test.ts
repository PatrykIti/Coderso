import { describe, expect, it } from "vitest";

import { resolvePublicSiteRouteTarget } from "../../../core/server/publicSiteRoutePrecedence";
import { matchContentRoute } from "../../../core/site/contentRouteMatcher";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsContracts";
import {
  buildContentRouteSettingDesired,
  PROJECT_DETAIL_KEY,
} from "../../../scripts/projekty-domow/content/projectDetail";

const routes = () =>
  buildContentRouteSettingDesired({ ref: "detail_page", key: PROJECT_DETAIL_KEY })
    .value as ContentRouteSetting[];

describe("Projekty Domów public route precedence", () => {
  it("lets the published static catalogue win exact /projekty", () => {
    const match = matchContentRoute("/projekty", routes());
    expect(match).toMatchObject({ mode: "list", listPath: "/projekty" });
    expect(resolvePublicSiteRouteTarget(match, true)).toBe("static-page");
  });

  it("keeps /projekty/:slug detail-owned even if a static page happens to exist", () => {
    const match = matchContentRoute("/projekty/aurora", routes());
    expect(match).toMatchObject({ mode: "detail", params: { slug: "aurora" } });
    expect(resolvePublicSiteRouteTarget(match, true)).toBe("content-detail");
  });

  it("falls back deterministically when either side of the overlap is absent", () => {
    const listMatch = matchContentRoute("/projekty", routes());
    expect(resolvePublicSiteRouteTarget(listMatch, false)).toBe("content-list");
    expect(resolvePublicSiteRouteTarget(null, true)).toBe("static-page");
    expect(resolvePublicSiteRouteTarget(null, false)).toBe("not-found");
    expect(matchContentRoute("/projekty-katalog", routes())).toBeNull();
  });
});
