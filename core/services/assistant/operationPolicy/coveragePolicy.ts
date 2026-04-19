import type { AssistantOperationPolicy, AssistantPolicyCoverageState } from "./policyTypes";

type RouteItem = { href: string };
type NavSectionLike = {
  items?: RouteItem[];
  groups?: Array<{ items: RouteItem[] }>;
  itemsAfterGroups?: RouteItem[];
};
type CodersoModuleLike = { nav: RouteItem | null };

export type AssistantLiveCoverageRow = {
  route: string;
  label: string;
  coverage: AssistantPolicyCoverageState;
  task: string;
  notes: string;
};

export const buildLiveCoverageRows = (
  policy: AssistantOperationPolicy
): AssistantLiveCoverageRow[] => {
  const byRoute = new Map<string, AssistantLiveCoverageRow>();
  for (const resource of Object.values(policy.resources)) {
    for (const route of resource.coverage.routes) {
      byRoute.set(route, {
        route,
        label: resource.label,
        coverage: resource.coverage.state,
        task: resource.coverage.task,
        notes: resource.coverage.notes ?? "",
      });
    }
  }
  return [...byRoute.values()].sort((left, right) => left.route.localeCompare(right.route));
};

export const buildLiveCoverageRouteMap = (policy: AssistantOperationPolicy) =>
  new Map(buildLiveCoverageRows(policy).map((row) => [row.route, row]));

export const buildAdminNavigationRoutes = (input: {
  navSections: NavSectionLike[];
  codersoModules: CodersoModuleLike[];
  settingsItems: RouteItem[];
}) =>
  new Set([
    ...input.navSections.flatMap((section) => [
      ...(section.items ?? []).map((item) => item.href),
      ...(section.groups ?? []).flatMap((group) => group.items.map((item) => item.href)),
      ...(section.itemsAfterGroups ?? []).map((item) => item.href),
    ]),
    ...input.codersoModules.flatMap((module) => (module.nav ? [module.nav.href] : [])),
    ...input.settingsItems.map((item) => item.href),
  ]);

export const findMissingCoverageRoutes = (
  policy: AssistantOperationPolicy,
  routes: Iterable<string>
) => {
  const policyRoutes = buildLiveCoverageRouteMap(policy);
  return [...routes].filter((route) => !policyRoutes.has(route));
};

export const findExecutablePlannedRoutes = (policy: AssistantOperationPolicy) =>
  Object.values(policy.resources)
    .filter(
      (resource) =>
        resource.coverage.state === "not-applicable" &&
        Object.values(resource.actions).some((action) => action.mode === "executable")
    )
    .flatMap((resource) =>
      resource.coverage.routes.map((route) => ({
        route,
        label: resource.label,
        coverage: resource.coverage.state,
        task: resource.coverage.task,
        notes: resource.coverage.notes ?? "",
      }))
    );
