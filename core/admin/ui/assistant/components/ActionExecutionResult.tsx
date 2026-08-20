import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssistantActionExecuteResponse } from "@/services/assistantClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import { LaunchReadinessSummary } from "./LaunchReadinessSummary";

type ActionExecutionResultProps = {
  result: AssistantActionExecuteResponse;
};

const actionTypeLabels: Record<string, string> = {
  "setting.content-route.upsert": "Content route",
  "content-type.upsert": "Content model",
  "content-type.field.add": "Content model",
  "content-type.delete": "Content model",
  "custom-screen.upsert": "Custom screen",
  "custom-screen.delete": "Custom screen",
  "custom-screen.update": "Custom screen",
  "custom-screen.section.add": "Custom screen section",
  "custom-screen.block.add": "Custom screen block",
  "custom-screen.block.patch": "Custom screen block",
  "custom-screen.block.move": "Custom screen block",
  "custom-screen.block.remove": "Custom screen block",
  "custom-screen.binding.set": "Custom screen binding",
  "custom-screen.list-view.patch": "Custom screen list",
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
  "form.automation.upsert": "Form automation",
  "page.upsert": "Page",
  "detail-page.upsert": "Detail Template",
  "page.update": "Page",
  "page.delete": "Page",
  "site-kit.recommend": "Site kit recommendation",
  "site-kit.install": "Site kit install",
  "site-kit.validate": "Site kit validation",
};

const resolveActionTypeLabel = (type: string) =>
  actionTypeLabels[type] ?? type.replaceAll(".", " ");

const secretLikeTextPattern =
  /(token|secret|password|api[-_]?key|credential|cookie|csrf|authorization|bearer)/i;

const redactUiText = (value: string) => (secretLikeTextPattern.test(value) ? "[redacted]" : value);

const resolveResultOperation = (item: AssistantActionExecuteResponse["results"][number]) => {
  if (item.type.endsWith(".archive")) return "archive";
  if (item.type.includes(".delete")) return "delete";
  if (item.type.includes(".detach")) return "detach";
  if (item.type.includes(".restore")) return "restore";
  return item.operation;
};

const failureItems = (result: AssistantActionExecuteResponse) =>
  result.results.filter((item) => item.status === "failed");

const successCount = (result: AssistantActionExecuteResponse) =>
  result.results.filter((item) => item.status === "success").length;

const countSuccessfulOperation = (
  result: AssistantActionExecuteResponse,
  operation: ReturnType<typeof resolveResultOperation>
) =>
  result.results.filter(
    (item) => item.status === "success" && resolveResultOperation(item) === operation
  ).length;

export function ActionExecutionResult({ result }: ActionExecutionResultProps) {
  const failed = failureItems(result);
  const hasFailures = failed.length > 0;
  const createCount = countSuccessfulOperation(result, "create");
  const updateCount = countSuccessfulOperation(result, "update");
  const deleteCount = countSuccessfulOperation(result, "delete");
  const archiveCount = countSuccessfulOperation(result, "archive");
  const detachCount = countSuccessfulOperation(result, "detach");
  const restoreCount = countSuccessfulOperation(result, "restore");
  const noopCount = countSuccessfulOperation(result, "noop");

  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Executed</Badge>
          <Badge variant="outline">Create {createCount}</Badge>
          <Badge variant="outline">Update {updateCount}</Badge>
          {deleteCount > 0 ? <Badge variant="outline">Delete {deleteCount}</Badge> : null}
          {archiveCount > 0 ? <Badge variant="outline">Archive {archiveCount}</Badge> : null}
          {detachCount > 0 ? <Badge variant="outline">Detach {detachCount}</Badge> : null}
          {restoreCount > 0 ? <Badge variant="outline">Restore {restoreCount}</Badge> : null}
          <Badge variant="outline">No-op {noopCount}</Badge>
          {result.summary.failed > 0 ? (
            <Badge variant="destructive">Failed {result.summary.failed}</Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">Action results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasFailures ? (
          <Alert variant="destructive">
            <AlertTitle>Some actions need attention</AlertTitle>
            <AlertDescription>
              <p>
                {successCount(result)} action(s) succeeded and {failed.length} action(s) failed.
                Review the failed steps, run a fresh dry-run, then execute again with a new
                confirmation.
              </p>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                {failed.map((item) => (
                  <li key={item.actionId}>
                    <span className="font-medium">{resolveActionTypeLabel(item.type)}</span>
                    {item.errorCode ? <span>{` (${item.errorCode})`}</span> : null}
                    <span>{`: ${redactUiText(item.message)}`}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <LaunchReadinessSummary readiness={result.plan.metadata?.launchReadiness} />

        {result.results.map((item) => (
          <div key={item.actionId} className="rounded-xl border bg-background px-3 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.status === "success" ? "secondary" : "destructive"}>
                {item.status === "success" ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Failed
                  </span>
                )}
              </Badge>
              <Badge variant="secondary">{resolveActionTypeLabel(item.type)}</Badge>
              <Badge variant="outline">{resolveResultOperation(item)}</Badge>
              <span className="font-medium">{redactUiText(item.targetKey)}</span>
            </div>
            <p className="mt-2 text-muted-foreground">{redactUiText(item.message)}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {item.adminHref ? (
                <AdminLink href={item.adminHref} className="inline-flex items-center gap-1">
                  Open in admin
                  <ExternalLink className="h-3.5 w-3.5" />
                </AdminLink>
              ) : null}
              {item.publicHref ? (
                <a
                  href={item.publicHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  Open public page
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
