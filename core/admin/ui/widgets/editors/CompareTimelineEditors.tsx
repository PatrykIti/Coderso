import { type ReactNode } from "react";

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
  type CompareTimelineData,
  type CompareTimelineVariantId,
  type CompareTrack,
  type CompareTrackSegment,
} from "../../../../widgets/core/compareTimeline";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";

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
    description: "Focus key ranges on one target track.",
  },
];

const guideStyles = ["solid", "dashed"] as const;
const labelPositionOptions = ["top", "bottom"] as const;
const trackSpacingOptions = ["none", "sm", "md", "lg", "xl"] as const;
const highlightLabelStyles = ["solid", "outline", "subtle"] as const;
const trackLabelSizes = ["none", "sm", "base", "lg"] as const;
const stepLabelSizes = ["none", "xs", "sm", "base"] as const;
const segmentLabelSizes = ["none", "xs", "sm", "base"] as const;
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

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: CompareTimelineData): CompareTimelineData {
  return normalizeCompareTimelineData(value);
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
    segments.push({ from: 0, to: Math.min(1, lastIndex), label: "" });
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
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
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
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  onAdd: () => void;
  onPatch: (segmentIndex: number, patch: Partial<CompareTrackSegment>) => void;
  onRemove: (segmentIndex: number) => void;
}) {
  const segments = Array.isArray(track.segments) ? track.segments : [];

  return (
    <div className="space-y-2">
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
              onValueChange={(next) => onPatch(segmentIndex, { from: Number(next) })}
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
              onValueChange={(next) => onPatch(segmentIndex, { to: Number(next) })}
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
            placeholder="Segment label (optional)"
          />
        </div>
      ))}

      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        Add segment
      </Button>
    </div>
  );
}

function getTargetTrackContext(value: CompareTimelineData) {
  const tracks = value.tracks;
  const targetTrackId = value.highlight?.targetTrackId ?? tracks[1]?.id ?? tracks[0]?.id ?? "a";
  const targetTrackIndex = Math.max(
    tracks.findIndex((track) => track.id === targetTrackId),
    0
  );
  const targetTrack = tracks[targetTrackIndex] ?? tracks[0];

  return { targetTrackId, targetTrackIndex, targetTrack };
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

  return (
    <div className="space-y-4">
      <EditorSection
        title="Quick setup"
        description="Set comparison baseline without deep styling controls."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Highlight mode</p>
            <p className="text-xs text-muted-foreground">Emphasize ranges on a target track.</p>
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
          </div>
        ))}
      </EditorSection>
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
  const highlightEnabled = resolvedVariant === "dual-track-highlight";
  const { targetTrackId, targetTrackIndex, targetTrack } = getTargetTrackContext(normalized);

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

        <div className="space-y-2">
          <p className="text-sm font-medium">Axis labels</p>
          <div className="grid gap-2 md:grid-cols-2">
            {normalized.axis.steps.map((step, stepIndex) => (
              <Input
                key={step.id ?? `${stepIndex}`}
                value={step.label}
                onChange={(event) =>
                  updateAxisStep(value, onChange, stepIndex, { label: event.target.value })
                }
                placeholder={`Step ${stepIndex + 1}`}
              />
            ))}
          </div>
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
        {normalized.tracks.map((track, trackIndex) => (
          <div key={track.id} className="space-y-2">
            <p className="text-sm font-medium">{track.label}</p>
            <MarkerToggleGrid
              track={track}
              steps={normalized.axis.steps}
              onToggle={(stepIndex) => toggleMarker(value, onChange, trackIndex, stepIndex)}
            />
          </div>
        ))}

        {highlightEnabled && targetTrack ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Highlight target track</p>
            <Select
              value={targetTrackId}
              onValueChange={(next) => updateHighlight(value, onChange, { targetTrackId: next })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {normalized.tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SegmentEditor
              track={targetTrack}
              steps={normalized.axis.steps}
              onAdd={() => addSegment(value, onChange, targetTrackIndex)}
              onPatch={(segmentIndex, patch) =>
                updateSegment(value, onChange, targetTrackIndex, segmentIndex, patch)
              }
              onRemove={(segmentIndex) =>
                removeSegment(value, onChange, targetTrackIndex, segmentIndex)
              }
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Segment mapping is available only in the Dual Track Highlight variant.
          </p>
        )}
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
            placeholder="#0f172a"
            pickerFallback="#0f172a"
          />

          <ColorField
            label="Step label color"
            value={normalized.style?.stepLabelColor}
            onChange={(next) => updateStyle(value, onChange, { stepLabelColor: next })}
            placeholder="#0f172a"
            pickerFallback="#0f172a"
          />

          <ColorField
            label="Muted step color"
            value={normalized.style?.mutedStepColor}
            onChange={(next) => updateStyle(value, onChange, { mutedStepColor: next })}
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
      </EditorSection>

      <EditorSection
        title="Spacing and layout preview hints"
        description="Adjust density and axis label placement for desktop/tablet/mobile preview modes."
      >
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

  return (
    <div className="space-y-4">
      <EditorSection
        title="Layout tokens"
        description="Technical controls for axis placement, spacing, and guide rendering."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Track spacing token</p>
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
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Label position token</p>
            <Select
              value={normalized.layout?.labelPosition ?? "top"}
              onValueChange={(next) =>
                updateLayout(value, onChange, {
                  labelPosition: next as CompareLayout["labelPosition"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Label position" />
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
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Highlight target track ID</p>
          <Select
            value={normalized.highlight?.targetTrackId ?? normalized.tracks[0]?.id ?? "a"}
            onValueChange={(next) => updateHighlight(value, onChange, { targetTrackId: next })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Target track ID" />
            </SelectTrigger>
            <SelectContent>
              {normalized.tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.id}
                </SelectItem>
              ))}
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
