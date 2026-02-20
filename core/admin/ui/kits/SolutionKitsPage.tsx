import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSolutionKitCached,
  type SolutionKitDefinition,
  type SolutionKitId,
} from "@/services/solutionKitsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { AiSiteWizard } from "@/ui/setup/AiSiteWizard";

import { SolutionKitCard } from "./SolutionKitCard";
import { useSolutionKits } from "./hooks/useSolutionKits";

const formatBusinessType = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

export function SolutionKitsPage() {
  const { items, isLoading, error } = useSolutionKits();

  const [selectedId, setSelectedId] = useState<SolutionKitId | null>(null);
  const [selectedKit, setSelectedKit] = useState<SolutionKitDefinition | null>(null);
  const effectiveSelectedId = selectedId ?? items[0]?.id ?? null;

  useEffect(() => {
    if (!effectiveSelectedId) return;
    let active = true;
    getSolutionKitCached(effectiveSelectedId)
      .then((detail) => {
        if (active) setSelectedKit(detail);
      })
      .catch(() => {
        if (active) setSelectedKit(null);
      });
    return () => {
      active = false;
    };
  }, [effectiveSelectedId]);

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, items]
  );

  return (
    <AdminShell
      activeHref="/admin/coderso/solution-kits"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Solution Kits</span>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Solution Kits"
          description="Launch a structured website baseline with guided kit recommendations."
          actions={
            <Badge variant="outline" className="h-8 px-3 text-xs font-semibold uppercase">
              Beta
            </Badge>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load kits</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(24rem,1fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((kit) => (
                <SolutionKitCard
                  key={kit.id}
                  kit={kit}
                  isActive={kit.id === effectiveSelectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>

            {isLoading && items.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  Loading solution kits...
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            <AiSiteWizard
              kits={items}
              selectedKitId={effectiveSelectedId}
              selectedKit={selectedKit}
              onSelectKit={setSelectedId}
            />

            {selectedSummary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selected kit details</CardTitle>
                  <CardDescription>{selectedSummary.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{selectedKit?.longDescription ?? selectedSummary.shortDescription}</p>
                  {selectedKit ? (
                    <>
                      <p>
                        <span className="font-medium text-foreground">Business fit:</span>{" "}
                        {selectedKit.businessTypes.map(formatBusinessType).join(", ")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Starter resources:</span>{" "}
                        {selectedKit.resourceBlueprint.pages.length} pages, {" "}
                        {selectedKit.resourceBlueprint.forms.length} forms, {" "}
                        {selectedKit.resourceBlueprint.contentTypes.length} content types.
                      </p>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
