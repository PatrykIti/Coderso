import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  SETUP_WIZARD_DEFAULT_VALUES,
  type SetupWizardValues,
  validateSetupWizardStep,
} from "./setupWizardValidation";

type SetupWizardProps = {
  initialValues?: Partial<SetupWizardValues>;
  onSubmit: (values: SetupWizardValues) => Promise<void> | void;
  isSaving?: boolean;
  error?: string | null;
};

const steps = [
  { id: 1 as const, title: "Site Identity", description: "Name and locale defaults." },
  { id: 2 as const, title: "Runtime URL", description: "Public URL used for absolute links." },
  { id: 3 as const, title: "Security TTL", description: "Session and reset token TTL policy." },
];

const resolveInitialValues = (
  values: Partial<SetupWizardValues> | undefined
): SetupWizardValues => ({
  ...SETUP_WIZARD_DEFAULT_VALUES,
  ...values,
});

const localeOptions = ["en", "en-US", "en-GB", "pl-PL", "de-DE", "fr-FR"];

export function SetupWizard({
  initialValues,
  onSubmit,
  isSaving = false,
  error = null,
}: SetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<SetupWizardValues>(() =>
    resolveInitialValues(initialValues)
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(resolveInitialValues(initialValues));
  }, [initialValues]);

  const stepError = useMemo(() => validateSetupWizardStep(form, step), [form, step]);
  const visibleError = localError ?? stepError ?? error;

  const handleNext = () => {
    const validationError = validateSetupWizardStep(form, step);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    setStep((current) => (current < 3 ? ((current + 1) as 1 | 2 | 3) : current));
  };

  const handleBack = () => {
    setLocalError(null);
    setStep((current) => (current > 1 ? ((current - 1) as 1 | 2 | 3) : current));
  };

  const handleComplete = async () => {
    const validationError = validateSetupWizardStep(form, 3) ?? validateSetupWizardStep(form, 2) ?? validateSetupWizardStep(form, 1);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    await onSubmit(form);
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="rounded-xl border border-border/70 bg-background/90 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">First-run setup</h1>
              <p className="text-sm text-muted-foreground">
                Configure required runtime settings before using the admin panel.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {steps.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-md border px-3 py-2 text-xs ${
                  step === entry.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground"
                }`}
              >
                <p className="font-semibold">{entry.title}</p>
                <p className="mt-1">{entry.description}</p>
              </div>
            ))}
          </div>
        </div>

        {visibleError ? (
          <Alert variant="destructive">
            <AlertTitle>Setup error</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>{steps[step - 1]?.title}</CardTitle>
            <CardDescription>{steps[step - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site name</label>
                  <Input
                    value={form.siteName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, siteName: event.target.value }))
                    }
                    placeholder="Nextless"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary locale</label>
                  <Select
                    value={form.siteLocale}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, siteLocale: value }))
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select locale" />
                    </SelectTrigger>
                    <SelectContent>
                      {localeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Public Site URL</label>
                <Input
                  value={form.publicBaseUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, publicBaseUrl: event.target.value }))
                  }
                  placeholder="https://example.com"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Used for preview links, reset links, and runtime absolute URLs.
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auth session TTL (days)</label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.authSessionTtlDays}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        authSessionTtlDays: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Allowed range: 1-365 days.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Password reset TTL (minutes)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={form.authResetTtlMinutes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        authResetTtlMinutes: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Allowed range: 5-1440 minutes.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/90 p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || isSaving}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={handleNext} disabled={isSaving} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={isSaving}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSaving ? "Finishing..." : "Complete setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
