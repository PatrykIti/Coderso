import { expect } from "vitest";

import {
  FullSitePackageError,
  type FullSitePackageErrorCode,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type VisualResidual,
} from "../../../core/services/kits/fullSitePackage/types";

export const emptyFullSitePackageResources = (): FullSitePackageResources => ({
  contentTypes: [],
  forms: [],
  pageTemplates: [],
  listingTemplates: [],
  entries: [],
  listingQueries: [],
  detailPages: [],
  pages: [],
  menus: [],
  settings: [],
});

export const validFullSitePackage = (): FullSitePackageV1 => ({
  schemaVersion: 1,
  key: "reference-package",
  metadata: {
    name: "Reference Package",
    locale: "pl-PL",
    description: "A deterministic package fixture.",
  },
  resources: emptyFullSitePackageResources(),
});

export const validVisualResidual = (id = "favicon-not-installed"): VisualResidual => ({
  id,
  prototypeEvidence: "Prototype contains a favicon.",
  cmsConstraint: "The package has no media resource kind.",
  installedApproximation: "The existing favicon remains.",
  userVisibleDifference: "Brand favicon is not installed.",
  impact: {
    functional: false,
    accessibility: false,
    data: false,
    security: false,
    testIntegrity: false,
  },
  postInstallRemediation: "Upload the approved favicon through the media library.",
});

export const expectFullSitePackageCode = (
  callback: () => unknown,
  code: FullSitePackageErrorCode
): FullSitePackageError => {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(FullSitePackageError);
    expect((error as FullSitePackageError).code).toBe(code);
    return error as FullSitePackageError;
  }
  throw new Error(`Expected ${code}`);
};
