import type { WidgetSmokeCase } from "./contracts";
import { mediaFixtureSeeds, type MediaFixtureSeed } from "./fixture-data";

const commerceFixtureWidgetTypes = new Set(["product-gallery", "product-compare", "product-table"]);
export const productGalleryFixtureWidgetTypes = new Set(["product-gallery"]);
export const productCompareFixtureWidgetTypes = new Set(["product-compare"]);
export const productTableFixtureWidgetTypes = new Set(["product-table"]);
export const contentFixtureWidgetTypes = new Set(["content-list"]);
export const postsFixtureWidgetTypes = new Set(["posts-feed"]);
export const entryTeaserFixtureWidgetTypes = new Set(["entry-teaser"]);
const mediaFixtureWidgetTypes = new Set([
  "product-gallery",
  "product-compare",
  "product-table",
  "logo-cloud",
  "gallery-mosaic",
  "team",
  "rich-text-section",
]);

export function selectedCasesNeedCommerceFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => commerceFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedProductGalleryFixture(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => productGalleryFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedProductCompareFixture(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => productCompareFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedProductTableFixture(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => productTableFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedContentFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => contentFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedPostsFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => postsFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedEntryTeaserFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => entryTeaserFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedMediaFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => mediaFixtureWidgetTypes.has(item.widgetType));
}

export function resolveWidgetMediaProofPublicPath(
  item: Pick<WidgetSmokeCase, "adminFixtureSlug" | "publicPath">
): string | null {
  return item.publicPath || item.adminFixtureSlug || null;
}

export function resolveLogoCloudMediaProofPublicPath(
  item: Pick<WidgetSmokeCase, "adminFixtureSlug" | "publicPath">
): string | null {
  return resolveWidgetMediaProofPublicPath(item);
}

export function resolveMediaFixtureSeedsForCases(cases: WidgetSmokeCase[]): MediaFixtureSeed[] {
  const selectedWidgetTypes = new Set(cases.map((item) => item.widgetType));
  return mediaFixtureSeeds.filter((seed) =>
    seed.widgetTypes.some((widgetType) => selectedWidgetTypes.has(widgetType))
  );
}
