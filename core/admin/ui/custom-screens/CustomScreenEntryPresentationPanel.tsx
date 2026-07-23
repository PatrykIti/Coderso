import { RefreshCw, Save, Trash2 } from "lucide-react";
import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaPicker } from "@/ui/media/MediaPicker";
import type {
  ScreenEntryPresentationOverrideDraft,
  ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";

import {
  inheritPresentationValue,
  presentationTextEmphasisOptions,
  presentationTextSizeOptions,
  presentationToneOptions,
  type PresentationTarget,
} from "./customScreenEntryPresentation";

export type CustomScreenEntryPresentationPanelProps = {
  target: PresentationTarget;
  overrides: readonly ScreenEntryPresentationOverrideDraft[];
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  onReload: () => void;
  onClear: () => void;
  onChange: (propPath: ScreenEntryPresentationOverridePropPath, value: string | null) => void;
};

export function CustomScreenEntryPresentationPanel({
  target,
  overrides,
  dirty,
  loading,
  saving,
  onSave,
  onReload,
  onClear,
  onChange,
}: CustomScreenEntryPresentationPanelProps) {
  const mediaOverrideCaptionId = useId();
  const selectedOverrides = overrides.filter((override) => override.blockId === target.block.id);
  const readOverride = (propPath: ScreenEntryPresentationOverridePropPath) =>
    selectedOverrides.find((override) => override.propPath === propPath)?.value ?? null;
  const selectedTextSize = readOverride("textSize") ?? inheritPresentationValue;
  const selectedTextEmphasis = readOverride("textEmphasis") ?? inheritPresentationValue;
  const selectedTone = readOverride("tone") ?? inheritPresentationValue;
  const selectedMediaAssetId = readOverride("mediaAssetId") ?? readOverride("image") ?? null;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 shadow-soft"
      data-custom-screen-entry-presentation-panel="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Presentation</p>
            <Badge variant="outline" className="text-[10px] uppercase">
              {target.label}
            </Badge>
            {dirty ? (
              <Badge variant="secondary" className="text-[10px] uppercase">
                Unsaved presentation
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Overrides are scoped to this record and selected block.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={onSave}
            disabled={saving || loading || !dirty}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save presentation"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onReload}
            disabled={saving || loading}
          >
            <RefreshCw className="h-4 w-4" />
            Reload presentation
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onClear}
            disabled={selectedOverrides.length === 0 || saving}
          >
            <Trash2 className="h-4 w-4" />
            Clear selected presentation
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {target.supportsText ? (
          <>
            <div className="space-y-1" data-presentation-control="textSize">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Text size
              </span>
              <Select
                value={selectedTextSize}
                onValueChange={(next) =>
                  onChange("textSize", next === inheritPresentationValue ? null : next)
                }
              >
                <SelectTrigger className="w-full" aria-label="Text size">
                  <SelectValue placeholder="Inherit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                  {presentationTextSizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1" data-presentation-control="textEmphasis">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Emphasis
              </span>
              <Select
                value={selectedTextEmphasis}
                onValueChange={(next) =>
                  onChange("textEmphasis", next === inheritPresentationValue ? null : next)
                }
              >
                <SelectTrigger className="w-full" aria-label="Emphasis">
                  <SelectValue placeholder="Inherit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                  {presentationTextEmphasisOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1" data-presentation-control="tone">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tone
              </span>
              <Select
                value={selectedTone}
                onValueChange={(next) =>
                  onChange("tone", next === inheritPresentationValue ? null : next)
                }
              >
                <SelectTrigger className="w-full" aria-label="Tone">
                  <SelectValue placeholder="Inherit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                  {presentationToneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>

      {target.mediaField || target.supportsDirectImage ? (
        <div
          className="mt-4"
          data-presentation-control="mediaAssetId"
          role="group"
          aria-labelledby={mediaOverrideCaptionId}
        >
          <span
            id={mediaOverrideCaptionId}
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Media override
          </span>
          <MediaPicker
            value={selectedMediaAssetId}
            onChange={(next) =>
              onChange("mediaAssetId", typeof next === "string" && next.trim() ? next : null)
            }
            multiple={false}
            accept={
              target.mediaField?.media?.accept ??
              (target.supportsDirectImage ? ["image/*"] : undefined)
            }
          />
        </div>
      ) : null}
    </div>
  );
}
