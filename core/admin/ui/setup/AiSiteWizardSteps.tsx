import { Copy, Play, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
    <div className="grid gap-2 md:grid-cols-5">
      {AI_SITE_WIZARD_STEPS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => {
            if (entry.id <= step) onSelectStep(entry.id);
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Business type</span>
          <select
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
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Locale</span>
          <Input
            value={draft.locale}
            onChange={(event) =>
              onDraftChange((previous) => ({
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
              onDraftChange((previous) => ({
                ...previous,
                siteName: event.target.value,
              }))
            }
            placeholder="e.g. AutoFix Warsaw"
          />
        </label>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Business goals</p>
        <div className="space-y-2">
          {goalOptions.map((goal) => (
            <label key={goal.value} className="flex items-start gap-2 rounded-md border p-2">
              <Checkbox
                checked={draft.goals.includes(goal.value)}
                onCheckedChange={(checked) => onToggleGoal(goal.value, checked)}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">{goal.label}</span>
                <span className="block text-xs text-muted-foreground">{goal.description}</span>
              </span>
            </label>
          ))}
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
            {isPlanLoading ? "Refreshing..." : "Refresh recommendation"}
          </Button>
          {plan ? <Badge variant="secondary">Confidence {plan.confidence}%</Badge> : null}
        </div>

        {plan ? (
          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-foreground">Recommended kit</p>
              <p className="text-sm text-muted-foreground">
                {kits.find((item) => item.id === plan.recommendedKitId)?.title ?? plan.recommendedKitId}
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
                      {kits.find((item) => item.id === recommendation.kitId)?.title ?? recommendation.kitId}
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
          <p className="text-sm text-muted-foreground">Generate a plan to see recommendation details.</p>
        )}
      </div>
    );
  }

  if (step === 4) {
    return (
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
                    onCheckedChange={(value) => onToggleStep(planStep.id, value)}
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
          <p className="text-sm font-medium text-foreground">Action map (explainable)</p>
          <p className="text-xs text-muted-foreground">
            Every recommendation maps to explicit actions before execution.
          </p>

          {guidedPlan && guidedPlan.actions.length > 0 ? (
            <div className="mt-3 space-y-2">
              {groupedActions(guidedPlan).map((group) => (
                <div key={group.stepId} className="rounded-md border p-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{group.stepId}</p>
                  <div className="mt-2 space-y-1">
                    {group.actions.map((action) => (
                      <div key={action.id} className="rounded-md border bg-muted/20 px-2 py-1.5">
                        <p className="text-xs font-medium text-foreground">{action.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {action.target} / {action.resourceKey}
                          {action.required ? " (required)" : ""}
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

        <div className="rounded-md border p-3">
          <p className="text-sm font-medium text-foreground">Plan impact preview</p>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
            <p>
              Kit: <span className="font-medium text-foreground">{selectedSummary?.title ?? "Not selected"}</span>
            </p>
            {selectedKit ? (
              <>
                <p>Business fit: {selectedKit.businessTypes.map(formatBusinessType).join(", ")}</p>
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

        <div className="rounded-md border p-3">
          <p className="text-sm font-medium text-foreground">Modules</p>
          {guidedPlan ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {guidedPlan.modules.required.map((moduleId) => (
                  <Badge key={`required:${moduleId}`} variant="default" className="text-[11px]">
                    Required: {moduleId}
                  </Badge>
                ))}
                {guidedPlan.modules.recommended.map((moduleId) => (
                  <Badge key={`recommended:${moduleId}`} variant="secondary" className="text-[11px]">
                    Recommended: {moduleId}
                  </Badge>
                ))}
                {guidedPlan.modules.optional.map((moduleId) => (
                  <Badge key={`optional:${moduleId}`} variant="outline" className="text-[11px]">
                    Optional: {moduleId}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Module recommendations appear after plan generation.</p>
          )}
        </div>
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
        <Button type="button" variant="secondary" onClick={() => onApply(true)} disabled={!selectedKitId || isExecuting}>
          Dry run
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" onClick={onRerunLatest} disabled={!selectedKitId || isExecuting || !latestApplyRun}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Rerun
        </Button>
        <Button type="button" variant="outline" onClick={onRollbackLatest} disabled={!selectedKitId || isExecuting || !latestApplyRunId}>
          Rollback latest
        </Button>
        <Button type="button" variant="outline" onClick={onCloneLatest} disabled={!latestApplyRun}>
          <Copy className="mr-2 h-4 w-4" />
          Clone as draft
        </Button>
      </div>

      <div className="rounded-md border p-3">
        <p className="text-sm font-medium text-foreground">Validation result</p>
        {validation ? (
          <div className="mt-2 space-y-2">
            <Badge variant={statusBadgeVariant(validation.status)}>{validation.status}</Badge>
            {validation.unresolvedItems.length > 0 ? (
              <div className="space-y-1">
                {validation.unresolvedItems.map((item) => (
                  <p key={item} className="text-xs text-destructive">
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No unresolved items.</p>
            )}
            <div className="space-y-1">
              {validation.checks.map((check) => (
                <div key={check.id} className="rounded-md border bg-muted/20 px-2 py-1.5">
                  <p className="text-xs font-medium text-foreground">{check.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {check.status}: {check.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Run apply or dry-run to get validation checks.</p>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Run timeline</p>
          <Button type="button" variant="ghost" size="sm" onClick={onRefreshRuns} disabled={runsLoading}>
            Refresh
          </Button>
        </div>

        {runsError ? <p className="text-xs text-destructive">{runsError}</p> : null}

        {runs.length === 0 && !runsLoading ? <p className="text-xs text-muted-foreground">No runs yet.</p> : null}

        {runs.length > 0 ? (
          <div className="space-y-2">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRunId(run.id)}
                className={`w-full rounded-md border p-2 text-left transition ${
                  selectedRunId === run.id ? "border-primary/60 bg-primary/5" : "hover:border-primary/30"
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

        {isDetailLoading ? <p className="text-xs text-muted-foreground">Loading run details...</p> : null}
        {detailError ? <p className="text-xs text-destructive">{detailError}</p> : null}

        {selectedRun ? (
          <div className="rounded-md border p-2">
            <p className="text-xs font-medium text-foreground">Run summary ({selectedRun.run.mode})</p>
            <p className="text-xs text-muted-foreground">
              success: {selectedRun.run.summary.success}, failed: {selectedRun.run.summary.failed}, planned: {selectedRun.run.summary.planned}, skipped: {selectedRun.run.summary.skipped}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
