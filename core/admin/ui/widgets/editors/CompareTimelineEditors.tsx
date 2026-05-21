import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  compareAxisStepMax,
  compareAxisStepMin,
  normalizeCompareAxisSteps,
  normalizeCompareTimelineData,
  resolveCompareTimelineVariant,
  type CompareAxisStep,
  type CompareTimelineFontWeight,
  type CompareTimelineData,
  type CompareTimelineMarkerShape,
  type CompareTimelineVariantId,
  type CompareTrack,
  type CompareTrackSegment,
} from "../../../../widgets/core/compareTimeline";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  ClearableFieldHeader,
  ColorContrastNotice,
  type ColorContrastAdvisory,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: CompareTimelineVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "dual-track",
    label: "Dual Track",
    description: "Compare two processes across a shared axis.",
  },
  {
    id: "dual-track-highlight",
    label: "Dual Track Highlight",
    description: "Focus key ranges on one or both tracks.",
  },
];

const guideStyles = ["solid", "dashed"] as const;
const labelPositionOptions = ["top", "bottom"] as const;
const trackSpacingOptions = ["none", "sm", "md", "lg", "xl"] as const;
const maxWidthOptions = ["none", "4xl", "5xl", "6xl", "7xl"] as const;
const paddingOptions = ["sm", "md", "lg"] as const;
const motionOptions = ["none", "fade", "slide"] as const;
const trackOrderOptions = [
  { id: "a-first", label: "Traditional first" },
  { id: "b-first", label: "With us first" },
] as const;
const highlightLabelStyles = ["solid", "outline", "subtle"] as const;
const trackLabelSizes = ["none", "sm", "base", "lg"] as const;
const stepLabelSizes = ["none", "xs", "sm", "base"] as const;
const segmentLabelSizes = ["none", "xs", "sm", "base"] as const;
const fontWeightOptions: CompareTimelineFontWeight[] = ["normal", "medium", "semibold", "bold"];
const markerShapeOptions: CompareTimelineMarkerShape[] = ["rounded", "circle", "numbered", "check"];
const formatTokenOptionLabel = (option: string) => (option === "none" ? "None" : option);

const stepCountOptions = Array.from(
  { length: compareAxisStepMax - compareAxisStepMin + 1 },
  (_, index) => compareAxisStepMin + index
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type CompareGuides = NonNullable<CompareTimelineData["guides"]>;
type CompareStyle = NonNullable<CompareTimelineData["style"]>;
type CompareLayout = NonNullable<CompareTimelineData["layout"]>;
type CompareHighlight = NonNullable<CompareTimelineData["highlight"]>;

const spacingTokenDescriptions: Record<string, string> = {
  none: "0px gap",
  sm: "12px gap",
  md: "16px gap",
  lg: "24px gap",
  xl: "32px gap",
};

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function pickContrastAdvisory(advisories: ColorContrastAdvisory[]) {
  return (
    advisories.find((advisory) => advisory.status === "warning") ??
    advisories.find((advisory) => advisory.status === "unknown") ?? { status: "ok" as const }
  );
}

function normalizeValue(value: CompareTimelineData): CompareTimelineData {
  return normalizeCompareTimelineData(value);
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function updateCompareValue(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  updater: (current: CompareTimelineData) => CompareTimelineData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateTrack(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  patch: Partial<CompareTrack>
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    tracks[trackIndex] = { ...track, ...patch };
    return { ...current, tracks };
  });
}

function updateSegment(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  segmentIndex: number,
  patch: Partial<CompareTrackSegment>
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const segments = Array.isArray(track.segments) ? [...track.segments] : [];
    const base = segments[segmentIndex] ?? { from: 0, to: 0 };
    segments[segmentIndex] = {
      from: patch.from ?? base.from,
      to: patch.to ?? base.to,
      label: patch.label ?? base.label,
      href: patch.href ?? base.href,
    };
    tracks[trackIndex] = { ...track, segments };
    return { ...current, tracks };
  });
}

function removeSegment(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  segmentIndex: number
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const segments = Array.isArray(track.segments) ? [...track.segments] : [];
    tracks[trackIndex] = {
      ...track,
      segments: segments.filter((_, index) => index !== segmentIndex),
    };
    return { ...current, tracks };
  });
}

function addSegment(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const lastIndex = Math.max(0, current.axis.steps.length - 1);
    const segments = Array.isArray(track.segments) ? [...track.segments] : [];
    segments.push({ from: 0, to: Math.min(1, lastIndex), label: "", href: "" });
    tracks[trackIndex] = { ...track, segments };
    return { ...current, tracks };
  });
}

function toggleMarker(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  stepIndex: number
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const exists = track.markers.includes(stepIndex);
    tracks[trackIndex] = {
      ...track,
      markers: exists
        ? track.markers.filter((marker) => marker !== stepIndex)
        : [...track.markers, stepIndex],
    };
    return { ...current, tracks };
  });
}

function updateGuides(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareGuides>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    guides: {
      ...current.guides,
      ...patch,
    },
  }));
}

function updateStyle(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareStyle>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateHeader(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<NonNullable<CompareTimelineData["header"]>>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    header: {
      ...current.header,
      ...patch,
    },
  }));
}

function clearStyle(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  key: keyof CompareStyle
) {
  updateCompareValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function updateLayout(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareLayout>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateHighlight(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareHighlight>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    highlight: {
      ...current.highlight,
      ...patch,
    },
  }));
}

function updateAxisStep(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  index: number,
  patch: Partial<CompareAxisStep>
) {
  updateCompareValue(value, onChange, (current) => {
    const steps = [...current.axis.steps];
    const step = steps[index];
    if (!step) return current;
    steps[index] = {
      ...step,
      ...patch,
    };
    return {
      ...current,
      axis: { ...current.axis, steps },
    };
  });
}

function setAxisStepCount(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  count: number
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    axis: {
      ...current.axis,
      steps: normalizeCompareAxisSteps(current.axis.steps, count),
    },
  }));
}

function addAxisStep(value: CompareTimelineData, onChange: (next: CompareTimelineData) => void) {
  const current = normalizeValue(value);
  if (current.axis.steps.length >= compareAxisStepMax) return;
  setAxisStepCount(value, onChange, current.axis.steps.length + 1);
}

function removeAxisStep(value: CompareTimelineData, onChange: (next: CompareTimelineData) => void) {
  const current = normalizeValue(value);
  if (current.axis.steps.length <= compareAxisStepMin) return;
  setAxisStepCount(value, onChange, current.axis.steps.length - 1);
}

function resolveHighlightModeValue(normalized: CompareTimelineData) {
  const targetTrackIds = normalized.highlight?.targetTrackIds ?? [];
  if (targetTrackIds.length > 1) return "both";
  return (
    normalized.highlight?.targetTrackId ??
    normalized.tracks[1]?.id ??
    normalized.tracks[0]?.id ??
    "a"
  );
}

function updateHighlightTargets(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  mode: string
) {
  const normalized = normalizeValue(value);
  const [firstTrack, secondTrack] = normalized.tracks;
  if (!firstTrack) return;
  if (mode === "both" && secondTrack) {
    updateHighlight(value, onChange, {
      targetTrackId: normalized.highlight?.targetTrackId ?? firstTrack.id,
      targetTrackIds: [firstTrack.id, secondTrack.id],
    });
    return;
  }

  if (mode === firstTrack.id || mode === secondTrack?.id) {
    updateHighlight(value, onChange, {
      targetTrackId: mode,
      targetTrackIds: [mode],
    });
  }
}

function resolveTrackHighlightHint(normalized: CompareTimelineData, trackId: string) {
  const targetTrackIds = normalized.highlight?.targetTrackIds ?? [];
  if (targetTrackIds.includes(trackId)) return undefined;
  return "Saved segments stay on this track but render only after you include it in Highlight targets.";
}

function ColorField({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  pickerFallback,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader
        label={label}
        value={value}
        onClear={onClear}
        onRestoreValue={onChange}
      />
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function VariantCards({ value, onChange }: { value: string; onChange?: (next: string) => void }) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <div className="mt-3 rounded-md border bg-muted/40 p-3">
            {option.id === "dual-track" ? (
              <div className="space-y-2" aria-hidden="true">
                <div className="grid grid-cols-3 gap-1">
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Plan</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Build</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Ship</span>
                </div>
                <div className="space-y-1">
                  <div className="rounded-md border border-border bg-background px-2 py-2 text-[10px]">
                    Traditional
                  </div>
                  <div className="rounded-md border border-border bg-background px-2 py-2 text-[10px]">
                    With us
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2" aria-hidden="true">
                <div className="grid grid-cols-3 gap-1">
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Plan</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Build</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Ship</span>
                </div>
                <div className="space-y-1">
                  <div className="rounded-md border border-border bg-background px-2 py-2 text-[10px]">
                    Traditional
                  </div>
                  <div className="rounded-md border border-primary bg-primary/10 px-2 py-2 text-[10px]">
                    With us
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[9px]">
                        Launch sprint
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function MarkerToggleGrid({
  track,
  steps,
  onToggle,
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  onToggle: (stepIndex: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const active = track.markers.includes(index);
        return (
          <button
            key={`${track.id}-${step.id ?? index}`}
            type="button"
            onClick={() => onToggle(index)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground"
            )}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentEditor({
  track,
  steps,
  onAdd,
  onPatch,
  onRemove,
  renderHint,
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  onAdd: () => void;
  onPatch: (segmentIndex: number, patch: Partial<CompareTrackSegment>) => void;
  onRemove: (segmentIndex: number) => void;
  renderHint?: string;
}) {
  const segments = Array.isArray(track.segments) ? track.segments : [];
  const [rangeWarnings, setRangeWarnings] = useState<Record<number, string | undefined>>({});

  const updateRangeWarning = (segmentIndex: number, from: number, to: number) => {
    setRangeWarnings((current) => ({
      ...current,
      [segmentIndex]:
        from > to
          ? "The saved range will normalize from the earlier step to the later step."
          : undefined,
    }));
  };

  return (
    <div className="space-y-2">
      {renderHint ? <p className="text-xs text-muted-foreground">{renderHint}</p> : null}

      {segments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No highlight segments configured.</p>
      ) : null}

      {segments.map((segment, segmentIndex) => (
        <div
          key={`${track.id}-${segment.from}-${segment.to}-${segmentIndex}`}
          className="space-y-2 rounded-lg border p-3"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              value={String(segment.from)}
              onValueChange={(next) => {
                const nextFrom = Number(next);
                updateRangeWarning(segmentIndex, nextFrom, segment.to);
                onPatch(segmentIndex, { from: nextFrom });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {steps.map((step, stepIndex) => (
                  <SelectItem
                    key={`${track.id}-from-${step.id ?? stepIndex}`}
                    value={String(stepIndex)}
                  >
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(segment.to)}
              onValueChange={(next) => {
                const nextTo = Number(next);
                updateRangeWarning(segmentIndex, segment.from, nextTo);
                onPatch(segmentIndex, { to: nextTo });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {steps.map((step, stepIndex) => (
                  <SelectItem
                    key={`${track.id}-to-${step.id ?? stepIndex}`}
                    value={String(stepIndex)}
                  >
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(segmentIndex)}>
              Remove segment
            </Button>
          </div>

          <Input
            value={segment.label ?? ""}
            onChange={(event) => onPatch(segmentIndex, { label: event.target.value })}
            placeholder={`Optional label. Empty -> "Steps ${segment.from + 1}-${segment.to + 1}"`}
          />

          <Input
            value={segment.href ?? ""}
            onChange={(event) => onPatch(segmentIndex, { href: event.target.value })}
            placeholder="Optional safe link (/compare-path or https://...)"
          />

          <p className="text-xs text-muted-foreground">
            Empty labels fall back to <code>{`Steps ${segment.from + 1}-${segment.to + 1}`}</code>.
          </p>

          {rangeWarnings[segmentIndex] ? (
            <p className="text-xs text-amber-700">{rangeWarnings[segmentIndex]}</p>
          ) : null}
        </div>
      ))}

      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        Add segment
      </Button>
    </div>
  );
}

function getHighlightContext(value: CompareTimelineData) {
  const targetTrackIds = value.highlight?.targetTrackIds?.length
    ? value.highlight.targetTrackIds
    : [];
  return {
    highlightMode: resolveHighlightModeValue(value),
    targetTrackIds,
  };
}

export function CompareTimelineWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const highlightEnabled = resolvedVariant === "dual-track-highlight";
  const { highlightMode, targetTrackIds } = getHighlightContext(normalized);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Quick setup"
        description="Set comparison baseline without deep styling controls."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Highlight mode</p>
            <p className="text-xs text-muted-foreground">Emphasize ranges on one or both tracks.</p>
          </div>
          <Switch
            checked={highlightEnabled}
            onCheckedChange={(checked) =>
              onVariantChange?.(checked ? "dual-track-highlight" : "dual-track")
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Axis step count</p>
          <Select
            value={String(normalized.axis.steps.length)}
            onValueChange={(next) => setAxisStepCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select step count" />
            </SelectTrigger>
            <SelectContent>
              {stepCountOptions.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} steps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Axis copy"
        description="Set beginner-friendly labels and descriptions for each step."
      >
        <div className="space-y-3">
          {normalized.axis.steps.map((step, stepIndex) => (
            <div key={step.id ?? `${stepIndex}`} className="space-y-2 rounded-lg border p-3">
              <Input
                value={step.label}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, { label: event.target.value })
                }
                placeholder={`Step ${stepIndex + 1}`}
              />
              <Textarea
                value={step.description ?? ""}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, {
                    description: event.target.value,
                  })
                }
                placeholder="Optional step description"
                rows={2}
              />
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection
        title="Track labels"
        description="Name both tracks for a clear side-by-side comparison."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {normalized.tracks.map((track, trackIndex) => (
            <Input
              key={track.id}
              value={track.label}
              onChange={(event) =>
                updateTrack(value, onChange, trackIndex, { label: event.target.value })
              }
              placeholder={`Track ${trackIndex + 1} label`}
            />
          ))}
        </div>
      </EditorSection>

      <EditorSection
        title="Marker baseline"
        description="Choose which axis points are active for each track."
      >
        {normalized.tracks.map((track, trackIndex) => (
          <div key={track.id} className="space-y-2">
            <p className="text-sm font-medium">{track.label}</p>
            <MarkerToggleGrid
              track={track}
              steps={normalized.axis.steps}
              onToggle={(stepIndex) => toggleMarker(value, onChange, trackIndex, stepIndex)}
            />
            {track.markers.length === 0 ? (
              <p className="text-xs text-amber-700">
                This track currently has no active markers, so the runtime row will look empty.
              </p>
            ) : null}
          </div>
        ))}
      </EditorSection>

      {highlightEnabled ? (
        <EditorSection
          title="Highlight segments"
          description="Choose highlight targets and configure beginner-safe segment ranges."
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">Highlight targets</p>
            <Select
              value={highlightMode}
              onValueChange={(next) => updateHighlightTargets(value, onChange, next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select highlight targets" />
              </SelectTrigger>
              <SelectContent>
                {normalized.tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.label}
                  </SelectItem>
                ))}
                <SelectItem value="both">Both tracks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {normalized.tracks.map((track, trackIndex) => (
              <div key={track.id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{track.label}</p>
                <SegmentEditor
                  track={track}
                  steps={normalized.axis.steps}
                  onAdd={() => addSegment(value, onChange, trackIndex)}
                  onPatch={(segmentIndex, patch) =>
                    updateSegment(value, onChange, trackIndex, segmentIndex, patch)
                  }
                  onRemove={(segmentIndex) =>
                    removeSegment(value, onChange, trackIndex, segmentIndex)
                  }
                  renderHint={resolveTrackHighlightHint(normalized, track.id)}
                />
                {targetTrackIds.includes(track.id) ? null : (
                  <p className="text-xs text-muted-foreground">
                    Saved segments on this track stay hidden until you include it in Highlight
                    targets.
                  </p>
                )}
              </div>
            ))}
          </div>
        </EditorSection>
      ) : null}
    </div>
  );
}

export function CompareTimelineVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const markerContrastAdvisory = pickContrastAdvisory([
    resolveColorContrastAdvisory({
      foreground: normalized.style?.markerColor,
      background: normalized.style?.trackBackgroundColor,
    }),
  ]);
  const labelContrastAdvisory = pickContrastAdvisory([
    resolveColorContrastAdvisory({
      foreground: normalized.style?.trackLabelColor,
      background: normalized.style?.trackBackgroundColor,
    }),
    resolveColorContrastAdvisory({
      foreground: normalized.style?.stepLabelColor,
      background: normalized.style?.trackBackgroundColor,
    }),
  ]);
  const highlightEnabled = resolvedVariant === "dual-track-highlight";
  const { highlightMode } = getHighlightContext(normalized);
  const hasPreservedSegments = normalized.tracks.some((track) => (track.segments?.length ?? 0) > 0);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and compare structure"
        description="Select how the comparison story is presented."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection
        title="Axis steps and track labels"
        description="Define axis wording and track names shown in preview."
      >
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1 space-y-2">
              <p className="text-sm font-medium">Axis step count</p>
              <Select
                value={String(normalized.axis.steps.length)}
                onValueChange={(next) => setAxisStepCount(value, onChange, Number(next))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select step count" />
                </SelectTrigger>
                <SelectContent>
                  {stepCountOptions.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} steps
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAxisStep(value, onChange)}
              disabled={normalized.axis.steps.length <= compareAxisStepMin}
            >
              Remove step
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addAxisStep(value, onChange)}
              disabled={normalized.axis.steps.length >= compareAxisStepMax}
            >
              Add step
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep the comparison readable while scaling from {compareAxisStepMin} to{" "}
            {compareAxisStepMax} steps.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Axis step content</p>
          {normalized.axis.steps.map((step, stepIndex) => (
            <div key={step.id ?? `${stepIndex}`} className="space-y-2 rounded-lg border p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={step.label}
                  onChange={(event) =>
                    updateAxisStep(value, onChange, stepIndex, { label: event.target.value })
                  }
                  placeholder={`Step ${stepIndex + 1}`}
                />
                <Input
                  value={step.icon ?? ""}
                  onChange={(event) =>
                    updateAxisStep(value, onChange, stepIndex, { icon: event.target.value })
                  }
                  placeholder="Optional icon or emoji"
                />
              </div>
              <Textarea
                value={step.description ?? ""}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, {
                    description: event.target.value,
                  })
                }
                placeholder="Optional step description"
                rows={2}
              />
              <Input
                value={step.href ?? ""}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, { href: event.target.value })
                }
                placeholder="Optional safe link (/compare-step or https://...)"
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Track labels</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {normalized.tracks.map((track, trackIndex) => (
              <Input
                key={track.id}
                value={track.label}
                onChange={(event) =>
                  updateTrack(value, onChange, trackIndex, { label: event.target.value })
                }
                placeholder={`Track ${trackIndex + 1} label`}
              />
            ))}
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Markers and segment mapping"
        description="Map active points per track and configure highlight ranges when needed."
      >
        {highlightEnabled ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Highlight targets</p>
            <Select
              value={highlightMode}
              onValueChange={(next) => updateHighlightTargets(value, onChange, next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select highlight targets" />
              </SelectTrigger>
              <SelectContent>
                {normalized.tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.label}
                  </SelectItem>
                ))}
                <SelectItem value="both">Both tracks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {normalized.tracks.map((track, trackIndex) => (
          <div key={track.id} className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">{track.label}</p>
            <MarkerToggleGrid
              track={track}
              steps={normalized.axis.steps}
              onToggle={(stepIndex) => toggleMarker(value, onChange, trackIndex, stepIndex)}
            />
            {track.markers.length === 0 ? (
              <p className="text-xs text-amber-700">
                This track currently has no active markers, so the runtime row will look empty.
              </p>
            ) : null}

            {highlightEnabled ? (
              <SegmentEditor
                track={track}
                steps={normalized.axis.steps}
                onAdd={() => addSegment(value, onChange, trackIndex)}
                onPatch={(segmentIndex, patch) =>
                  updateSegment(value, onChange, trackIndex, segmentIndex, patch)
                }
                onRemove={(segmentIndex) =>
                  removeSegment(value, onChange, trackIndex, segmentIndex)
                }
                renderHint={resolveTrackHighlightHint(normalized, track.id)}
              />
            ) : null}
          </div>
        ))}

        {!highlightEnabled ? (
          <p className="text-xs text-muted-foreground">
            {hasPreservedSegments
              ? "Segment mapping is hidden in Dual Track. Saved segments are preserved and will reappear in Dual Track Highlight."
              : "Segment mapping is available only in the Dual Track Highlight variant."}
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Highlight and guide styles"
        description="Tune emphasis style and guide lines for better readability."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show guides</p>
            <p className="text-xs text-muted-foreground">
              Draw track guide borders for visual alignment.
            </p>
          </div>
          <Switch
            checked={normalized.guides?.enabled ?? true}
            onCheckedChange={(checked) => updateGuides(value, onChange, { enabled: checked })}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Guide style</p>
            <Select
              value={normalized.guides?.style ?? "dashed"}
              onValueChange={(next) =>
                updateGuides(value, onChange, { style: next as CompareGuides["style"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Guide style" />
              </SelectTrigger>
              <SelectContent>
                {guideStyles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {highlightEnabled ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Highlight label style</p>
              <Select
                value={normalized.style?.highlightLabelStyle ?? "solid"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    highlightLabelStyle: next as CompareStyle["highlightLabelStyle"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Highlight label style" />
                </SelectTrigger>
                <SelectContent>
                  {highlightLabelStyles.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatTokenOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </EditorSection>

      <EditorSection
        title="Colors and typography"
        description="Control comparison contrast, label colors, and text scale."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {highlightEnabled ? (
            <ColorField
              label="Highlight color"
              value={normalized.style?.highlightColor}
              onChange={(next) => updateStyle(value, onChange, { highlightColor: next })}
              onClear={() => clearStyle(value, onChange, "highlightColor")}
              placeholder="#f59e0b"
              pickerFallback="#f59e0b"
            />
          ) : null}

          <ColorField
            label="Marker color"
            value={normalized.style?.markerColor}
            onChange={(next) => updateStyle(value, onChange, { markerColor: next })}
            onClear={() => clearStyle(value, onChange, "markerColor")}
            placeholder="#1d4ed8"
            pickerFallback="#1d4ed8"
          />

          <ColorField
            label="Track label color"
            value={normalized.style?.trackLabelColor}
            onChange={(next) => updateStyle(value, onChange, { trackLabelColor: next })}
            onClear={() => clearStyle(value, onChange, "trackLabelColor")}
            placeholder="#0f172a"
            pickerFallback="#0f172a"
          />

          <ColorField
            label="Step label color"
            value={normalized.style?.stepLabelColor}
            onChange={(next) => updateStyle(value, onChange, { stepLabelColor: next })}
            onClear={() => clearStyle(value, onChange, "stepLabelColor")}
            placeholder="#0f172a"
            pickerFallback="#0f172a"
          />

          <ColorField
            label="Muted step color"
            value={normalized.style?.mutedStepColor}
            onChange={(next) => updateStyle(value, onChange, { mutedStepColor: next })}
            onClear={() => clearStyle(value, onChange, "mutedStepColor")}
            placeholder="#334155"
            pickerFallback="#334155"
          />

          <ColorField
            label="Guide color"
            value={normalized.style?.guideColor}
            onChange={(next) => updateStyle(value, onChange, { guideColor: next })}
            onClear={() => clearStyle(value, onChange, "guideColor")}
            placeholder="#e2e8f0"
            pickerFallback="#e2e8f0"
          />

          <ColorField
            label="Track background color"
            value={normalized.style?.trackBackgroundColor}
            onChange={(next) => updateStyle(value, onChange, { trackBackgroundColor: next })}
            onClear={() => clearStyle(value, onChange, "trackBackgroundColor")}
            placeholder="#ffffff"
            pickerFallback="#ffffff"
          />
        </div>
        <div className="space-y-1">
          <ColorContrastNotice advisory={markerContrastAdvisory} label="Marker contrast advisory" />
          <ColorContrastNotice advisory={labelContrastAdvisory} label="Label contrast advisory" />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Track label size</p>
            <Select
              value={normalized.style?.trackLabelSize ?? "base"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  trackLabelSize: next as CompareStyle["trackLabelSize"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track label size" />
              </SelectTrigger>
              <SelectContent>
                {trackLabelSizes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Step label size</p>
            <Select
              value={normalized.style?.stepLabelSize ?? "xs"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  stepLabelSize: next as CompareStyle["stepLabelSize"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Step label size" />
              </SelectTrigger>
              <SelectContent>
                {stepLabelSizes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {highlightEnabled ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Segment label size</p>
              <Select
                value={normalized.style?.segmentLabelSize ?? "xs"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    segmentLabelSize: next as CompareStyle["segmentLabelSize"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Segment label size" />
                </SelectTrigger>
                <SelectContent>
                  {segmentLabelSizes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatTokenOptionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Track label weight</p>
            <Select
              value={normalized.style?.trackLabelFontWeight ?? "semibold"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  trackLabelFontWeight: next as CompareStyle["trackLabelFontWeight"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track label weight" />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Step label weight</p>
            <Select
              value={normalized.style?.stepLabelFontWeight ?? "semibold"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  stepLabelFontWeight: next as CompareStyle["stepLabelFontWeight"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Step label weight" />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Segment label weight</p>
            <Select
              value={normalized.style?.segmentLabelFontWeight ?? "normal"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  segmentLabelFontWeight: next as CompareStyle["segmentLabelFontWeight"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Segment label weight" />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Marker shape</p>
          <Select
            value={normalized.style?.markerShape ?? "rounded"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { markerShape: next as CompareStyle["markerShape"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Marker shape" />
            </SelectTrigger>
            <SelectContent>
              {markerShapeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatTokenOptionLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Spacing and layout preview hints"
        description="Adjust density and axis label placement for desktop/tablet/mobile preview modes."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Section heading</p>
          <div className="grid gap-2">
            <Input
              value={normalized.header?.title ?? ""}
              onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
              placeholder="Optional section title"
            />
            <Textarea
              value={normalized.header?.subtitle ?? ""}
              onChange={(event) => updateHeader(value, onChange, { subtitle: event.target.value })}
              placeholder="Optional supporting subtitle"
              rows={2}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Track spacing</p>
            <Select
              value={normalized.layout?.trackSpacing ?? "md"}
              onValueChange={(next) =>
                updateLayout(value, onChange, {
                  trackSpacing: next as CompareLayout["trackSpacing"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track spacing" />
              </SelectTrigger>
              <SelectContent>
                {trackSpacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {spacingTokenDescriptions[normalized.layout?.trackSpacing ?? "md"]}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Axis label position</p>
            <Select
              value={normalized.layout?.labelPosition ?? "top"}
              onValueChange={(next) =>
                updateLayout(value, onChange, {
                  labelPosition: next as CompareLayout["labelPosition"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Axis label position" />
              </SelectTrigger>
              <SelectContent>
                {labelPositionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Max width</p>
            <Select
              value={normalized.layout?.maxWidth ?? "6xl"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { maxWidth: next as CompareLayout["maxWidth"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Max width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Section padding</p>
            <Select
              value={normalized.layout?.padding ?? "md"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { padding: next as CompareLayout["padding"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Section padding" />
              </SelectTrigger>
              <SelectContent>
                {paddingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Track order</p>
            <Select
              value={normalized.layout?.trackOrder ?? "a-first"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { trackOrder: next as CompareLayout["trackOrder"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track order" />
              </SelectTrigger>
              <SelectContent>
                {trackOrderOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Motion</p>
            <Select
              value={normalized.layout?.motion ?? "none"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { motion: next as CompareLayout["motion"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Motion" />
              </SelectTrigger>
              <SelectContent>
                {motionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Uses CSS-only motion-safe classes and respects reduced-motion preferences.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Use runtime preview device tabs to validate spacing and label readability per viewport.
        </p>
      </EditorSection>
    </div>
  );
}

export function CompareTimelineAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const { highlightMode } = getHighlightContext(normalized);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Layout tokens"
        description="Technical controls for axis placement, spacing, and guide rendering."
      >
        <p className="text-xs text-muted-foreground">
          Track spacing, axis label position, max width, padding, render order, and motion are owned
          by Visual so editors have one truthful place to adjust layout. Advanced keeps only guide
          toggles and raw metadata diagnostics.
        </p>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Guide lines enabled</p>
            <p className="text-xs text-muted-foreground">
              Toggle track guide borders regardless of visual mode presets.
            </p>
          </div>
          <Switch
            checked={normalized.guides?.enabled ?? true}
            onCheckedChange={(checked) => updateGuides(value, onChange, { enabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Guide line style</p>
          <Select
            value={normalized.guides?.style ?? "dashed"}
            onValueChange={(next) =>
              updateGuides(value, onChange, { style: next as CompareGuides["style"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Guide style" />
            </SelectTrigger>
            <SelectContent>
              {guideStyles.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatTokenOptionLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Raw metadata fields"
        description="Expert-only metadata for stable IDs and optional axis descriptions."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Track IDs</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {normalized.tracks.map((track) => (
              <Input key={track.id} value={track.id} readOnly />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Track IDs are normalized to `a` and `b` for deterministic rendering.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Axis step IDs and descriptions</p>
          {normalized.axis.steps.map((step, stepIndex) => (
            <div key={step.id ?? `${stepIndex}`} className="space-y-2 rounded-lg border p-3">
              <Input
                value={step.id ?? ""}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, { id: event.target.value })
                }
                placeholder={`step-${stepIndex + 1}`}
              />
              <Textarea
                value={step.description ?? ""}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, {
                    description: event.target.value,
                  })
                }
                placeholder="Optional step description"
              />
              <p className="text-xs text-muted-foreground">
                Visual owns the user-facing label, icon, and link fields for this step.
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Highlight target track</p>
          <Select
            value={highlightMode}
            onValueChange={(next) => updateHighlightTargets(value, onChange, next)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Target track" />
            </SelectTrigger>
            <SelectContent>
              {normalized.tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {`${track.label} (${track.id})`}
                </SelectItem>
              ))}
              <SelectItem value="both">Both tracks (a + b)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Data normalization"
        description="Apply deterministic normalization for axis count, IDs, markers, and segments."
      >
        <p className="text-xs text-muted-foreground">
          Current axis steps: {normalized.axis.steps.length}. Runtime rules enforce{" "}
          {compareAxisStepMin}-{compareAxisStepMax} steps, stable IDs, and clamped marker/segment
          ranges.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalized)}>
            Normalize compare payload
          </Button>
          <Button type="button" variant="ghost" onClick={() => addAxisStep(value, onChange)}>
            Add step
          </Button>
          <Button type="button" variant="ghost" onClick={() => removeAxisStep(value, onChange)}>
            Remove step
          </Button>
        </div>
      </EditorSection>
    </div>
  );
}
