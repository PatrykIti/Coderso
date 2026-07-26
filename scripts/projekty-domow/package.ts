import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";

import { buildReferencePlan } from "../../core/services/kits/fullSitePackage/referenceGraph";
import { normalizeFullSitePackageForWrite } from "../../core/services/kits/fullSitePackage/normalize";
import type {
  FullSitePackageV1,
  VisualResidual,
} from "../../core/services/kits/fullSitePackage/types";
import { buildFormaDomContentResources } from "./content/buildFormaDomContentResources";
import { buildFormaDomPages } from "./pages";
import { buildFooterTemplate, buildPrimaryMenu, buildShellSettings } from "./shell";

const noImpact = {
  functional: false,
  accessibility: false,
  data: false,
  security: false,
  testIntegrity: false,
} as const;

const residual = (
  id: string,
  prototypeEvidence: string,
  cmsConstraint: string,
  installedApproximation: string,
  userVisibleDifference: string,
  postInstallRemediation: string
): VisualResidual => ({
  id,
  prototypeEvidence,
  cmsConstraint,
  installedApproximation,
  userVisibleDifference,
  impact: { ...noImpact },
  postInstallRemediation,
});

export const buildFormaDomPackage = (): FullSitePackageV1 => {
  const content = buildFormaDomContentResources();
  const pages = buildFormaDomPages({
    contentType: { ref: "content_type", key: "house-project" },
    listingQuery: { ref: "listing_query", key: "published-projects" },
    listingTemplate: { ref: "listing_template", key: "project-cards" },
    form: { ref: "form", key: "project-brief" },
  });
  const input = {
    schemaVersion: 1,
    key: "formadom-studio",
    metadata: {
      name: "FormaDom Studio",
      locale: "pl-PL",
      description: "Kompletny przykład witryny pracowni projektów domów.",
    },
    resources: {
      ...content,
      pageTemplates: [buildFooterTemplate()],
      pages,
      menus: [buildPrimaryMenu()],
      settings: [...content.settings, ...buildShellSettings()],
    },
    compatibility: {
      unresolvedVisuals: [
        residual(
          "favicon-not-installed",
          "_docs/_DEMO/projekty-domow.page.json — PageDocumentV2 reference has no favicon or asset resource",
          "FullSitePackageV1 has no asset/media resource kind",
          "site keeps its existing favicon",
          "prototype brand favicon is not installed",
          "upload and configure the approved brand favicon"
        ),
        residual(
          "real-project-and-team-imagery-not-installed",
          "_docs/_DEMO/projekty-domow.page.json — hero-bp-svg, wowPanel-house and featuredProjects use generated SVG/card surfaces instead of media resources",
          "TASK-547 seeds no CMS media IDs",
          "safe SVG, gradient and card artwork",
          "abstract artwork replaces photography",
          "replace placeholders through Media Library"
        ),
        residual(
          "css-effects-approximated",
          "_docs/_DEMO/projekty-domow.page.json — hero-sec ambient-orbs/layered composition, reveal-up sections and cursor spotlight",
          "Page v2 exposes bounded effects instead of arbitrary CSS",
          "native spotlight, switcher, drift and magnetic effects",
          "some decorative motion and clipping differ",
          "recreate approved effects through future bounded Page controls"
        ),
        residual(
          "exact-breakpoints-approximated",
          "_docs/_DEMO/projekty-domow.page.json — breakpoints are desktop, tablet and mobile",
          "Page v2 uses canonical desktop, tablet and mobile breakpoints",
          "tablet and mobile overrides preserve layout intent",
          "transitions occur at canonical rather than prototype widths",
          "adjust canonical breakpoint policy only through a separate product change"
        ),
      ],
    },
    verification: {
      scenarioIds: [
        "home-desktop-effects",
        "all-routes-desktop-shell",
        "tablet-responsive",
        "mobile-navigation",
        "portfolio-facets",
        "aurora-detail",
        "contact-form",
        "publish-rollback",
      ],
    },
  };
  const cleanInput = JSON.parse(JSON.stringify(input)) as unknown;
  const pkg = normalizeFullSitePackageForWrite(cleanInput);
  buildReferencePlan(pkg);
  return pkg;
};

const canonicalArtifactPath = fileURLToPath(
  new URL("../../_docs/_DEMO/projekty-domow.site.json", import.meta.url)
);

export const serializeFormaDomPackage = async (): Promise<string> => {
  const prettierConfig = await resolveConfig(canonicalArtifactPath);
  return format(JSON.stringify(buildFormaDomPackage()), {
    ...(prettierConfig ?? {}),
    filepath: canonicalArtifactPath,
  });
};
