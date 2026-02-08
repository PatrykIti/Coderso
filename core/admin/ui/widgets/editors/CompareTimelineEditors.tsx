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

const variantOptions: Array<{
  id: CompareTimelineVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "dual-track",
    label: "Dual Track",
    description: "Compare two processes across the same axis.",
  },
  {
    id: "dual-track-highlight",
    label: "Highlight",
    description: "Emphasize selected segments on one track.",
  },
];

const guideStyles = ["solid", "dashed"] as const;
const labelPositionOptions = ["top", "bottom"] as const;
const trackSpacingOptions = ["sm", "md", "lg", "xl"] as const;
const highlightLabelStyles = ["solid", "outline", "subtle"] as const;

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

function removeAxisStep(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void
) {
  const current = normalizeValue(value);
  if (current.axis.steps.length <= compareAxisStepMin) return;
  setAxisStepCount(value, onChange, current.axis.steps.length - 1);
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
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

function CompareVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Comparison style</p>
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose variant" />
        </SelectTrigger>
        <SelectContent>
          {variantOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {
          variantOptions.find((option) => option.id === value)?.description ??
          "Select compare timeline style."
        }
      </p>
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
        <p className="text-xs text-muted-foreground">No segments configured.</p>
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
                  <SelectItem key={`${track.id}-from-${step.id ?? stepIndex}`} value={String(stepIndex)}>
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
                  <SelectItem key={`${track.id}-to-${step.id ?? stepIndex}`} value={String(stepIndex)}>
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

export function CompareTimelineWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const steps = normalized.axis.steps;
  const tracks = normalized.tracks;
  const highlightEnabled = resolvedVariant === "dual-track-highlight";
  const targetTrackId = normalized.highlight?.targetTrackId ?? tracks[1]?.id ?? tracks[0]?.id;
  const targetTrackIndex = tracks.findIndex((track) => track.id === targetTrackId);
  const targetTrack = tracks[targetTrackIndex] ?? tracks[0];

  return (
    <div className="space-y-4">
      <CompareVariantSelect value={resolvedVariant} onChange={onVariantChange} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Track labels</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tracks.map((track, trackIndex) => (
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Axis step count</p>
        <Select
          value={String(steps.length)}
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
        <div className="space-y-2">
          {steps.map((step, stepIndex) => (
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
        <p className="text-sm font-medium">Track A markers</p>
        <MarkerToggleGrid
          track={tracks[0]!}
          steps={steps}
          onToggle={(stepIndex) => toggleMarker(value, onChange, 0, stepIndex)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Track B markers</p>
        <MarkerToggleGrid
          track={tracks[1]!}
          steps={steps}
          onToggle={(stepIndex) => toggleMarker(value, onChange, 1, stepIndex)}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Highlight segments</p>
          <p className="text-xs text-muted-foreground">Enable highlighted range on one track.</p>
        </div>
        <Switch
          checked={highlightEnabled}
          onCheckedChange={(checked) =>
            onVariantChange?.(checked ? "dual-track-highlight" : "dual-track")
          }
        />
      </div>

      {highlightEnabled ? (
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
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Quick segment on selected track.
          </p>
          <SegmentEditor
            track={targetTrack}
            steps={steps}
            onAdd={() => addSegment(value, onChange, Math.max(targetTrackIndex, 0))}
            onPatch={(segmentIndex, patch) =>
              updateSegment(value, onChange, Math.max(targetTrackIndex, 0), segmentIndex, patch)
            }
            onRemove={(segmentIndex) =>
              removeSegment(value, onChange, Math.max(targetTrackIndex, 0), segmentIndex)
            }
          />
        </div>
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
  const steps = normalized.axis.steps;
  const tracks = normalized.tracks;
  const targetTrackId = normalized.highlight?.targetTrackId ?? tracks[1]?.id ?? tracks[0]?.id;

  return (
    <div className="space-y-4">
      <CompareVariantSelect value={resolvedVariant} onChange={onVariantChange} />

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Track labels</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tracks.map((track, trackIndex) => (
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

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Markers mapping</p>
        {tracks.map((track, trackIndex) => (
          <div key={track.id} className="space-y-2">
            <p className="text-xs text-muted-foreground">{track.label}</p>
            <MarkerToggleGrid
              track={track}
              steps={steps}
              onToggle={(stepIndex) => toggleMarker(value, onChange, trackIndex, stepIndex)}
            />
          </div>
        ))}
      </div>

      {resolvedVariant === "dual-track-highlight" ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Highlight target and segments</p>
          <Select
            value={targetTrackId}
            onValueChange={(next) => updateHighlight(value, onChange, { targetTrackId: next })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select track" />
            </SelectTrigger>
            <SelectContent>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SegmentEditor
            track={tracks.find((track) => track.id === targetTrackId) ?? tracks[0]!}
            steps={steps}
            onAdd={() =>
              addSegment(
                value,
                onChange,
                Math.max(
                  tracks.findIndex((track) => track.id === targetTrackId),
                  0
                )
              )
            }
            onPatch={(segmentIndex, patch) =>
              updateSegment(
                value,
                onChange,
                Math.max(
                  tracks.findIndex((track) => track.id === targetTrackId),
                  0
                ),
                segmentIndex,
                patch
              )
            }
            onRemove={(segmentIndex) =>
              removeSegment(
                value,
                onChange,
                Math.max(
                  tracks.findIndex((track) => track.id === targetTrackId),
                  0
                ),
                segmentIndex
              )
            }
          />
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Guide style</p>
          <Select
            value={normalized.guides?.style ?? "dashed"}
            onValueChange={(next) => updateGuides(value, onChange, { style: next as CompareGuides["style"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Guide style" />
            </SelectTrigger>
            <SelectContent>
              {guideStyles.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Label position</p>
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
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <SelectValue placeholder="Label style" />
            </SelectTrigger>
            <SelectContent>
              {highlightLabelStyles.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ColorField
          label="Highlight color"
          value={normalized.style?.highlightColor}
          onChange={(next) => updateStyle(value, onChange, { highlightColor: next })}
          placeholder="#f59e0b"
          pickerFallback="#f59e0b"
        />
      </div>
    </div>
  );
}

export function CompareTimelineAdvancedEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const steps = normalized.axis.steps;

  return (
    <div className="space-y-4">
      <CompareVariantSelect
        value={resolveCompareTimelineVariant(variant)}
        onChange={onVariantChange}
      />

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Axis editor</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeAxisStep(value, onChange)}
              disabled={steps.length <= compareAxisStepMin}
            >
              Remove step
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addAxisStep(value, onChange)}
              disabled={steps.length >= compareAxisStepMax}
            >
              Add step
            </Button>
          </div>
        </div>
        {steps.map((step, stepIndex) => (
          <div key={step.id ?? `${stepIndex}`} className="space-y-2 rounded-lg border p-3">
            <Input
              value={step.label}
              onChange={(event) =>
                updateAxisStep(value, onChange, stepIndex, { label: event.target.value })
              }
              placeholder={`Step ${stepIndex + 1} label`}
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

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Tracks and segments</p>
        {normalized.tracks.map((track, trackIndex) => (
          <div key={track.id} className="space-y-2 rounded-lg border p-3">
            <Input
              value={track.label}
              onChange={(event) =>
                updateTrack(value, onChange, trackIndex, { label: event.target.value })
              }
              placeholder={`Track ${trackIndex + 1}`}
            />
            <MarkerToggleGrid
              track={track}
              steps={steps}
              onToggle={(stepIndex) => toggleMarker(value, onChange, trackIndex, stepIndex)}
            />
            <SegmentEditor
              track={track}
              steps={steps}
              onAdd={() => addSegment(value, onChange, trackIndex)}
              onPatch={(segmentIndex, patch) =>
                updateSegment(value, onChange, trackIndex, segmentIndex, patch)
              }
              onRemove={(segmentIndex) =>
                removeSegment(value, onChange, trackIndex, segmentIndex)
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Guides and layout</p>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show guides</p>
            <p className="text-xs text-muted-foreground">
              Enable horizontal guide lines across tracks.
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
                updateGuides(value, onChange, {
                  style: next as CompareGuides["style"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Guide style" />
              </SelectTrigger>
              <SelectContent>
                {guideStyles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Label position</p>
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
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Style tokens</p>

        <div className="grid gap-3 md:grid-cols-2">
          <ColorField
            label="Highlight color"
            value={normalized.style?.highlightColor}
            onChange={(next) => updateStyle(value, onChange, { highlightColor: next })}
            placeholder="#f59e0b"
            pickerFallback="#f59e0b"
          />
          <ColorField
            label="Marker color"
            value={normalized.style?.markerColor}
            onChange={(next) => updateStyle(value, onChange, { markerColor: next })}
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
            placeholder="#e2e8f0"
            pickerFallback="#e2e8f0"
          />
        </div>
      </div>
    </div>
  );
}
