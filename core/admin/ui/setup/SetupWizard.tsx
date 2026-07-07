import { useReducer, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AdminColorModeToggle } from "@/ui/shared/AdminColorModeToggle";
import { isApiClientError } from "@/services/apiClient";
import { updateSettings } from "@/services/settingsClient";
import { cn } from "@/lib/utils";

import {
  canAdvance,
  currentStep,
  initWizardState,
  reduce,
  visibleSteps,
  type WizardAction,
} from "./wizardMachine";
import { toBasicSettingsPayload } from "./setupWizardValidation";
import type { WizardState, WizardStep, WizardValues } from "./wizardSteps";
import { IdentityStep } from "./steps/IdentityStep";
import { BrandingStep } from "./steps/BrandingStep";
import { LocaleStep } from "./steps/LocaleStep";
import { TimezoneStep } from "./steps/TimezoneStep";
import { UrlsStep } from "./steps/UrlsStep";
import { StarterContentStep } from "./steps/StarterContentStep";
import { EmailStep } from "./steps/advanced/EmailStep";
import { StorageStep } from "./steps/advanced/StorageStep";
import { SecurityStep } from "./steps/advanced/SecurityStep";
import { AssistantStep } from "./steps/advanced/AssistantStep";

// The Basic-track settings are flushed to `PATCH /settings` in one bulk write as
// the operator advances past the last settings-bearing Basic step (the URLs
// step); locale/timezone/identity are all set by then. Finalize (setup.completed
// + the whole payload) is 08-L01's job on Finish.
const BASIC_SETTINGS_COMMIT_STEP_ID = "urls";

type SetupWizardProps = {
  initialValues?: Partial<WizardValues>;
  // 04-L01's `WizardValues` is a structural superset of `SetupWizardValues`, so
  // AdminApp's `completeSetup` (SetupWizardValues) stays assignable here until
  // 08-L01 widens it. Do NOT narrow this back.
  onSubmit: (values: WizardValues) => Promise<void> | void;
  isSaving?: boolean;
  error?: string | null;
};

// The concrete field UIs for each step land in 05/06/07. Until then every step
// renders a navigable placeholder so the shell flows end to end; defaults keep
// the required validators satisfied.
function StepPlaceholder({ step }: { step: WizardStep }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{step.title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{step.description}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        The controls for this step arrive in a later setup phase.
      </p>
    </div>
  );
}

// Registry-driven body switch. 05 wires the Basic-track step fields; 07 replaces
// the advanced cases. The fallback keeps un-implemented steps navigable.
function renderStep(state: WizardState, dispatch: React.Dispatch<WizardAction>, disabled: boolean) {
  const step = currentStep(state);
  if (!step) return null;
  const onPatch = (patch: Partial<WizardValues>) => dispatch({ type: "patch", patch });
  const bodyProps = { values: state.values, onPatch, disabled };
  switch (step.id) {
    case "identity":
      return <IdentityStep {...bodyProps} />;
    case "branding":
      return <BrandingStep {...bodyProps} />;
    case "locale":
      return <LocaleStep {...bodyProps} />;
    case "timezone":
      return <TimezoneStep {...bodyProps} />;
    case "urls":
      return <UrlsStep {...bodyProps} />;
    case "starter-content":
      return <StarterContentStep {...bodyProps} />;
    // Advanced track (07-L01): thin adapters over the existing dedicated settings
    // surfaces. They save through their own endpoints on their own Save button;
    // the underlying wizard steps are optional, so Next is never blocked by them.
    case "email":
      return <EmailStep {...bodyProps} />;
    case "storage":
      return <StorageStep {...bodyProps} />;
    case "security":
      return <SecurityStep {...bodyProps} />;
    case "assistant":
      return <AssistantStep {...bodyProps} />;
    default:
      return <StepPlaceholder step={step} />;
  }
}

function StepRail({
  steps,
  currentId,
  values,
  onSelect,
}: {
  steps: WizardStep[];
  currentId: string;
  values: WizardValues;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Setup steps" className="flex flex-col gap-1">
      {steps.map((step, index) => {
        const active = step.id === currentId;
        const complete = step.isComplete(values) && !active;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(step.id)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              active
                ? "border-primary/40 bg-primary-soft text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60"
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : complete
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-border/70 text-muted-foreground"
              )}
            >
              {complete ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="truncate font-medium">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function SetupWizard({
  initialValues,
  onSubmit,
  isSaving = false,
  error = null,
}: SetupWizardProps) {
  const [state, dispatch] = useReducer(reduce, initialValues, initWizardState);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const steps = visibleSteps(state);
  const step = currentStep(state);
  const stepError = step ? step.validate(state.values) : null;
  const visibleError = stepError ?? commitError ?? error;

  const currentIndex = steps.findIndex((entry) => entry.id === step?.id);
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex === steps.length - 1;
  const busy = isSaving || committing;
  const advanceBlocked = !canAdvance(state);

  const handlePrimary = async () => {
    if (isLast) {
      void onSubmit(state.values);
      return;
    }
    // Flush the Basic-track settings once, as we leave the last settings-bearing
    // step. `updateSettings` owns CSRF + the admin cache contract; a client
    // validation error already blocks Next (canAdvance), and a server
    // `settings_value_invalid` surfaces inline without advancing.
    if (step?.id === BASIC_SETTINGS_COMMIT_STEP_ID) {
      setCommitting(true);
      setCommitError(null);
      try {
        await updateSettings(toBasicSettingsPayload(state.values));
      } catch (err) {
        setCommitError(
          isApiClientError(err) ? err.message : "Failed to save your settings. Please try again."
        );
        setCommitting(false);
        return;
      }
      setCommitting(false);
    }
    dispatch({ type: "next" });
  };

  return (
    <div className="relative flex min-h-screen justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="absolute right-5 top-5 z-10">
        <AdminColorModeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h1 className="font-display text-lg font-semibold text-foreground">
                  Set up Coderso
                </h1>
                <p className="text-sm text-muted-foreground">
                  Configure your site before opening the admin panel.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={state.advancedEnabled}
                onCheckedChange={(value) => dispatch({ type: "toggleAdvanced", value })}
                aria-label="Advanced setup"
                disabled={busy}
              />
              Advanced setup
            </label>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-card">
            <StepRail
              steps={steps}
              currentId={state.currentStepId}
              values={state.values}
              onSelect={(id) => dispatch({ type: "goto", id })}
            />
          </aside>

          <div className="flex flex-col gap-5">
            {visibleError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Setup error</AlertTitle>
                <AlertDescription>{visibleError}</AlertDescription>
              </Alert>
            ) : null}

            <Card className="border-border/70 shadow-card">
              <CardHeader>
                <CardTitle>{step?.title}</CardTitle>
                <CardDescription>{step?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">{renderStep(state, dispatch, busy)}</CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-card">
              <Button
                type="button"
                variant="ghost"
                onClick={() => dispatch({ type: "prev" })}
                disabled={isFirst || busy}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handlePrimary()}
                disabled={busy || advanceBlocked}
                className="gap-2"
              >
                {isLast ? (
                  <>
                    <Check className="h-4 w-4" />
                    {isSaving ? "Finishing..." : "Finish setup"}
                  </>
                ) : (
                  <>
                    {committing ? "Saving..." : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
