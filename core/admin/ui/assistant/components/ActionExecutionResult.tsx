import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssistantActionExecuteResponse } from "@/services/assistantClient";
import { AdminLink } from "@/ui/shared/AdminLink";

type ActionExecutionResultProps = {
  result: AssistantActionExecuteResponse;
};

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

const failureItems = (result: AssistantActionExecuteResponse) =>
  result.results.filter((item) => item.status === "failed");

const successCount = (result: AssistantActionExecuteResponse) =>
  result.results.filter((item) => item.status === "success").length;

export function ActionExecutionResult({ result }: ActionExecutionResultProps) {
  const failed = failureItems(result);
  const hasFailures = failed.length > 0;

  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Executed</Badge>
          <Badge variant="outline">Create {result.summary.create}</Badge>
          <Badge variant="outline">Update {result.summary.update}</Badge>
          {(result.summary.delete ?? 0) > 0 ? (
            <Badge variant="outline">Delete {result.summary.delete}</Badge>
          ) : null}
          <Badge variant="outline">No-op {result.summary.noop}</Badge>
          {result.summary.failed > 0 ? (
            <Badge variant="destructive">Failed {result.summary.failed}</Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">Setup results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasFailures ? (
          <Alert variant="destructive">
            <AlertTitle>Some actions need attention</AlertTitle>
            <AlertDescription>
              <p>
                {successCount(result)} action(s) succeeded and {failed.length} action(s)
                failed. Review the failed steps, run a fresh dry-run, then execute again
                with a new confirmation.
              </p>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                {failed.map((item) => (
                  <li key={item.actionId}>
                    <span className="font-medium">{resolveActionTypeLabel(item.type)}</span>
                    {item.errorCode ? <span>{` (${item.errorCode})`}</span> : null}
                    <span>{`: ${item.message}`}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {result.results.map((item) => (
          <div
            key={item.actionId}
            className="rounded-xl border bg-background px-3 py-3 text-sm"
          >
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
              <Badge variant="outline">{item.operation}</Badge>
              <span className="font-medium">{item.targetKey}</span>
            </div>
            <p className="mt-2 text-muted-foreground">{item.message}</p>
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
