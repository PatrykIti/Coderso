import { AlertCircle, Check, CheckCircle2, Copy, Play, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  GuidedSiteBuilderPlanResponse,
  GuidedSiteBuilderValidationResult,
} from "@/services/assistantClient";
import type {
  SiteBuilderBusinessType,
  SiteBuilderGoal,
  SiteBuilderPlanOutput,
  SiteBuilderPlanStepId,
  SolutionKitDefinition,
  SolutionKitId,
  SolutionKitInstallRunRecord,
  SolutionKitSummary,
  SolutionKitRunDetail,
} from "@/services/solutionKitsClient";
import type { AiSiteWizardDraft, AiSiteWizardStep } from "@/ui/setup/aiSiteWizardValidation";

export const AI_SITE_WIZARD_STEPS: Array<{
  id: AiSiteWizardStep;
  title: string;
  description: string;
}> = [
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
    description: "Run apply/dry-run and validate unresolved items.",
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

const countForStep = (kit: SolutionKitDefinition | null, stepId: SiteBuilderPlanStepId) => {
  if (!kit) return 0;
  if (stepId === "content-model") return kit.resourceBlueprint.contentTypes.length;
  if (stepId === "pages") return kit.resourceBlueprint.pages.length;
  if (stepId === "forms") return kit.resourceBlueprint.forms.length;
  if (stepId === "navigation") return kit.resourceBlueprint.menus.length;
  return 0;
};

const statusBadgeVariant = (status: GuidedSiteBuilderValidationResult["status"]) => {
  if (status === "failed") return "destructive" as const;
  if (status === "warning") return "secondary" as const;
  return "default" as const;
};

const groupedActions = (plan: GuidedSiteBuilderPlanResponse | null) => {
  if (!plan) return [] as Array<{ stepId: SiteBuilderPlanStepId; actions: GuidedSiteBuilderPlanResponse["actions"] }>;
  const order = new Map<SiteBuilderPlanStepId, number>([
    ["settings", 1],
    ["content-model", 2],
    ["pages", 3],
    ["forms", 4],
    ["navigation", 5],
    ["qa", 6],
  ]);

  const map = new Map<SiteBuilderPlanStepId, GuidedSiteBuilderPlanResponse["actions"]>();
  for (const action of plan.actions) {
    const current = map.get(action.stepId) ?? [];
    current.push(action);
    map.set(action.stepId, current);
  }

  return [...map.entries()]
    .map(([stepId, actions]) => ({ stepId, actions }))
    .sort((left, right) => (order.get(left.stepId) ?? 99) - (order.get(right.stepId) ?? 99));
};

type AiSiteWizardProgressProps = {
  step: AiSiteWizardStep;
  onSelectStep: (step: AiSiteWizardStep) => void;
};

export function AiSiteWizardProgress({ step, onSelectStep }: AiSiteWizardProgressProps) {
  return (
    <div className="flex items-start">
      {AI_SITE_WIZARD_STEPS.map((entry, index) => {
        const isCompleted = entry.id < step;
        const isActive = entry.id === step;
        const isClickable = entry.id <= step;

        return (
          <Fragment key={entry.id}>
            {index > 0 && (
              <div
                className={cn(
                  "mt-3.5 h-px flex-1 transition-colors",
                  isCompleted || isActive ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (isClickable) onSelectStep(entry.id);
              }}
              disabled={!isClickable}
              title={entry.title}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-primary/60 bg-primary/10 text-primary",
                  !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : entry.id}
              </div>
              <span
                className={cn(
                  "hidden max-w-[56px] text-center text-[10px] leading-tight md:block",
                  isActive && "font-semibold text-primary",
                  isCompleted && "text-foreground",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {entry.title}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

type AiSiteWizardStepContentProps = {
  step: AiSiteWizardStep;
  draft: AiSiteWizardDraft;
  onDraftChange: (updater: (previous: AiSiteWizardDraft) => AiSiteWizardDraft) => void;
  onToggleGoal: (goal: SiteBuilderGoal, checked: boolean | string) => void;
  plan: SiteBuilderPlanOutput | null;
  guidedPlan: GuidedSiteBuilderPlanResponse | null;
  enabledStepIds: SiteBuilderPlanStepId[];
  onToggleStep: (stepId: SiteBuilderPlanStepId, checked: boolean | string) => void;
  onGeneratePlan: () => void;
  isPlanLoading: boolean;
  kits: SolutionKitSummary[];
  selectedKitId: SolutionKitId | null;
  selectedKit: SolutionKitDefinition | null;
  selectedSummary: SolutionKitSummary | null;
  onSelectKit: (kitId: SolutionKitId) => void;
  onApply: (dryRun: boolean) => void;
  onRerunLatest: () => void;
  onRollbackLatest: () => void;
  onCloneLatest: () => void;
  onRefreshRuns: () => void;
  isExecuting: boolean;
  runs: SolutionKitInstallRunRecord[];
  runsLoading: boolean;
  runsError: string | null;
  selectedRunId: string | null;
  onSelectRunId: (runId: string) => void;
  selectedRun: SolutionKitRunDetail | null;
  isDetailLoading: boolean;
  detailError: string | null;
  latestApplyRun: SolutionKitInstallRunRecord | null;
  latestApplyRunId: string | null;
  validation: GuidedSiteBuilderValidationResult | null;
};

export function AiSiteWizardStepContent({
  step,
  draft,
  onDraftChange,
  onToggleGoal,
  plan,
  guidedPlan,
  enabledStepIds,
  onToggleStep,
  onGeneratePlan,
  isPlanLoading,
  kits,
  selectedKitId,
  selectedKit,
  selectedSummary,
  onSelectKit,
  onApply,
  onRerunLatest,
  onRollbackLatest,
  onCloneLatest,
  onRefreshRuns,
  isExecuting,
  runs,
  runsLoading,
  runsError,
  selectedRunId,
  onSelectRunId,
  selectedRun,
  isDetailLoading,
  detailError,
  latestApplyRun,
  latestApplyRunId,
  validation,
}: AiSiteWizardStepContentProps) {
  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="business-type">
              Business type
            </label>
            <select
              id="business-type"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={draft.businessType}
              onChange={(event) =>
                onDraftChange((previous) => ({
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="locale">
              Locale
            </label>
            <Input
              id="locale"
              value={draft.locale}
              onChange={(event) =>
                onDraftChange((previous) => ({
                  ...previous,
                  locale: event.target.value,
                }))
              }
              placeholder="en"
            />
            <p className="text-xs text-muted-foreground">BCP 47 language tag (e.g. en, pl, de)</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="site-name">
            Site name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="site-name"
            value={draft.siteName}
            onChange={(event) =>
              onDraftChange((previous) => ({
                ...previous,
                siteName: event.target.value,
              }))
            }
            placeholder="e.g. AutoFix Warsaw"
          />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          Business goals
          <span className="ml-2 text-xs font-normal text-muted-foreground">Select all that apply</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {goalOptions.map((goal) => {
            const checked = draft.goals.includes(goal.value);
            return (
              <label
                key={goal.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  checked ? "border-primary/50 bg-primary/5" : "hover:border-primary/20 hover:bg-muted/30"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onToggleGoal(goal.value, value)}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">{goal.label}</span>
                  <span className="block text-xs text-muted-foreground">{goal.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onGeneratePlan} disabled={isPlanLoading}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isPlanLoading ? "Generating..." : "Refresh recommendation"}
          </Button>
          {plan ? (
            <Badge
              variant={plan.confidence >= 70 ? "default" : "secondary"}
              className="gap-1"
            >
              {plan.confidence}% confidence
            </Badge>
          ) : null}
        </div>

        {plan ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Recommended kit</p>
                <Badge variant="default" className="text-[10px] uppercase">Best match</Badge>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                {kits.find((item) => item.id === plan.recommendedKitId)?.title ?? plan.recommendedKitId}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => onSelectKit(plan.recommendedKitId)}
              >
                Use this kit
              </Button>
            </div>

            {plan.recommendations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All options</p>
                {plan.recommendations.map((recommendation) => (
                  <button
                    key={recommendation.kitId}
                    type="button"
                    onClick={() => onSelectKit(recommendation.kitId)}
                    className={cn(
                      "w-full rounded-md border p-3 text-left transition",
                      selectedKitId === recommendation.kitId
                        ? "border-primary/60 bg-primary/5"
                        : "hover:border-primary/30 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {kits.find((item) => item.id === recommendation.kitId)?.title ?? recommendation.kitId}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        Score {recommendation.score}
                      </Badge>
                    </div>
                    {recommendation.reasons.slice(0, 2).map((reason) => (
                      <p key={reason} className="mt-1 text-xs text-muted-foreground">
                        {reason}
                      </p>
                    ))}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Refresh recommendation</span> to generate an AI-based kit suggestion.
          </p>
        )}
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold text-foreground">Execution steps</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Disable optional steps before apply. Fixed steps cannot be skipped.
          </p>

          <div className="mt-3 space-y-1.5">
            {(plan?.steps ?? []).map((planStep) => {
              const checked = enabledStepIds.includes(planStep.id);
              return (
                <label
                  key={planStep.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-2.5 transition-colors",
                    planStep.editable === false
                      ? "bg-muted/30"
                      : checked
                        ? "hover:bg-muted/20"
                        : "opacity-60 hover:opacity-80"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={planStep.editable === false}
                    onCheckedChange={(value) => onToggleStep(planStep.id, value)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 space-y-0.5">
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
            {!plan && (
              <p className="text-xs text-muted-foreground">Generate a plan in step 3 to see execution steps.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Plan impact</p>
            <p className="text-xs text-muted-foreground">
              Kit: <span className="font-medium text-foreground">{selectedSummary?.title ?? "Not selected"}</span>
            </p>
          </div>

          {selectedKit ? (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              {[
                { label: "Content types", stepId: "content-model" as SiteBuilderPlanStepId },
                { label: "Pages", stepId: "pages" as SiteBuilderPlanStepId },
                { label: "Forms", stepId: "forms" as SiteBuilderPlanStepId },
                { label: "Menus", stepId: "navigation" as SiteBuilderPlanStepId },
              ].map(({ label, stepId }) => {
                const count = countForStep(selectedKit, stepId);
                const skipped = hasStep(plan, stepId) && !enabledStepIds.includes(stepId);
                return (
                  <div key={stepId} className={cn("space-y-0.5", skipped && "opacity-50")}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold text-foreground">
                      {count}
                      {skipped ? <span className="ml-1 font-normal text-muted-foreground">(skipped)</span> : null}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Select a kit to preview changes.</p>
          )}

          {plan?.notes.length ? (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                {plan.notes.map((note) => (
                  <p key={note} className="text-xs text-muted-foreground">
                    {note}
                  </p>
                ))}
              </div>
            </>
          ) : null}

          {selectedKit ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Fits: {selectedKit.businessTypes.map(formatBusinessType).join(", ")}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold text-foreground">Action map</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every recommendation maps to explicit actions executed in order.
          </p>

          {guidedPlan && guidedPlan.actions.length > 0 ? (
            <div className="mt-3 space-y-2">
              {groupedActions(guidedPlan).map((group) => (
                <div key={group.stepId} className="rounded-md border">
                  <div className="rounded-t-md border-b bg-muted/30 px-3 py-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{group.stepId}</p>
                  </div>
                  <div className="divide-y">
                    {group.actions.map((action) => (
                      <div key={action.id} className="px-3 py-2">
                        <p className="text-xs font-medium text-foreground">{action.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {action.target} / {action.resourceKey}
                          {action.required ? <span className="ml-1 font-medium text-foreground">(required)</span> : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Generate a guided plan to inspect actions.</p>
          )}
        </div>

        {guidedPlan && (
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold text-foreground">Modules</p>
            <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
              The selected kit focuses the Coderso sidebar on these modules.
            </p>
            <div className="space-y-2">
              {guidedPlan.modules.required.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Required</span>
                  <div className="flex flex-wrap gap-1">
                    {guidedPlan.modules.required.map((moduleId) => (
                      <Badge key={`required:${moduleId}`} variant="default" className="text-[11px]">
                        {moduleId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {guidedPlan.modules.recommended.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Recommended</span>
                  <div className="flex flex-wrap gap-1">
                    {guidedPlan.modules.recommended.map((moduleId) => (
                      <Badge key={`recommended:${moduleId}`} variant="secondary" className="text-[11px]">
                        {moduleId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {guidedPlan.modules.optional.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Optional</span>
                  <div className="flex flex-wrap gap-1">
                    {guidedPlan.modules.optional.map((moduleId) => (
                      <Badge key={`optional:${moduleId}`} variant="outline" className="text-[11px]">
                        {moduleId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" onClick={() => onApply(false)} disabled={!selectedKitId || isExecuting}>
          <Play className="mr-2 h-4 w-4" />
          {isExecuting ? "Running..." : "Apply kit"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onApply(true)}
          disabled={!selectedKitId || isExecuting}
        >
          Dry run
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          onClick={onRerunLatest}
          disabled={!selectedKitId || isExecuting || !latestApplyRun}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Rerun
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRollbackLatest}
          disabled={!selectedKitId || isExecuting || !latestApplyRunId}
        >
          Rollback latest
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCloneLatest}
          disabled={!latestApplyRun}
        >
          <Copy className="mr-2 h-4 w-4" />
          Clone as draft
        </Button>
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Validation result</p>
        {validation ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {validation.status === "ok" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : validation.status === "warning" ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <Badge variant={statusBadgeVariant(validation.status)} className="capitalize">
                {validation.status}
              </Badge>
            </div>
            {validation.unresolvedItems.length > 0 ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 space-y-1">
                {validation.unresolvedItems.map((item) => (
                  <p key={item} className="text-xs text-destructive">
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No unresolved items.</p>
            )}
            {validation.checks.length > 0 && (
              <div className="space-y-1">
                {validation.checks.map((check) => (
                  <div key={check.id} className="flex items-start gap-2 rounded-md border bg-muted/20 px-2.5 py-2">
                    {check.status === "ok" ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{check.label}</p>
                      <p className="text-[11px] text-muted-foreground">{check.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Run apply or dry-run to get validation checks.</p>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Run history</p>
          <Button type="button" variant="ghost" size="sm" onClick={onRefreshRuns} disabled={runsLoading}>
            Refresh
          </Button>
        </div>

        {runsError ? <p className="text-xs text-destructive">{runsError}</p> : null}
        {runs.length === 0 && !runsLoading ? (
          <p className="text-xs text-muted-foreground">No runs yet. Apply or dry-run above to start.</p>
        ) : null}

        {runs.length > 0 ? (
          <div className="space-y-1.5">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRunId(run.id)}
                className={cn(
                  "w-full rounded-md border p-2.5 text-left transition",
                  selectedRunId === run.id
                    ? "border-primary/60 bg-primary/5"
                    : "hover:border-primary/30 hover:bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium capitalize text-foreground">
                    {run.mode.replace("_", " ")}
                  </p>
                  <Badge variant={runStatusBadgeVariant(run)}>{run.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatRunDate(run.finishedAt)}</p>
              </button>
            ))}
          </div>
        ) : null}

        {isDetailLoading ? <p className="mt-2 text-xs text-muted-foreground">Loading run details...</p> : null}
        {detailError ? <p className="mt-2 text-xs text-destructive">{detailError}</p> : null}

        {selectedRun ? (
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-md border bg-muted/20 p-3 text-center text-xs">
            {[
              { label: "Success", value: selectedRun.run.summary.success },
              { label: "Failed", value: selectedRun.run.summary.failed },
              { label: "Planned", value: selectedRun.run.summary.planned },
              { label: "Skipped", value: selectedRun.run.summary.skipped },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-lg font-semibold leading-tight text-foreground">{value}</p>
                <p className="text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
