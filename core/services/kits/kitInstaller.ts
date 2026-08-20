import {
  applySolutionKitInstall,
  defaultLegacyInstallLedger,
  getSolutionKitInstallRun,
  rollbackSolutionKitInstall,
  type ApplySolutionKitInstallInput,
  type RollbackSolutionKitInstallInput,
  type SolutionKitInstallResult,
  type SolutionKitInstallRunRecord,
  type SolutionKitInstallSummary,
} from "./solutionKitsInstallService";
import type { JsonObject } from "./fullSitePackage/types";
import { buildSolutionKitManifest, type SolutionKitManifest } from "./kitManifest";
import { getSolutionKitFromCatalog } from "./solutionKitsCatalog";
import type { SolutionKitDefinition, SolutionKitId } from "./solutionKitTypes";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

const buildRunOptions = (runOptions: JsonRecord, manifest: SolutionKitManifest) => ({
  ...runOptions,
  manifest,
});

const resolveKitDefinition = (
  kitId: string,
  kitDefinitionOverride?: SolutionKitDefinition
): SolutionKitDefinition => {
  const definition = kitDefinitionOverride ?? getSolutionKitFromCatalog(kitId as SolutionKitId);
  if (!definition) throw new Error("solution_kit_not_found");
  return definition;
};

const persistRunMetadata = async (
  run: SolutionKitInstallRunRecord,
  summary: SolutionKitInstallSummary,
  options: JsonRecord,
  isDryRun: boolean
) => {
  if (isDryRun) {
    return {
      ...run,
      options,
      summary,
    };
  }

  const patchRunMetadata = defaultLegacyInstallLedger.patchRunMetadata;
  if (!patchRunMetadata) throw new Error("solution_kit_install_failed");
  const patched = await patchRunMetadata({
    runId: run.id,
    status: run.status,
    summary: summary as unknown as JsonObject,
    error: run.error,
    options: options as JsonObject,
  });

  if (!patched) return { ...run, options, summary };
  const updated = await getSolutionKitInstallRun(run.id);
  if (!updated) return { ...run, options, summary };

  return {
    ...run,
    status: updated.status as SolutionKitInstallRunRecord["status"],
    summary,
    error: updated.error,
    options,
    updatedAt: updated.updatedAt,
  };
};

export type ApplyKitInstallResult = SolutionKitInstallResult & {
  manifest: SolutionKitManifest;
};

export async function applyKitInstall(
  input: ApplySolutionKitInstallInput
): Promise<ApplyKitInstallResult> {
  const definition = resolveKitDefinition(input.kitId, input.kitDefinitionOverride);
  const manifest = buildSolutionKitManifest(definition);

  const coreResult = await applySolutionKitInstall({
    ...input,
    kitDefinitionOverride: definition,
    runOptions: {
      ...asRecord(input.runOptions),
      manifest,
    },
  });

  const options = buildRunOptions(coreResult.run.options, manifest);
  const run = await persistRunMetadata(
    coreResult.run,
    coreResult.summary,
    options,
    Boolean(input.dryRun)
  );

  return {
    ...coreResult,
    run,
    summary: coreResult.summary,
    manifest,
  };
}

const resolveSourceRun = async (input: RollbackSolutionKitInstallInput) => {
  if (input.sourceRunId) {
    const run = await defaultLegacyInstallLedger.getRun(input.sourceRunId);
    if (!run) throw new Error("solution_kit_install_run_not_found");
    if (run.mode !== "apply") throw new Error("solution_kit_rollback_invalid_source");
    return run;
  }

  if (!input.kitId) throw new Error("solution_kit_rollback_source_required");

  const findLatestSuccessfulApplyRun = defaultLegacyInstallLedger.findLatestSuccessfulApplyRun;
  if (!findLatestSuccessfulApplyRun) throw new Error("solution_kit_install_failed");
  const run = await findLatestSuccessfulApplyRun(input.kitId);

  if (!run) throw new Error("solution_kit_rollback_source_not_found");
  return run;
};

export type RollbackKitInstallResult = SolutionKitInstallResult;

export async function rollbackKitInstall(
  input: RollbackSolutionKitInstallInput
): Promise<RollbackKitInstallResult> {
  const sourceRun = await resolveSourceRun(input);

  return rollbackSolutionKitInstall({
    ...input,
    sourceRunId: sourceRun.id,
  });
}
