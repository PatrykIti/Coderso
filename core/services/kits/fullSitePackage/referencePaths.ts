import type { PackageResourceKind } from "./types";

export type RulePathSegment = string | "*";
export type ReferencePresence = "required" | "when_present" | "nullable";

export type AllowedReferencePath = Readonly<{
  sourceKind: PackageResourceKind;
  segments: readonly RulePathSegment[];
  targetKind: PackageResourceKind;
  settingKey?: string;
}>;

export type FixedReferenceRule = Readonly<{
  path: AllowedReferencePath;
  presence: ReferencePresence;
}>;

const freezeAllowedPath = (path: AllowedReferencePath): AllowedReferencePath =>
  Object.freeze({ ...path, segments: Object.freeze([...path.segments]) });

const FIXED_REFERENCE_RULE_INPUTS = [
  {
    path: {
      sourceKind: "content_entry",
      segments: ["contentTypeId"],
      targetKind: "content_type",
    },
    presence: "required",
  },
  {
    path: {
      sourceKind: "listing_query",
      segments: ["query", "sourceConfig", "contentTypeId"],
      targetKind: "content_type",
    },
    presence: "when_present",
  },
  {
    path: {
      sourceKind: "detail_page",
      segments: ["contentTypeId"],
      targetKind: "content_type",
    },
    presence: "required",
  },
  {
    path: {
      sourceKind: "detail_page",
      segments: ["related", "*", "listingQueryId"],
      targetKind: "listing_query",
    },
    presence: "nullable",
  },
  {
    path: { sourceKind: "menu", segments: ["items", "*", "pageId"], targetKind: "page" },
    presence: "nullable",
  },
  {
    path: {
      sourceKind: "setting",
      settingKey: "site.homepageId",
      segments: ["value"],
      targetKind: "page",
    },
    presence: "nullable",
  },
  {
    path: {
      sourceKind: "setting",
      settingKey: "site.navigationMenuId",
      segments: ["value"],
      targetKind: "menu",
    },
    presence: "nullable",
  },
  {
    path: {
      sourceKind: "setting",
      settingKey: "site.footerTemplateId",
      segments: ["value"],
      targetKind: "page_template",
    },
    presence: "nullable",
  },
] as const satisfies readonly FixedReferenceRule[];

export const FIXED_REFERENCE_RULES: readonly FixedReferenceRule[] = Object.freeze(
  FIXED_REFERENCE_RULE_INPUTS.map((rule) =>
    Object.freeze({ presence: rule.presence, path: freezeAllowedPath(rule.path) })
  )
);

export const CONTENT_ROUTE_REFERENCE_PATH = freezeAllowedPath({
  sourceKind: "setting",
  settingKey: "site.contentRoutes",
  segments: ["value", "*", "detailPageId"],
  targetKind: "detail_page",
});

export const REFERENCE_PATHS: readonly AllowedReferencePath[] = Object.freeze([
  ...FIXED_REFERENCE_RULES.map(({ path }) => path),
  CONTENT_ROUTE_REFERENCE_PATH,
]);
