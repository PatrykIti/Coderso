import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  executeAssistantSiteBuilder,
  previewAssistantSiteBuilderPlan,
  type GuidedSiteBuilderExecuteResponse,
  type GuidedSiteBuilderPlanResponse,
  type GuidedSiteBuilderValidationResult,
} from "@/services/assistantClient";
import { isApiClientError } from "@/services/apiClient";
import {
  type SiteBuilderGoal,
  type SiteBuilderPlanOutput,
  type SiteBuilderPlanStepId,
  type SolutionKitDefinition,
  type SolutionKitId,
  type SolutionKitSummary,
} from "@/services/solutionKitsClient";
import { useSolutionKitRuns } from "@/ui/kits/hooks/useSolutionKitRuns";
import {
  AI_SITE_WIZARD_DEFAULT_DRAFT,
  mergeDraftFromRunOptions,
  normalizeEnabledStepIds,
  readWizardPlanFromRunOptions,
  type AiSiteWizardDraft,
  type AiSiteWizardStep,
  validateAiSiteWizardStep,
} from "@/ui/setup/aiSiteWizardValidation";

import {
  AI_SITE_WIZARD_STEPS,
  AiSiteWizardProgress,
  AiSiteWizardStepContent,
} from "./AiSiteWizardSteps";

type AiSiteWizardProps = {
  kits: SolutionKitSummary[];
  selectedKitId: SolutionKitId | null;
  selectedKit: SolutionKitDefinition | null;
  onSelectKit: (kitId: SolutionKitId) => void;
};

const normalizeLocale = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "en";
};

const resolveError = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const applyEnabledStepsToPlan = (
  plan: GuidedSiteBuilderPlanResponse | null,
  enabledStepIds: SiteBuilderPlanStepId[]
): GuidedSiteBuilderPlanResponse | null => {
  if (!plan) return null;
  const enabledSet = new Set(enabledStepIds);
  return {
    ...plan,
    enabledStepIds,
    actions: plan.actions.filter((action) => enabledSet.has(action.stepId)),
  };
};

const createPlanPayload = (
  draft: AiSiteWizardDraft,
  selectedKitId: SolutionKitId | null,
  enabledStepIds?: SiteBuilderPlanStepId[]
) => ({
  businessType: draft.businessType,
  goals: [...draft.goals] as SiteBuilderGoal[],
  locale: normalizeLocale(draft.locale),
  siteName: draft.siteName.trim().length > 0 ? draft.siteName.trim() : null,
  preferredKitId: selectedKitId,
  selectedKitId,
  enabledStepIds,
});

const createExecutePayload = (
  draft: AiSiteWizardDraft,
  selectedKitId: SolutionKitId,
  enabledStepIds: SiteBuilderPlanStepId[],
  plan: SiteBuilderPlanOutput | null,
  options: {
    dryRun?: boolean;
    continueOnError?: boolean;
    settingsPatch?: Record<string, unknown>;
    notes?: string[];
  }
) => ({
  ...createPlanPayload(
    draft,
    selectedKitId,
    normalizeEnabledStepIds(plan, enabledStepIds)
  ),
  dryRun: options.dryRun,
  continueOnError: options.continueOnError,
  settingsPatch: options.settingsPatch,
  notes: options.notes,
});

export function AiSiteWizard({ kits, selectedKitId, selectedKit, onSelectKit }: AiSiteWizardProps) {
  const [step, setStep] = useState<AiSiteWizardStep>(1);
  const [draft, setDraft] = useState<AiSiteWizardDraft>(AI_SITE_WIZARD_DEFAULT_DRAFT);
  const [guidedPlan, setGuidedPlan] = useState<GuidedSiteBuilderPlanResponse | null>(null);
  const [enabledStepIds, setEnabledStepIds] = useState<SiteBuilderPlanStepId[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [lastExecution, setLastExecution] = useState<GuidedSiteBuilderExecuteResponse | null>(null);
  const [validation, setValidation] = useState<GuidedSiteBuilderValidationResult | null>(null);

  const {
    runs,
    isLoading: runsLoading,
    error: runsError,
    selectedRunId,
    setSelectedRunId,
    selectedRun,
    isDetailLoading,
    detailError,
    refreshRuns,
    rollback,
    isMutating,
    mutationError,
    latestApplyRunId,
  } = useSolutionKitRuns(selectedKitId);

  const plan = guidedPlan?.plan ?? null;

  const selectedSummary = useMemo(
    () => kits.find((item) => item.id === selectedKitId) ?? null,
    [kits, selectedKitId]
  );

  const latestApplyRun = useMemo(
    () => runs.find((run) => run.mode === "apply") ?? null,
    [runs]
  );

  const visibleGuidedPlan = useMemo(
    () => applyEnabledStepsToPlan(guidedPlan, enabledStepIds),
    [guidedPlan, enabledStepIds]
  );

  const generatePlan = async (inputEnabledStepIds?: SiteBuilderPlanStepId[]) => {
    setIsPlanLoading(true);
    setPlanError(null);
    try {
      const payload = createPlanPayload(draft, selectedKitId, inputEnabledStepIds);
      const nextPlan = await previewAssistantSiteBuilderPlan(payload);
      setGuidedPlan(nextPlan);
      setEnabledStepIds(nextPlan.enabledStepIds);
      if (selectedKitId !== nextPlan.selectedKitId) {
        onSelectKit(nextPlan.selectedKitId);
      }
      return nextPlan;
    } catch (error) {
      setPlanError(resolveError(error, "Failed to generate wizard plan."));
      return null;
    } finally {
      setIsPlanLoading(false);
    }
  };

  const moveStep = (nextStep: AiSiteWizardStep) => {
    setWizardError(null);
    setStep(nextStep);
  };

  const handleNext = async () => {
    const validationMessage = validateAiSiteWizardStep({
      step,
      draft,
      plan,
      enabledStepIds,
    });
    if (validationMessage) {
      setWizardError(validationMessage);
      return;
    }

    if (step === 2) {
      const nextPlan = await generatePlan();
      if (!nextPlan) return;
    }

    moveStep((Math.min(step + 1, AI_SITE_WIZARD_STEPS.length) as AiSiteWizardStep));
  };

  const handleBack = () => {
    moveStep((Math.max(step - 1, 1) as AiSiteWizardStep));
  };

  const handleApply = async (dryRun: boolean) => {
    const validationMessage = validateAiSiteWizardStep({
      step: 4,
      draft,
      plan,
      enabledStepIds,
    });
    if (validationMessage) {
      setWizardError(validationMessage);
      setStep(4);
      return;
    }

    if (!selectedKitId) {
      setWizardError("Select a solution kit before execution.");
      return;
    }

    setWizardError(null);
    setExecutionError(null);
    setIsExecuting(true);
    try {
      const response = await executeAssistantSiteBuilder(
        createExecutePayload(draft, selectedKitId, enabledStepIds, plan, {
          dryRun,
          continueOnError: true,
        })
      );

      setLastExecution(response);
      setGuidedPlan(response);
      setEnabledStepIds(response.enabledStepIds);
      setValidation(response.validation);
      setStep(5);

      await refreshRuns(true);
      setSelectedRunId(response.execution.run.id);
    } catch (error) {
      setExecutionError(resolveError(error, "Failed to execute guided site builder."));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRerunLatest = async () => {
    if (!selectedKitId) {
      setWizardError("Select a solution kit before rerunning.");
      return;
    }

    const run = latestApplyRun;
    if (!run) return;

    const fromRun = readWizardPlanFromRunOptions(run.options);
    const runEnabled = fromRun?.enabledStepIds ?? normalizeEnabledStepIds(plan, enabledStepIds);

    setWizardError(null);
    setExecutionError(null);
    setIsExecuting(true);
    try {
      const response = await executeAssistantSiteBuilder(
        createExecutePayload(draft, selectedKitId, runEnabled, plan, {
          dryRun: false,
          continueOnError: true,
          settingsPatch: fromRun?.settingsPatch,
          notes: fromRun?.notes,
        })
      );

      setLastExecution(response);
      setGuidedPlan(response);
      setEnabledStepIds(response.enabledStepIds);
      setValidation(response.validation);
      setStep(5);

      await refreshRuns(true);
      setSelectedRunId(response.execution.run.id);
    } catch (error) {
      setExecutionError(resolveError(error, "Failed to rerun guided site builder."));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCloneLatest = () => {
    const run = latestApplyRun;
    if (!run) {
      setWizardError("No apply run available to clone.");
      return;
    }

    const fromRun = readWizardPlanFromRunOptions(run.options);
    if (!fromRun) {
      setWizardError("Latest run does not include wizard configuration to clone.");
      return;
    }

    setEnabledStepIds((current) => mergeDraftFromRunOptions(current, fromRun));
    setWizardError(null);
    setStep(4);
  };

  const handleRollbackLatest = async () => {
    await rollback(latestApplyRunId ?? undefined);
    setStep(5);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <CardTitle className="text-base">AI Site Wizard</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px] uppercase">
            Guided
          </Badge>
        </div>
        <CardDescription>
          {AI_SITE_WIZARD_STEPS.find((s) => s.id === step)?.description ??
            "Plan, review, execute, and validate deterministic setup."}
        </CardDescription>

        <AiSiteWizardProgress step={step} onSelectStep={setStep} />
      </CardHeader>

      <CardContent className="space-y-4">
        {wizardError || planError ? (
          <Alert variant="destructive">
            <AlertTitle>Wizard action blocked</AlertTitle>
            <AlertDescription>{wizardError ?? planError}</AlertDescription>
          </Alert>
        ) : null}

        {executionError || mutationError ? (
          <Alert variant="destructive">
            <AlertTitle>Execution failed</AlertTitle>
            <AlertDescription>{executionError ?? mutationError}</AlertDescription>
          </Alert>
        ) : null}

        {lastExecution ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>
              Run complete — {lastExecution.execution.run.mode.replace("_", " ")}:{" "}
              <span className="capitalize">{lastExecution.execution.run.status}</span>
            </AlertTitle>
            <AlertDescription>
              {lastExecution.execution.summary.success} of {lastExecution.execution.summary.total} actions succeeded.
            </AlertDescription>
          </Alert>
        ) : null}

        <AiSiteWizardStepContent
          step={step}
          draft={draft}
          onDraftChange={(updater) => setDraft((previous) => updater(previous))}
          onToggleGoal={(goal, checked) =>
            setDraft((previous) => {
              const current = previous.goals;
              if (checked && !current.includes(goal)) {
                return { ...previous, goals: [...current, goal] };
              }
              if (!checked) {
                return { ...previous, goals: current.filter((item) => item !== goal) };
              }
              return previous;
            })
          }
          plan={plan}
          guidedPlan={visibleGuidedPlan}
          enabledStepIds={enabledStepIds}
          onToggleStep={(stepId, checked) =>
            setEnabledStepIds((previous) => {
              if (checked && !previous.includes(stepId)) return [...previous, stepId];
              if (!checked) return previous.filter((item) => item !== stepId);
              return previous;
            })
          }
          onGeneratePlan={() => {
            void generatePlan(enabledStepIds.length > 0 ? enabledStepIds : undefined);
          }}
          isPlanLoading={isPlanLoading}
          kits={kits}
          selectedKitId={selectedKitId}
          selectedKit={selectedKit}
          selectedSummary={selectedSummary}
          onSelectKit={onSelectKit}
          onApply={(dryRun) => {
            void handleApply(dryRun);
          }}
          onRerunLatest={() => {
            void handleRerunLatest();
          }}
          onRollbackLatest={() => {
            void handleRollbackLatest();
          }}
          onCloneLatest={handleCloneLatest}
          onRefreshRuns={() => {
            void refreshRuns(true);
          }}
          isExecuting={isExecuting || isMutating}
          runs={runs}
          runsLoading={runsLoading}
          runsError={runsError}
          selectedRunId={selectedRunId}
          onSelectRunId={setSelectedRunId}
          selectedRun={selectedRun}
          isDetailLoading={isDetailLoading}
          detailError={detailError}
          latestApplyRun={latestApplyRun}
          latestApplyRunId={latestApplyRunId}
          validation={validation}
        />

        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || isExecuting || isMutating}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < AI_SITE_WIZARD_STEPS.length ? (
            <Button
              type="button"
              onClick={() => {
                void handleNext();
              }}
              disabled={isPlanLoading || isExecuting || isMutating}
            >
              {isPlanLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                moveStep(4);
              }}
              disabled={isExecuting || isMutating}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Back to review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
