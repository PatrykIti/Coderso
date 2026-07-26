import type { FullSitePackageResources } from "../../../core/services/kits/fullSitePackage/types";
import { buildProjectDiscoveryResources } from "./buildProjectDiscoveryResources";
import { buildProjectResources } from "./buildProjectResources";
import { buildProjectBriefForm } from "./projectForm";

export type FormaDomContentResources = Pick<
  FullSitePackageResources,
  | "contentTypes"
  | "forms"
  | "listingTemplates"
  | "entries"
  | "listingQueries"
  | "detailPages"
  | "settings"
>;

export const buildFormaDomContentResources = (): FormaDomContentResources => {
  const projects = buildProjectResources();
  const discovery = buildProjectDiscoveryResources();
  return {
    contentTypes: projects.contentTypes,
    forms: [buildProjectBriefForm()],
    listingTemplates: discovery.listingTemplates,
    entries: projects.entries,
    listingQueries: discovery.listingQueries,
    detailPages: discovery.detailPages,
    settings: discovery.settings,
  };
};
