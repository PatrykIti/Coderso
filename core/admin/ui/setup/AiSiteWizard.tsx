import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  previewSolutionKitPlan,
  type SiteBuilderBusinessType,
  type SiteBuilderGoal,
  type SiteBuilderPlanOutput,
  type SiteBuilderPlanStepId,
  type SolutionKitDefinition,
  type SolutionKitId,
  type SolutionKitInstallRunRecord,
  type SolutionKitSummary,
} from "@/services/solutionKitsClient";
import { useSolutionKitRuns } from "@/ui/kits/hooks/useSolutionKitRuns";
import {
  AI_SITE_WIZARD_DEFAULT_DRAFT,
  getDefaultEnabledStepIds,
  mergeDraftFromRunOptions,
  readWizardPlanFromRunOptions,
  toPlanApplyInput,
  type AiSiteWizardStep,
  type AiSiteWizardDraft,
  validateAiSiteWizardStep,
} from "@/ui/setup/aiSiteWizardValidation";

type AiSiteWizardProps = {
  kits: SolutionKitSummary[];
  selectedKitId: SolutionKitId | null;
  selectedKit: SolutionKitDefinition | null;
  onSelectKit: (kitId: SolutionKitId) => void;
};

const wizardSteps: Array<{ id: AiSiteWizardStep; title: string; description: string }> = [
  {
    id: 1,
    title: "Business profile",
    description: "Set audience, locale, and basic site identity.",
  },
  {
    id: 2,
    title: "Goals",
    description: "Choose outcomes to optimize starter setup.",
  },
  {
    id: 3,
    title: "Recommendation",
    description: "Review AI recommendation and pick the base kit.",
  },
  {
    id: 4,
    title: "Plan review",
    description: "Edit execution steps before apply.",
  },
  {
    id: 5,
    title: "Execute",
    description: "Run apply/dry-run and manage rollback-safe timeline.",
  },
];

const businessTypeOptions: Array<{ value: SiteBuilderBusinessType; label: string }> = [
  { value: "automotive_workshop", label: "Automotive workshop" },
  { value: "medical_clinic", label: "Medical clinic" },
  { value: "beauty_salon", label: "Beauty salon" },
  { value: "services_directory", label: "Services directory" },
  { value: "small_ecommerce", label: "Small e-commerce" },
  { value: "custom", label: "Custom" },
];

const goalOptions: Array<{ value: SiteBuilderGoal; label: string; description: string }> = [
  {
    value: "lead_generation",
    label: "Lead generation",
    description: "Capture contact opportunities from key pages.",
  },
  {
    value: "online_booking",
    label: "Online booking",
    description: "Enable appointment or service booking workflows.",
  },
  {
    value: "catalog_showcase",
    label: "Catalog showcase",
    description: "Present offers or services as structured listings.",
  },
  {
    value: "reviews_social_proof",
    label: "Reviews",
    description: "Prioritize trust sections and moderation-ready reviews.",
  },
  {
    value: "sell_products",
    label: "Sell products",
    description: "Prepare commerce-oriented pages and conversion slots.",
  },
  {
    value: "collect_qualified_leads",
    label: "Qualified leads",
    description: "Use richer forms for pre-qualified inquiries.",
  },
];

const formatRunDate = (value: string | null) => {
  if (!value) return "In progress";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const runStatusBadgeVariant = (run: SolutionKitInstallRunRecord) => {
  if (run.status === "failed") return "destructive" as const;
  if (run.mode === "dry_run") return "secondary" as const;
  if (run.status === "success") return "default" as const;
  return "outline" as const;
};

const normalizeLocale = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "en";
};

const formatBusinessType = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const hasStep = (
  plan: SiteBuilderPlanOutput | null,
  stepId: SiteBuilderPlanStepId
) => plan?.steps.some((step) => step.id === stepId) ?? false;

const countForStep = (
  kit: SolutionKitDefinition | null,
  stepId: SiteBuilderPlanStepId
) => {
  if (!kit) return 0;
  if (stepId === "content-model") return kit.resourceBlueprint.contentTypes.length;
  if (stepId === "pages") return kit.resourceBlueprint.pages.length;
  if (stepId === "forms") return kit.resourceBlueprint.forms.length;
  if (stepId === "navigation") return kit.resourceBlueprint.menus.length;
  return 0;
};

export function AiSiteWizard({ kits, selectedKitId, selectedKit, onSelectKit }: AiSiteWizardProps) {
  const [step, setStep] = useState<AiSiteWizardStep>(1);
  const [draft, setDraft] = useState<AiSiteWizardDraft>(AI_SITE_WIZARD_DEFAULT_DRAFT);
  const [plan, setPlan] = useState<SiteBuilderPlanOutput | null>(null);
  const [enabledStepIds, setEnabledStepIds] = useState<SiteBuilderPlanStepId[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);

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
    apply,
    rollback,
    isMutating,
    mutationError,
    lastResult,
    latestApplyRunId,
  } = useSolutionKitRuns(selectedKitId);

  useEffect(() => {
    if (!plan) return;
    setEnabledStepIds(getDefaultEnabledStepIds(plan));
  }, [plan]);

  const selectedSummary = useMemo(
    () => kits.find((item) => item.id === selectedKitId) ?? null,
    [kits, selectedKitId]
  );

  const latestApplyRun = useMemo(
    () => runs.find((run) => run.mode === "apply") ?? null,
    [runs]
  );

  const toggleGoal = (goal: SiteBuilderGoal, checked: boolean | string) => {
    setDraft((previous) => {
      const current = previous.goals;
      if (checked && !current.includes(goal)) {
        return { ...previous, goals: [...current, goal] };
      }
      if (!checked) {
        return { ...previous, goals: current.filter((item) => item !== goal) };
      }
      return previous;
    });
  };

  const toggleStep = (stepId: SiteBuilderPlanStepId, checked: boolean | string) => {
    setEnabledStepIds((previous) => {
      if (checked && !previous.includes(stepId)) {
        return [...previous, stepId];
      }
      if (!checked) {
        return previous.filter((item) => item !== stepId);
      }
      return previous;
    });
  };

  const generatePlan = async () => {
    setIsPlanLoading(true);
    setPlanError(null);
    try {
      const nextPlan = await previewSolutionKitPlan({
        businessType: draft.businessType,
        goals: draft.goals,
        locale: normalizeLocale(draft.locale),
        siteName: draft.siteName.trim().length > 0 ? draft.siteName.trim() : null,
        preferredKitId: selectedKitId,
      });
      setPlan(nextPlan);
      return nextPlan;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to generate wizard plan.";
      setPlanError(message);
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
    const validation = validateAiSiteWizardStep({
      step,
      draft,
      plan,
      enabledStepIds,
    });
    if (validation) {
      setWizardError(validation);
      return;
    }

    if (step === 2) {
      const nextPlan = await generatePlan();
      if (!nextPlan) return;
    }

    moveStep((Math.min(step + 1, 5) as AiSiteWizardStep));
  };

  const handleBack = () => {
    moveStep((Math.max(step - 1, 1) as AiSiteWizardStep));
  };

  const buildApplyPlanInput = () => toPlanApplyInput(plan, enabledStepIds);

  const handleApply = async (dryRun: boolean) => {
    const validation = validateAiSiteWizardStep({
      step: 4,
      draft,
      plan,
      enabledStepIds,
    });
    if (validation) {
      setWizardError(validation);
      setStep(4);
      return;
    }

    setWizardError(null);
    await apply({
      dryRun,
      continueOnError: true,
      plan: buildApplyPlanInput(),
    });
    setStep(5);
  };

  const handleRerunLatest = async () => {
    const run = latestApplyRun;
    if (!run) return;

    const fromRun = readWizardPlanFromRunOptions(run.options);
    await apply({
      dryRun: false,
      continueOnError: true,
      plan: fromRun ?? buildApplyPlanInput(),
    });
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
          WordPress-like guided flow: plan, review, and execute deterministic solution-kit setup.
        </CardDescription>
        <div className="grid gap-2 md:grid-cols-5">
          {wizardSteps.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                if (entry.id <= step) setStep(entry.id);
              }}
              className={`rounded-md border px-2 py-2 text-left text-xs transition ${
                entry.id === step
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : entry.id < step
                    ? "border-primary/20 text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              <p className="font-semibold">{entry.title}</p>
              <p className="mt-1 line-clamp-2">{entry.description}</p>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {wizardError || planError ? (
          <Alert variant="destructive">
            <AlertTitle>Wizard action blocked</AlertTitle>
            <AlertDescription>{wizardError ?? planError}</AlertDescription>
          </Alert>
        ) : null}

        {mutationError ? (
          <Alert variant="destructive">
            <AlertTitle>Execution failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        ) : null}

        {lastResult ? (
          <Alert>
            <AlertTitle>Last run: {lastResult.run.status}</AlertTitle>
            <AlertDescription>
              Mode: {lastResult.run.mode}. Success: {lastResult.summary.success} / {lastResult.summary.total}.
            </AlertDescription>
          </Alert>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Business type</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.businessType}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    businessType: event.target.value as SiteBuilderBusinessType,
                  }))
                }
              >
                {businessTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Locale</span>
              <Input
                value={draft.locale}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    locale: event.target.value,
                  }))
                }
                placeholder="en"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground">Site name (optional)</span>
              <Input
                value={draft.siteName}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    siteName: event.target.value,
                  }))
                }
                placeholder="e.g. AutoFix Warsaw"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Business goals</p>
            <div className="space-y-2">
              {goalOptions.map((goal) => (
                <label key={goal.value} className="flex items-start gap-2 rounded-md border p-2">
                  <Checkbox
                    checked={draft.goals.includes(goal.value)}
                    onCheckedChange={(checked) => toggleGoal(goal.value, checked)}
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium text-foreground">{goal.label}</span>
                    <span className="block text-xs text-muted-foreground">{goal.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  generatePlan().catch(() => undefined);
                }}
                disabled={isPlanLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isPlanLoading ? "Refreshing..." : "Refresh recommendation"}
              </Button>
              {plan ? (
                <Badge variant="secondary">Confidence {plan.confidence}%</Badge>
              ) : null}
            </div>

            {plan ? (
              <div className="space-y-3">
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium text-foreground">Recommended kit</p>
                  <p className="text-sm text-muted-foreground">
                    {kits.find((item) => item.id === plan.recommendedKitId)?.title ??
                      plan.recommendedKitId}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => onSelectKit(plan.recommendedKitId)}
                  >
                    Use recommended kit
                  </Button>
                </div>

                <div className="space-y-2">
                  {plan.recommendations.map((recommendation) => (
                    <button
                      key={recommendation.kitId}
                      type="button"
                      onClick={() => onSelectKit(recommendation.kitId)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        selectedKitId === recommendation.kitId
                          ? "border-primary/60 bg-primary/5"
                          : "hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {kits.find((item) => item.id === recommendation.kitId)?.title ??
                            recommendation.kitId}
                        </p>
                        <Badge variant="outline">Score {recommendation.score}</Badge>
                      </div>
                      <div className="mt-1 space-y-1">
                        {recommendation.reasons.slice(0, 2).map((reason) => (
                          <p key={reason} className="text-xs text-muted-foreground">
                            {reason}
                          </p>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate a plan to see recommendation details.
              </p>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-foreground">Execution steps</p>
              <p className="text-xs text-muted-foreground">
                Disable optional steps before apply. Fixed steps stay enabled for deterministic flow.
              </p>

              <div className="mt-3 space-y-2">
                {(plan?.steps ?? []).map((planStep) => {
                  const checked = enabledStepIds.includes(planStep.id);
                  return (
                    <label key={planStep.id} className="flex items-start gap-2 rounded-md border p-2">
                      <Checkbox
                        checked={checked}
                        disabled={planStep.editable === false}
                        onCheckedChange={(value) => toggleStep(planStep.id, value)}
                      />
                      <span className="space-y-0.5">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {planStep.title}
                          {planStep.editable === false ? (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              Fixed
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">{planStep.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-foreground">Plan impact preview</p>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <p>
                  Kit: <span className="font-medium text-foreground">{selectedSummary?.title ?? "Not selected"}</span>
                </p>
                {selectedKit ? (
                  <>
                    <p>
                      Business fit: {selectedKit.businessTypes.map(formatBusinessType).join(", ")}
                    </p>
                    <p>
                      Content types: {countForStep(selectedKit, "content-model")} {hasStep(plan, "content-model") && !enabledStepIds.includes("content-model") ? "(skipped)" : ""}
                    </p>
                    <p>
                      Pages: {countForStep(selectedKit, "pages")} {hasStep(plan, "pages") && !enabledStepIds.includes("pages") ? "(skipped)" : ""}
                    </p>
                    <p>
                      Forms: {countForStep(selectedKit, "forms")} {hasStep(plan, "forms") && !enabledStepIds.includes("forms") ? "(skipped)" : ""}
                    </p>
                    <p>
                      Menus: {countForStep(selectedKit, "navigation")} {hasStep(plan, "navigation") && !enabledStepIds.includes("navigation") ? "(skipped)" : ""}
                    </p>
                  </>
                ) : (
                  <p>Select a kit to preview changes.</p>
                )}
                {plan?.notes.length ? (
                  <div className="space-y-1">
                    {plan.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => {
                  handleApply(false).catch(() => undefined);
                }}
                disabled={!selectedKitId || isMutating}
              >
                <Play className="mr-2 h-4 w-4" />
                {isMutating ? "Running..." : "Apply kit"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  handleApply(true).catch(() => undefined);
                }}
                disabled={!selectedKitId || isMutating}
              >
                Dry run
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleRerunLatest().catch(() => undefined);
                }}
                disabled={!selectedKitId || isMutating || !latestApplyRun}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Rerun
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleRollbackLatest().catch(() => undefined);
                }}
                disabled={!selectedKitId || isMutating || !latestApplyRunId}
              >
                Rollback latest
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloneLatest}
                disabled={!latestApplyRun}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone as draft
              </Button>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Run timeline</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    refreshRuns(true).catch(() => undefined);
                  }}
                  disabled={runsLoading}
                >
                  Refresh
                </Button>
              </div>

              {runsError ? <p className="text-xs text-destructive">{runsError}</p> : null}

              {runs.length === 0 && !runsLoading ? (
                <p className="text-xs text-muted-foreground">No runs yet.</p>
              ) : null}

              {runs.length > 0 ? (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className={`w-full rounded-md border p-2 text-left transition ${
                        selectedRunId === run.id
                          ? "border-primary/60 bg-primary/5"
                          : "hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">{run.mode}</p>
                        <Badge variant={runStatusBadgeVariant(run)}>{run.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatRunDate(run.finishedAt)}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              {isDetailLoading ? (
                <p className="text-xs text-muted-foreground">Loading run details...</p>
              ) : null}
              {detailError ? <p className="text-xs text-destructive">{detailError}</p> : null}

              {selectedRun ? (
                <div className="rounded-md border p-2">
                  <p className="text-xs font-medium text-foreground">
                    Run summary ({selectedRun.run.mode})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    success: {selectedRun.run.summary.success}, failed: {selectedRun.run.summary.failed}, planned: {selectedRun.run.summary.planned}, skipped: {selectedRun.run.summary.skipped}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 1 || isMutating}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {step < 5 ? (
              <Button type="button" onClick={() => void handleNext()} disabled={isPlanLoading || isMutating}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  moveStep(4);
                }}
                disabled={isMutating}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Back to review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
