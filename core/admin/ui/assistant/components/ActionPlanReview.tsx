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

const secretLikeTextPattern =
  /(token|secret|password|api[-_]?key|credential|cookie|csrf|authorization|bearer)/i;

const redactUiText = (value: string) =>
  secretLikeTextPattern.test(value) ? "[redacted]" : value;

const destructiveActionTypes = new Set([
  "content-type.delete",
  "custom-screen.delete",
  "listing-query.delete",
  "listing-template.delete",
  "form.delete",
  "form.archive",
  "entry.delete",
  "menu.item.delete",
  "seo.document.delete",
  "page.delete",
  "widget-template.delete",
]);

const actionTypeLabels: Record<string, string> = {
  "setting.content-route.upsert": "Content route",
  "content-type.upsert": "Content model",
  "content-type.delete": "Content model",
  "custom-screen.upsert": "Custom screen",
  "custom-screen.delete": "Custom screen",
  "custom-screen.update": "Custom screen",
  "custom-screen.widget.patch": "Custom screen widget",
  "listing-query.upsert": "Listing query",
  "listing-query.delete": "Listing query",
  "listing-query.update": "Listing query",
  "listing-template.upsert": "Listing template",
  "listing-template.delete": "Listing template",
  "listing-template.update": "Listing template",
  "form.upsert": "Form",
  "form.delete": "Form",
  "form.archive": "Form",
  "form.update": "Form",
  "entry.upsert-draft": "Draft entry",
  "entry.delete": "Entry",
  "entry.update": "Entry",
  "menu.item.upsert": "Menu item",
  "menu.item.delete": "Menu item",
  "menu.item.update": "Menu item",
  "seo.document.upsert": "SEO document",
  "seo.document.delete": "SEO document",
  "seo.document.update": "SEO document",
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

const resolveOperationLabel = (
  actionType: string,
  previewChange: AssistantActionDryRunResponse["changes"][number] | undefined
) => {
  if (previewChange?.conflicts?.some((conflict) => conflict.severity === "error")) {
    return "Blocked";
  }
  if (actionType.endsWith(".archive")) return "Archive";
  if (actionType.includes(".delete")) return "Delete";
  if (actionType.includes(".detach")) return "Detach";
  if (actionType.includes(".restore")) return "Restore";
  if (previewChange) return labelByOperation[previewChange.operation];
  if (actionType.includes(".update") || actionType.includes(".patch")) return "Update";
  if (actionType.includes(".upsert") || actionType.includes(".install")) return "Create/update";
  return "Review";
};

const isDestructiveAction = (
  actionType: string,
  previewChange: AssistantActionDryRunResponse["changes"][number] | undefined
) =>
  destructiveActionTypes.has(actionType) ||
  previewChange?.operation === "delete" ||
  actionType.includes(".detach");

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
  const destructive = plan.actions.some((action) =>
    isDestructiveAction(
      action.type,
      preview?.changes.find((change) => change.actionId === action.id)
    )
  );
  const blocked = preview?.changes.some((change) =>
    change.conflicts?.some((conflict) => conflict.severity === "error")
  );

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
          <CardTitle className="text-base">{redactUiText(plan.title)}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{redactUiText(plan.summary)}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {destructive ? (
          <Alert variant="destructive">
            <AlertTitle>Destructive operation requires review</AlertTitle>
            <AlertDescription>
              Preview the impact before executing. Delete, archive, and detach operations
              can remove or hide resources from public/admin workflows.
            </AlertDescription>
          </Alert>
        ) : null}

        {blocked ? (
          <Alert variant="destructive">
            <AlertTitle>Action blocked</AlertTitle>
            <AlertDescription>
              Resolve blocking conflicts before executing this plan.
            </AlertDescription>
          </Alert>
        ) : null}

        {preview?.warnings.length ? (
          <Alert>
            <AlertTitle>Preview warnings</AlertTitle>
            <AlertDescription>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{redactUiText(warning)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {plan.assumptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assumptions
            </p>
            <ul className="ml-5 list-disc space-y-1 text-sm text-foreground">
              {plan.assumptions.map((item) => (
                <li key={item}>{redactUiText(item)}</li>
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
                    <span className="font-medium">{redactUiText(question.label)}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      {redactUiText(question.description)}
                    </span>
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
                    <span className="font-medium">{redactUiText(action.title)}</span>
                    <Badge variant="secondary">{resolveActionTypeLabel(action.type)}</Badge>
                    <Badge
                      variant={
                        resolveOperationLabel(action.type, previewChange) === "Blocked" ||
                        isDestructiveAction(action.type, previewChange)
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {resolveOperationLabel(action.type, previewChange)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {redactUiText(action.description)}
                  </p>
                  {previewChange ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Target: {redactUiText(previewChange.targetType)} /{" "}
                      {redactUiText(previewChange.targetKey)}
                    </p>
                  ) : null}
                  {previewChange?.warnings.length ? (
                    <ul className="ml-5 mt-2 list-disc space-y-1 text-xs text-muted-foreground">
                      {previewChange.warnings.map((warning) => (
                        <li key={warning}>{redactUiText(warning)}</li>
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
                          Conflict: {redactUiText(conflict.message)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {previewChange?.dependencies?.length ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Depends on:{" "}
                      {previewChange.dependencies
                        .map((dependency) =>
                          redactUiText(`${dependency.targetType}/${dependency.targetKey}`)
                        )
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
            <AlertDescription>{redactUiText(error)}</AlertDescription>
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
            Execute reviewed actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
