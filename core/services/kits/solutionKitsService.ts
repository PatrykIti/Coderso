import { buildSiteBuilderPlan } from "../assistant/siteBuilderPlanner";
import {
  getSolutionKitFromCatalog,
  listSolutionKitsCatalog,
} from "./solutionKitsCatalog";
import {
  type SiteBuilderPlanInput,
  type SolutionKitId,
  type SolutionKitSummary,
} from "./solutionKitTypes";
import {
  getSolutionKitInstallRun,
  listSolutionKitInstallItems,
  listSolutionKitInstallRuns,
} from "./solutionKitsInstallService";
import { applyKitInstall, rollbackKitInstall } from "./kitInstaller";

export const listSolutionKits = (): SolutionKitSummary[] =>
  listSolutionKitsCatalog().map((kit) => ({
    id: kit.id,
    title: kit.title,
    shortDescription: kit.shortDescription,
    recommendedModules: [...kit.recommendedModules],
    features: [...kit.features],
    manifest: kit.manifest,
  }));

export const getSolutionKit = (id: SolutionKitId) => getSolutionKitFromCatalog(id);

export const previewSolutionKitPlan = (input: SiteBuilderPlanInput) =>
  buildSiteBuilderPlan(input);

export {
  applyKitInstall as applySolutionKitInstall,
  rollbackKitInstall as rollbackSolutionKitInstall,
  listSolutionKitInstallRuns,
  getSolutionKitInstallRun,
  listSolutionKitInstallItems,
};
