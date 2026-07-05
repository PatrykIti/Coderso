// TASK-482-06-L01: `starterContentService` — a thin onboarding wrapper over the
// existing Solution Kit installer (`kitInstaller.ts`) that seeds a working
// starter site and wires the result into the public `site.*` shell settings.
//
// Security posture (see 06-L01 Security Contract): the blueprint is ALWAYS
// server-chosen. Callers may pass a `kitId` (resolved against
// `solutionKitsCatalog.ts`) or a `blueprintKey` (resolved against the in-repo
// `STARTER_BLUEPRINTS` registry); a raw client `SolutionKitDefinition` is never
// accepted (type + runtime guard). The privileged install runs here; RBAC/CSRF
// are enforced by the route (06-L02).

import { getSolutionKitFromCatalog } from "../kits/solutionKitsCatalog";
import {
  applyKitInstall,
  rollbackKitInstall,
  type ApplyKitInstallResult,
} from "../kits/kitInstaller";
import type { RollbackSolutionKitInstallInput } from "../kits/solutionKitsInstallService";
import { getSolutionKitInstallRun } from "../kits/solutionKitsInstallService";
import type {
  SolutionKitDefinition,
  SolutionKitId,
  SolutionKitTemplateBlueprint,
} from "../kits/solutionKitTypes";
import { getSetting, setSettings } from "../settings/settingsService";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

// The curated default starter blueprint declares its footer template under this
// fixed key so `extractShellRefs` can locate the seeded template — core install
// items carry no template resource type (see below).
export const STARTER_FOOTER_TEMPLATE_KEY = "starter-footer";

// A registered `footer` widget block using only its canonical defaults (so it
// validates against the widget schema on write). This is the seeded starter
// footer that `site.footerTemplateId` is pointed at.
const starterFooterBlocks: Array<Record<string, unknown>> = [
  {
    id: "starter-footer-block",
    type: "footer",
    variant: "columns-2",
    data: {},
  },
];

const starterFooterTemplate: SolutionKitTemplateBlueprint = {
  key: STARTER_FOOTER_TEMPLATE_KEY,
  name: "Starter Footer",
  description: "Default site footer seeded by the starter content kit.",
  category: "Navigation",
  status: "published",
  blocks: starterFooterBlocks,
};

// CLOSED-UNION CONSTRAINT (SolutionKitId): `SolutionKitDefinition.id` and
// `ApplySolutionKitInstallInput.kitId` are typed to the closed `solutionKitIds`
// union, so the default starter kit REUSES an existing catalog id
// ("local-service-business") — resolution (A) from the 06-L01 pseudocode. Its id
// therefore collides with the catalog kit, so `rollbackStarterContent` MUST roll
// back by `sourceRunId`, never by kitId.
const STARTER_BASE_KIT_ID: SolutionKitId = "local-service-business";

const buildDefaultStarterDefinition = (): SolutionKitDefinition => {
  const base = getSolutionKitFromCatalog(STARTER_BASE_KIT_ID);
  if (!base) throw new Error("starter_kit_unknown");
  return {
    ...base,
    resourceBlueprint: {
      ...base.resourceBlueprint,
      templates: [...(base.resourceBlueprint.templates ?? []), starterFooterTemplate],
    },
  };
};

export const DEFAULT_STARTER_KIT_DEFINITION: SolutionKitDefinition =
  buildDefaultStarterDefinition();

// Curated, in-repo registry — the ONLY server blueprints selectable by key.
export const STARTER_BLUEPRINTS = {
  default: DEFAULT_STARTER_KIT_DEFINITION,
} as const;

export type StarterBlueprintKey = keyof typeof STARTER_BLUEPRINTS;

export type StarterChoice = { kitId: string } | { blueprintKey: StarterBlueprintKey };

type StarterShellRefs = {
  homepageId: string | null;
  navigationMenuId: string | null;
  footerTemplateId: string | null;
};

function resolveDefinition(choice: StarterChoice): SolutionKitDefinition {
  if ("blueprintKey" in choice) {
    const def = STARTER_BLUEPRINTS[choice.blueprintKey];
    if (!def) throw new Error("starter_kit_unknown");
    return def;
  }
  const def = getSolutionKitFromCatalog(choice.kitId as SolutionKitId);
  if (!def) throw new Error("starter_kit_unknown");
  return def;
}

const readSettingId = async (key: string): Promise<string | null> => {
  const value = await getSetting(key);
  return typeof value === "string" && value.length > 0 ? value : null;
};

// SolutionKitInstallResourceType is only "content_type" | "form" | "page" |
// "menu" — there is NO template variant, so `footerTemplateId` MUST come from
// `result.templateInstall.items`, never the core install items.
function extractShellRefs(result: ApplyKitInstallResult): StarterShellRefs {
  // Homepage: normalizePageSlug maps "" and "/" to "/", so the homepage is the
  // core install item with resourceType "page" and resourceKey "/".
  const homepageId =
    (result.items.find((item) => item.resourceType === "page" && item.resourceKey === "/")
      ?.afterSnapshot?.id as string | undefined) ?? null;
  // Navigation menu: menu install items are keyed `location:${location}`; the
  // curated starter's primary menu uses location "primary".
  const navigationMenuId =
    (result.items.find(
      (item) => item.resourceType === "menu" && item.resourceKey === "location:primary"
    )?.afterSnapshot?.id as string | undefined) ?? null;
  // Footer template: the templateInstall item whose key matches the curated
  // definition's declared footer template key.
  const footerItem = result.templateInstall?.items.find(
    (item) => item.key === STARTER_FOOTER_TEMPLATE_KEY
  );
  const footerTemplateId = footerItem?.afterSnapshot?.id ?? footerItem?.templateId ?? null;
  return { homepageId, navigationMenuId, footerTemplateId };
}

export async function previewStarterContent(choice: StarterChoice) {
  const def = resolveDefinition(choice);
  const result = await applyKitInstall({
    kitId: def.id,
    kitDefinitionOverride: def,
    dryRun: true,
  });
  // NOTE: dry-run is NOT write-free. `applySolutionKitInstall` unconditionally
  // persists a `solution_kit_install_runs` row (mode "dry_run"), one
  // `solution_kit_install_items` row per operation and a
  // `logAudit("solution_kits.apply")` record; it only skips content/template
  // mutations and the kitInstaller `persistRunMetadata` update. No
  // content/template rows are written.
  return result.summary;
}

export async function applyStarterContent(choice: StarterChoice, actorId: string) {
  const def = resolveDefinition(choice);
  // Snapshot the prior shell refs BEFORE installing so rollback can restore
  // them; persist the snapshot on the run itself via runOptions so it survives
  // process restarts.
  const priorShellRefs: StarterShellRefs = {
    homepageId: await readSettingId("site.homepageId"),
    navigationMenuId: await readSettingId("site.navigationMenuId"),
    footerTemplateId: await readSettingId("site.footerTemplateId"),
  };
  const result = await applyKitInstall({
    kitId: def.id,
    kitDefinitionOverride: def,
    actorId,
    dryRun: false,
    runOptions: { starterContent: { priorShellRefs } },
  });
  // Wire the seeded shell into settings (ids come from the install result).
  const refs = extractShellRefs(result);
  const patch: Record<string, string> = {};
  if (refs.homepageId) patch["site.homepageId"] = refs.homepageId;
  if (refs.navigationMenuId) patch["site.navigationMenuId"] = refs.navigationMenuId;
  if (refs.footerTemplateId) patch["site.footerTemplateId"] = refs.footerTemplateId;
  if (Object.keys(patch).length > 0) {
    await setSettings(patch);
  }
  return { runId: result.run.id, summary: result.summary };
}

const readPriorShellRefs = async (input: {
  sourceRunId?: string;
}): Promise<StarterShellRefs | null> => {
  if (!input.sourceRunId) return null;
  const run = await getSolutionKitInstallRun(input.sourceRunId);
  if (!run) return null;
  const starter = isRecord(run.options.starterContent) ? run.options.starterContent : null;
  const prior = starter && isRecord(starter.priorShellRefs) ? starter.priorShellRefs : null;
  if (!prior) return null;
  const readRef = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;
  return {
    homepageId: readRef(prior.homepageId),
    navigationMenuId: readRef(prior.navigationMenuId),
    footerTemplateId: readRef(prior.footerTemplateId),
  };
};

export async function rollbackStarterContent(input: { sourceRunId?: string; kitId?: string }) {
  // Read the prior shell refs off the SOURCE run BEFORE rolling back.
  const prior = await readPriorShellRefs(input);
  const rollbackInput: RollbackSolutionKitInstallInput = {
    sourceRunId: input.sourceRunId,
    kitId: input.kitId as SolutionKitId | undefined,
  };
  const result = await rollbackKitInstall(rollbackInput);
  // `rollbackKitInstall` reverses content + template seeds ONLY — it never
  // touches settings. Without this step site.homepageId/navigationMenuId/
  // footerTemplateId would keep pointing at deleted records (a broken shell).
  await setSettings({
    "site.homepageId": prior?.homepageId ?? null,
    "site.navigationMenuId": prior?.navigationMenuId ?? null,
    "site.footerTemplateId": prior?.footerTemplateId ?? null,
  });
  return result;
}
