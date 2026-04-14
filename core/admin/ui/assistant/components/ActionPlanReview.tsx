import { Loader2, Play, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AssistantActionDryRunResponse,
  AssistantActionPlanResponse,
} from "@/services/assistantClient";

type ActionPlanReviewProps = {
  plan: AssistantActionPlanResponse;
  preview: AssistantActionDryRunResponse | null;
  isPreviewing?: boolean;
  isExecuting?: boolean;
  error?: string | null;
  onPreview: () => void;
  onExecute: () => void;
};

const labelByOperation = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  noop: "No change",
} as const;

const actionTypeLabels: Record<string, string> = {
  "setting.content-route.upsert": "Content route",
  "content-type.upsert": "Content model",
  "content-type.delete": "Content model",
  "custom-screen.upsert": "Custom screen",
  "custom-screen.delete": "Custom screen",
  "listing-query.upsert": "Listing query",
  "listing-query.delete": "Listing query",
  "listing-template.upsert": "Listing template",
  "listing-template.delete": "Listing template",
  "form.upsert": "Form",
  "form.delete": "Form",
  "form.archive": "Form",
  "entry.upsert-draft": "Draft entry",
  "entry.delete": "Entry",
  "menu.item.upsert": "Menu item",
  "menu.item.delete": "Menu item",
  "seo.document.upsert": "SEO document",
  "seo.document.delete": "SEO document",
  "media.reference.attach": "Media reference",
  "listing-query.filters.patch": "Listing filters",
  "listing-template.card.patch": "Listing card",
  "page.widget.patch": "Page widget",
  "form.automation.upsert": "Form automation",
  "page.upsert": "Page",
  "page.update": "Page",
  "page.delete": "Page",
  "widget-template.delete": "Widget template",
  "widget-template.update": "Widget template",
  "widget-template.block.patch": "Widget template block",
  "site-kit.recommend": "Site kit recommendation",
  "site-kit.install": "Site kit install",
  "site-kit.validate": "Site kit validation",
};

const resolveActionTypeLabel = (type: string) =>
  actionTypeLabels[type] ?? type.replaceAll(".", " ");

const resolvePlannerLabel = (metadata: AssistantActionPlanResponse["metadata"]) => {
  if (metadata?.providerDraftUsed) return "Provider draft";
  if (metadata?.planner === "fallback") return "Planner fallback";
  return "Local planner";
};

export function ActionPlanReview({
  plan,
  preview,
  isPreviewing = false,
  isExecuting = false,
  error = null,
  onPreview,
  onExecute,
}: ActionPlanReviewProps) {
  const previewReady = Boolean(preview?.readyToExecute);

  return (
    <Card className="border-emerald-200/80 bg-emerald-50/40">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            LLM Guide Plan
          </Badge>
          <Badge variant={plan.status === "ready" ? "default" : "outline"}>
            {plan.status === "ready" ? "Ready" : "Needs input"}
          </Badge>
          <Badge variant="outline">Confidence {Math.round(plan.confidence * 100)}%</Badge>
          <Badge variant="outline">{resolvePlannerLabel(plan.metadata)}</Badge>
        </div>
        <div>
          <CardTitle className="text-base">{plan.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {plan.assumptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assumptions
            </p>
            <ul className="ml-5 list-disc space-y-1 text-sm text-foreground">
              {plan.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {plan.questions.length > 0 ? (
          <Alert>
            <AlertTitle>More input needed</AlertTitle>
            <AlertDescription>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                {plan.questions.map((question) => (
                  <li key={question.id}>
                    <span className="font-medium">{question.label}</span>
                    <span className="text-muted-foreground"> {question.description}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Planned actions
          </p>
          <div className="space-y-2">
            {plan.actions.map((action) => {
              const previewChange = preview?.changes.find(
                (change) => change.actionId === action.id
              );
              return (
                <div
                  key={action.id}
                  className="rounded-xl border bg-background px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{action.title}</span>
                    <Badge variant="secondary">{resolveActionTypeLabel(action.type)}</Badge>
                    {previewChange ? (
                      <Badge variant="outline">
                        {labelByOperation[previewChange.operation]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted-foreground">{action.description}</p>
                  {previewChange ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Target: {previewChange.targetType} / {previewChange.targetKey}
                    </p>
                  ) : null}
                  {previewChange?.warnings.length ? (
                    <ul className="ml-5 mt-2 list-disc space-y-1 text-xs text-muted-foreground">
                      {previewChange.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                  {previewChange?.conflicts?.length ? (
                    <div className="mt-2 space-y-1 text-xs">
                      {previewChange.conflicts.map((conflict) => (
                        <p
                          key={`${conflict.code}-${conflict.message}`}
                          className={
                            conflict.severity === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          Conflict: {conflict.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {previewChange?.dependencies?.length ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Depends on:{" "}
                      {previewChange.dependencies
                        .map((dependency) => `${dependency.targetType}/${dependency.targetKey}`)
                        .join(", ")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Guide action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onPreview}
            disabled={isPreviewing || isExecuting || plan.questions.length > 0}
          >
            {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Dry-run changes
          </Button>
          <Button
            type="button"
            onClick={onExecute}
            disabled={!previewReady || isExecuting || isPreviewing}
          >
            {isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Execute setup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
