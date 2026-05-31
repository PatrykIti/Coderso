import { Route, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { RouteFieldErrors, SiteContentRouteForm } from "./siteSettingsValidation";

type SiteRouteEditorProps = {
  name: string;
  slug: string;
  route: SiteContentRouteForm;
  suggested: { listPath: string; detailPath: string };
  errors?: RouteFieldErrors;
  disabled?: boolean;
  missing?: boolean;
  onChange: (next: SiteContentRouteForm) => void;
  onUseSuggested: () => void;
};

const labelClassName = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function SiteRouteEditor({
  name,
  slug,
  route,
  suggested,
  errors,
  disabled = false,
  missing = false,
  onChange,
  onUseSuggested,
}: SiteRouteEditorProps) {
  return (
    <Card className={cn("border-border/60", missing && "border-dashed")}>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {name}
                <Badge variant="secondary">{slug}</Badge>
                {missing ? <Badge variant="outline">Missing type</Badge> : null}
              </CardTitle>
              <CardDescription>
                Map the list and detail routes for this content type.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {route.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={route.enabled}
              onCheckedChange={(checked) => onChange({ ...route, enabled: checked })}
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor={`list-${slug}`}>
              List path
            </label>
            <Input
              id={`list-${slug}`}
              value={route.listPath}
              placeholder={suggested.listPath}
              onChange={(event) => onChange({ ...route, listPath: event.target.value })}
              disabled={disabled || !route.enabled}
              aria-invalid={errors?.listPath ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Static URL for the collection list (e.g. {suggested.listPath}).
            </p>
            {errors?.listPath ? (
              <p className="text-xs text-destructive">{errors.listPath}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor={`detail-${slug}`}>
              Detail path
            </label>
            <Input
              id={`detail-${slug}`}
              value={route.detailPath}
              placeholder={suggested.detailPath}
              onChange={(event) => onChange({ ...route, detailPath: event.target.value })}
              disabled={disabled || !route.enabled}
              aria-invalid={errors?.detailPath ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Must include :slug or :id (e.g. {suggested.detailPath}).
            </p>
            {errors?.detailPath ? (
              <p className="text-xs text-destructive">{errors.detailPath}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelClassName} htmlFor={`detail-page-id-${slug}`}>
            Detail page ID
          </label>
          <Input
            id={`detail-page-id-${slug}`}
            value={route.detailPageId ?? ""}
            placeholder="Optional UUID for a composed detail page document"
            onChange={(event) =>
              onChange({
                ...route,
                detailPageId: event.target.value.trim().length > 0 ? event.target.value : null,
              })
            }
            disabled={disabled || !route.enabled}
            aria-invalid={errors?.detailPageId ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the legacy content-detail renderer for this route.
          </p>
          {errors?.detailPageId ? (
            <p className="text-xs text-destructive">{errors.detailPageId}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5" />
            <span>
              Suggested: {suggested.listPath} · {suggested.detailPath}
            </span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="gap-1"
            onClick={onUseSuggested}
            disabled={disabled}
          >
            Use suggested
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
