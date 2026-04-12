import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

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
  "custom-screen.upsert": "Custom screen",
  "listing-query.upsert": "Listing query",
  "listing-template.upsert": "Listing template",
  "form.upsert": "Form",
  "entry.upsert-draft": "Draft entry",
  "menu.item.upsert": "Menu item",
  "seo.document.upsert": "SEO document",
  "media.reference.attach": "Media reference",
  "listing-query.filters.patch": "Listing filters",
  "listing-template.card.patch": "Listing card",
  "page.widget.patch": "Page widget",
  "form.automation.upsert": "Form automation",
  "page.upsert": "Page",
  "site-kit.recommend": "Site kit recommendation",
  "site-kit.install": "Site kit install",
  "site-kit.validate": "Site kit validation",
};

const resolveActionTypeLabel = (type: string) =>
  actionTypeLabels[type] ?? type.replaceAll(".", " ");

export function ActionExecutionResult({ result }: ActionExecutionResultProps) {
  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Executed</Badge>
          <Badge variant="outline">Create {result.summary.create}</Badge>
          <Badge variant="outline">Update {result.summary.update}</Badge>
          <Badge variant="outline">No-op {result.summary.noop}</Badge>
          {result.summary.failed > 0 ? (
            <Badge variant="destructive">Failed {result.summary.failed}</Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">Setup results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
