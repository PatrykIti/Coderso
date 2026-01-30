import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { CompareTimelineData } from "../../../../widgets/core/compareTimeline";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
  { id: "dual-track", label: "Dual Track" },
  { id: "dual-track-highlight", label: "Highlight" },
];

const guideStyles = ["solid", "dashed"] as const;

type CompareGuides = NonNullable<CompareTimelineData["guides"]>;
type CompareStyle = NonNullable<CompareTimelineData["style"]>;

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
    </div>
  );
}

export function CompareTimelineWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const updateAxisLabel = (index: number, label: string) => {
    const steps = [...value.axis.steps];
    steps[index] = { ...steps[index], label };
    onChange({ ...value, axis: { ...value.axis, steps } });
  };

  const updateTrackLabel = (index: number, label: string) => {
    const tracks = [...value.tracks];
    tracks[index] = { ...tracks[index], label };
    onChange({ ...value, tracks });
  };

  return (
    <div className="space-y-4">
      <CompareVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Axis labels</p>
        <div className="space-y-2">
          {value.axis.steps.slice(0, 3).map((step, index) => (
            <Input
              key={`${step.label}-${index}`}
              value={step.label}
              onChange={(event) => updateAxisLabel(index, event.target.value)}
              placeholder={`Step ${index + 1}`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Track labels</p>
        <div className="space-y-2">
          {value.tracks.slice(0, 2).map((track, index) => (
            <Input
              key={track.id}
              value={track.label}
              onChange={(event) => updateTrackLabel(index, event.target.value)}
              placeholder={`Track ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CompareTimelineVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const updateStyle = (patch: Partial<CompareStyle>) =>
    onChange({ ...value, style: { ...value.style, ...patch } });

  return (
    <div className="space-y-4">
      <CompareVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Highlight color</p>
        <Input
          value={value.style?.highlightColor ?? ""}
          onChange={(event) => updateStyle({ highlightColor: event.target.value })}
          placeholder="e.g. amber"
        />
      </div>
    </div>
  );
}

export function CompareTimelineAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const updateGuides = (patch: Partial<CompareGuides>) =>
    onChange({ ...value, guides: { ...value.guides, ...patch } });
  const updateStyle = (patch: Partial<CompareStyle>) =>
    onChange({ ...value, style: { ...value.style, ...patch } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show guides</p>
          <p className="text-xs text-muted-foreground">
            Highlight process steps across tracks.
          </p>
        </div>
        <Switch
          checked={value.guides?.enabled ?? false}
          onCheckedChange={(checked) => updateGuides({ enabled: checked })}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Guide style</p>
        <Select
          value={value.guides?.style ?? "dashed"}
          onValueChange={(next) =>
            updateGuides({ style: next as CompareGuides["style"] })
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
        <p className="text-sm font-medium">Highlight color</p>
        <Input
          value={value.style?.highlightColor ?? ""}
          onChange={(event) => updateStyle({ highlightColor: event.target.value })}
          placeholder="accent"
        />
      </div>
    </div>
  );
}
