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

const formatIncludeLabel = (value: string) =>
  value
    .split(/[\s_-]+/)
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

  const manifest = selectedKit?.manifest ?? selectedSummary?.manifest ?? null;

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
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{selectedKit?.longDescription ?? selectedSummary.shortDescription}</p>
                  {selectedKit ? (
                    <p>
                      <span className="font-medium text-foreground">Business fit:</span>{" "}
                      {selectedKit.businessTypes.map(formatBusinessType).join(", ")}
                    </p>
                  ) : null}

                  {manifest ? (
                    <>
                      <p>
                        <span className="font-medium text-foreground">Manifest vertical:</span>{" "}
                        {formatIncludeLabel(manifest.vertical)}
                      </p>

                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Includes</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(manifest.includes).map(([key, values]) => (
                            <Badge key={key} variant="outline" className="text-[11px]">
                              {formatIncludeLabel(key)}: {Array.isArray(values) ? values.length : 0}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {manifest.requiredModules.length > 0 ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Required modules</p>
                          <div className="flex flex-wrap gap-2">
                            {manifest.requiredModules.map((moduleId) => (
                              <Badge key={moduleId} variant="secondary" className="text-[11px]">
                                {moduleId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {(manifest.postInstallTasks?.length ?? 0) > 0 ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Post-install checklist</p>
                          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                            {manifest.postInstallTasks?.map((task) => (
                              <li key={task}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Manifest details will appear after refreshing this kit.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
