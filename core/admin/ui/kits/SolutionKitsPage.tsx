import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  getSolutionKitCached,
  previewSolutionKitPlan,
  type SiteBuilderBusinessType,
  type SiteBuilderGoal,
  type SiteBuilderPlanOutput,
  type SolutionKitDefinition,
  type SolutionKitId,
} from "@/services/solutionKitsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { SolutionKitCard } from "./SolutionKitCard";
import { useSolutionKits } from "./hooks/useSolutionKits";

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
    description: "Present offers, services, or products as structured listings.",
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

const defaultGoals: SiteBuilderGoal[] = ["lead_generation", "online_booking"];

const formatBusinessType = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const normalizeLocale = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "en";
};

export function SolutionKitsPage() {
  const { items, isLoading, error } = useSolutionKits();

  const [selectedId, setSelectedId] = useState<SolutionKitId | null>(null);
  const [selectedKit, setSelectedKit] = useState<SolutionKitDefinition | null>(null);
  const [businessType, setBusinessType] = useState<SiteBuilderBusinessType>(
    "automotive_workshop"
  );
  const [locale, setLocale] = useState("en");
  const [siteName, setSiteName] = useState("");
  const [goals, setGoals] = useState<SiteBuilderGoal[]>(defaultGoals);
  const [plan, setPlan] = useState<SiteBuilderPlanOutput | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    if (selectedId || items.length === 0) return;
    setSelectedId(items[0]?.id ?? null);
  }, [items, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getSolutionKitCached(selectedId)
      .then((detail) => {
        if (active) setSelectedKit(detail);
      })
      .catch(() => {
        if (active) setSelectedKit(null);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const toggleGoal = (goal: SiteBuilderGoal, checked: boolean | string) => {
    setGoals((prev) => {
      if (checked && !prev.includes(goal)) return [...prev, goal];
      if (!checked) return prev.filter((item) => item !== goal);
      return prev;
    });
  };

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const nextPlan = await previewSolutionKitPlan({
        businessType,
        goals: goals.length > 0 ? goals : defaultGoals,
        locale: normalizeLocale(locale),
        siteName: siteName.trim().length > 0 ? siteName.trim() : null,
        preferredKitId: selectedId,
      });
      setPlan(nextPlan);
    } catch (error) {
      if (error instanceof Error) {
        setPlanError(error.message);
      } else {
        setPlanError("Failed to generate solution plan.");
      }
    } finally {
      setPlanLoading(false);
    }
  };

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
                  isActive={kit.id === selectedId}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  AI plan preview
                </CardTitle>
                <CardDescription>
                  Select business profile and goals to generate a transparent setup plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Business type</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={businessType}
                    onChange={(event) =>
                      setBusinessType(event.target.value as SiteBuilderBusinessType)
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
                  <span className="font-medium text-foreground">Site name (optional)</span>
                  <Input
                    value={siteName}
                    onChange={(event) => setSiteName(event.target.value)}
                    placeholder="e.g. AutoFix Warsaw"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Locale</span>
                  <Input value={locale} onChange={(event) => setLocale(event.target.value)} placeholder="en" />
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Goals</p>
                  <div className="space-y-2">
                    {goalOptions.map((goal) => (
                      <label key={goal.value} className="flex items-start gap-2 rounded-md border p-2">
                        <Checkbox
                          checked={goals.includes(goal.value)}
                          onCheckedChange={(checked) => toggleGoal(goal.value, checked)}
                        />
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium text-foreground">{goal.label}</span>
                          <span className="block text-xs text-muted-foreground">{goal.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={handleGeneratePlan} disabled={planLoading}>
                  {planLoading ? "Generating..." : "Generate plan"}
                </Button>
              </CardContent>
            </Card>

            {selectedSummary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selected kit</CardTitle>
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

            {planError ? (
              <Alert variant="destructive">
                <AlertTitle>Plan generation failed</AlertTitle>
                <AlertDescription>{planError}</AlertDescription>
              </Alert>
            ) : null}

            {plan ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Planner output</CardTitle>
                  <CardDescription>
                    Recommended kit: <strong>{plan.recommendedKitId}</strong> (confidence {plan.confidence}%)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    {plan.steps.map((step) => (
                      <div key={step.id} className="rounded-md border p-2">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
