import { eq, and, desc } from "drizzle-orm";

import { db } from "../../db/client";
import { solutionKitInstallRuns } from "../../db/schema";
import {
  applySolutionKitInstall,
  getSolutionKitInstallRun,
  rollbackSolutionKitInstall,
  type ApplySolutionKitInstallInput,
  type RollbackSolutionKitInstallInput,
  type SolutionKitInstallResult,
  type SolutionKitInstallRunRecord,
  type SolutionKitInstallSummary,
} from "./solutionKitsInstallService";
import { buildSolutionKitManifest, type SolutionKitManifest } from "./kitManifest";
import { buildTemplateSeedsForKit } from "./kitTemplateSeeds";
import { getSolutionKitFromCatalog } from "./solutionKitsCatalog";
import type { SolutionKitDefinition, SolutionKitId } from "./solutionKitTypes";
import {
  applyTemplateInstall,
  rollbackTemplateInstall,
  type TemplateInstallResult,
  type TemplateInstallRollbackAction,
  type TemplateInstallSnapshot,
} from "../templates/templateInstaller";
import type { WidgetBlock } from "../../widgets/types";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "../widgets/widgetTemplateSettings";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

const mergeSummary = (
  base: SolutionKitInstallSummary,
  templates: TemplateInstallResult | null
): SolutionKitInstallSummary => {
  if (!templates) return base;
  return {
    total: base.total + templates.summary.total,
    success: base.success + templates.summary.success,
    failed: base.failed + templates.summary.failed,
    planned: base.planned + templates.summary.planned,
    skipped: base.skipped,
    operations: {
      ...base.operations,
      create: base.operations.create + templates.summary.operations.create,
      update: base.operations.update + templates.summary.operations.update,
      noop: base.operations.noop + templates.summary.operations.noop,
      delete: base.operations.delete,
      restore: base.operations.restore,
    },
  };
};

const toTemplateRollbackPlan = (value: unknown): TemplateInstallRollbackAction[] => {
  if (!Array.isArray(value)) return [];
  const items: TemplateInstallRollbackAction[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const key = typeof entry.key === "string" ? entry.key : null;
    const templateId = typeof entry.templateId === "string" ? entry.templateId : null;
    const operation = entry.operation;
    if (!key || !templateId) continue;
    if (operation !== "create" && operation !== "update") continue;

    let beforeSnapshot: TemplateInstallSnapshot | null = null;
    if (isRecord(entry.beforeSnapshot)) {
      const snapshot = entry.beforeSnapshot;
      if (
        typeof snapshot.id === "string" &&
        typeof snapshot.name === "string" &&
        typeof snapshot.category === "string" &&
        (snapshot.status === "draft" || snapshot.status === "published")
      ) {
        beforeSnapshot = {
          id: snapshot.id,
          name: snapshot.name,
          description:
            snapshot.description === null || typeof snapshot.description === "string"
              ? snapshot.description
              : null,
          category: snapshot.category,
          status: snapshot.status,
          blocks: Array.isArray(snapshot.blocks) ? (snapshot.blocks as WidgetBlock[]) : [],
          settings: isRecord(snapshot.settings)
            ? (snapshot.settings as WidgetTemplateSettings)
            : normalizeWidgetTemplateSettings(undefined),
        };
      }
    }

    items.push({
      key,
      operation,
      templateId,
      beforeSnapshot,
    });
  }
  return items;
};

const buildRunOptions = (
  runOptions: JsonRecord,
  manifest: SolutionKitManifest,
  templateInstall: TemplateInstallResult | null
) => ({
  ...runOptions,
  manifest,
  kitInstaller: {
    templateInstallSummary: templateInstall?.summary ?? null,
    templateRollbackPlan: templateInstall?.rollbackPlan ?? [],
  },
});

const resolveKitDefinition = (
  kitId: string,
  kitDefinitionOverride?: SolutionKitDefinition
): SolutionKitDefinition => {
  const definition =
    kitDefinitionOverride ?? getSolutionKitFromCatalog(kitId as SolutionKitId);
  if (!definition) throw new Error("solution_kit_not_found");
  return definition;
};

const persistRunMetadata = async (
  run: SolutionKitInstallRunRecord,
  summary: SolutionKitInstallSummary,
  options: JsonRecord,
  templateInstall: TemplateInstallResult | null,
  isDryRun: boolean
) => {
  if (isDryRun) {
    return {
      ...run,
      options,
      summary,
    };
  }

  const failed = templateInstall?.summary.failed ?? 0;
  const nextStatus = failed > 0 && run.status === "success" ? "failed" : run.status;
  const nextError =
    failed > 0 && run.status === "success"
      ? `template_failed_operations:${failed}`
      : run.error;

  const [updated] = await db
    .update(solutionKitInstallRuns)
    .set({
      status: nextStatus,
      summary,
      error: nextError,
      options,
      updatedAt: new Date(),
    })
    .where(eq(solutionKitInstallRuns.id, run.id))
    .returning();

  if (!updated) return { ...run, options, summary, status: nextStatus, error: nextError };

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
  templateInstall: TemplateInstallResult | null;
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

  const templateSeeds = buildTemplateSeedsForKit(definition);
  const templateInstall =
    templateSeeds.length > 0
      ? await applyTemplateInstall({
          kitId: definition.id,
          actorId: input.actorId ?? null,
          seeds: templateSeeds,
          dryRun: input.dryRun,
          continueOnError: input.continueOnError,
        })
      : null;

  const summary = mergeSummary(coreResult.summary, templateInstall);
  const options = buildRunOptions(coreResult.run.options, manifest, templateInstall);
  const run = await persistRunMetadata(
    coreResult.run,
    summary,
    options,
    templateInstall,
    Boolean(input.dryRun)
  );

  return {
    ...coreResult,
    run,
    summary,
    manifest,
    templateInstall,
  };
}

const resolveSourceRun = async (input: RollbackSolutionKitInstallInput) => {
  if (input.sourceRunId) {
    const run = await getSolutionKitInstallRun(input.sourceRunId);
    if (!run) throw new Error("solution_kit_install_run_not_found");
    if (run.mode !== "apply") throw new Error("solution_kit_rollback_invalid_source");
    return run;
  }

  if (!input.kitId) throw new Error("solution_kit_rollback_source_required");

  const [run] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(
      and(
        eq(solutionKitInstallRuns.kitId, input.kitId),
        eq(solutionKitInstallRuns.mode, "apply"),
        eq(solutionKitInstallRuns.status, "success")
      )
    )
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(1);

  if (!run) throw new Error("solution_kit_rollback_source_not_found");

  return {
    id: run.id,
    kitId: run.kitId,
    mode: run.mode as SolutionKitInstallRunRecord["mode"],
    status: run.status as SolutionKitInstallRunRecord["status"],
    actorId: run.actorId ?? null,
    rollbackOfRunId: run.rollbackOfRunId,
    options: asRecord(run.options),
    summary: asRecord(run.summary) as SolutionKitInstallRunRecord["summary"],
    error: run.error,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    finishedAt: run.finishedAt,
  };
};

export type RollbackKitInstallResult = SolutionKitInstallResult & {
  templateRollback: TemplateInstallResult | null;
};

export async function rollbackKitInstall(
  input: RollbackSolutionKitInstallInput
): Promise<RollbackKitInstallResult> {
  const sourceRun = await resolveSourceRun(input);

  const installerOptions = isRecord(sourceRun.options.kitInstaller)
    ? sourceRun.options.kitInstaller
    : null;
  const templateRollbackPlan = toTemplateRollbackPlan(
    installerOptions ? installerOptions.templateRollbackPlan : null
  );

  const templateRollback =
    templateRollbackPlan.length > 0
      ? await rollbackTemplateInstall({
          rollbackPlan: templateRollbackPlan,
          continueOnError: input.continueOnError,
        })
      : null;

  const coreResult = await rollbackSolutionKitInstall({
    ...input,
    sourceRunId: sourceRun.id,
  });

  return {
    ...coreResult,
    templateRollback,
  };
}
