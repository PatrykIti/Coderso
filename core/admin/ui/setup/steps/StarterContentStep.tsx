import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsField } from "@/ui/shared/SettingsSection";
import { isApiClientError } from "@/services/apiClient";
import {
  applyStarterContent,
  previewStarterContent,
  type StarterContentApplyResult,
  type StarterContentPreview,
} from "@/services/starterContentClient";

import type { WizardStepBodyProps } from "./stepTypes";

// Selection is limited to a known id/key; the server (06-L02) maps it to a
// curated definition. Ids only — no free-form content is sent.
const KIT_OPTIONS = [
  { id: "blog-starter", label: "Blog" },
  { id: "business-starter", label: "Business" },
  { id: "portfolio-starter", label: "Portfolio" },
];

// TASK-482-05-L02: Starter content step. Optional/skippable — an operator can
// finish Basic onboarding without it (and until 06-L02 lands the endpoints
// simply 404). Calls the internal preview/apply endpoints via the shared
// apiClient (CSRF handled), never a bespoke fetch.
export function StarterContentStep({ disabled }: WizardStepBodyProps) {
  const [kitId, setKitId] = useState("");
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [preview, setPreview] = useState<StarterContentPreview | null>(null);
  const [applied, setApplied] = useState<StarterContentApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controlsDisabled = disabled || busy !== null;

  const handleSelect = (value: string) => {
    setKitId(value);
    setPreview(null);
    setApplied(null);
    setError(null);
  };

  const handlePreview = async () => {
    if (!kitId) return;
    setBusy("preview");
    setError(null);
    setApplied(null);
    try {
      setPreview(await previewStarterContent({ kitId }));
    } catch (err) {
      setError(isApiClientError(err) ? err.message : "Could not preview starter content.");
    } finally {
      setBusy(null);
    }
  };

  const handleApply = async () => {
    if (!kitId) return;
    setBusy("apply");
    setError(null);
    try {
      setApplied(await applyStarterContent({ kitId }));
    } catch (err) {
      setError(isApiClientError(err) ? err.message : "Could not apply starter content.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsField
        label="Starter kit"
        htmlFor="setup-starter-kit"
        hint="Optionally seed pages and menus from a curated kit. You can skip this and add content later."
      >
        <Select value={kitId} onValueChange={handleSelect} disabled={controlsDisabled}>
          <SelectTrigger id="setup-starter-kit" className="w-full">
            <SelectValue placeholder="Choose a kit (optional)" />
          </SelectTrigger>
          <SelectContent>
            {KIT_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsField>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handlePreview}
          disabled={controlsDisabled || !kitId}
        >
          {busy === "preview" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Preview
        </Button>
        <Button
          type="button"
          className="gap-2"
          onClick={handleApply}
          disabled={controlsDisabled || !kitId}
        >
          {busy === "apply" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Apply kit
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {preview && !applied ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{preview.label}</p>
          <p className="mt-1 text-muted-foreground">{preview.summary}</p>
          {preview.items.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {preview.items.map((item) => (
                <li key={`${item.type}:${item.label}`}>{item.label}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {applied ? (
        <p className="text-sm text-success" role="status">
          Applied {applied.createdCount} item{applied.createdCount === 1 ? "" : "s"} from the kit.
        </p>
      ) : null}
    </div>
  );
}
