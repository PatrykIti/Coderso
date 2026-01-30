import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { TimelineData } from "../../../../widgets/core/timeline";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
  { id: "milestones", label: "Milestones" },
  { id: "cards", label: "Cards" },
  { id: "compact", label: "Compact" },
];

const orientationOptions = ["horizontal", "vertical"] as const;
const alignOptions = ["start", "center", "end"] as const;
const labelPositionOptions = ["top", "bottom"] as const;
const lineStyleOptions = ["solid", "dashed"] as const;
const markerSizeOptions = ["sm", "md", "lg"] as const;

type TimelineLayout = NonNullable<TimelineData["layout"]>;
type TimelineGuides = NonNullable<TimelineData["guides"]>;
type TimelineStyle = NonNullable<TimelineData["style"]>;

function TimelineVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Timeline style</p>
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

export function TimelineWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TimelineData>) {
  const updateStep = (index: number, title: string) => {
    const steps = [...value.steps];
    steps[index] = { ...steps[index], title };
    onChange({ ...value, steps });
  };

  return (
    <div className="space-y-4">
      <TimelineVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Step titles</p>
        <div className="space-y-2">
          {value.steps.slice(0, 3).map((step, index) => (
            <Input
              key={`${step.title}-${index}`}
              value={step.title}
              onChange={(event) => updateStep(index, event.target.value)}
              placeholder={`Step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimelineVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TimelineData>) {
  const updateStepDesc = (index: number, description: string) => {
    const steps = [...value.steps];
    steps[index] = { ...steps[index], description };
    onChange({ ...value, steps });
  };

  return (
    <div className="space-y-4">
      <TimelineVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Step descriptions</p>
        <div className="space-y-2">
          {value.steps.slice(0, 3).map((step, index) => (
            <Input
              key={`${step.title}-${index}`}
              value={step.description ?? ""}
              onChange={(event) => updateStepDesc(index, event.target.value)}
              placeholder="Short summary"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimelineAdvancedEditor({ value, onChange }: WidgetEditorProps<TimelineData>) {
  const updateLayout = (patch: Partial<TimelineLayout>) =>
    onChange({ ...value, layout: { ...value.layout, ...patch } });
  const updateGuides = (patch: Partial<TimelineGuides>) =>
    onChange({ ...value, guides: { ...value.guides, ...patch } });
  const updateStyle = (patch: Partial<TimelineStyle>) =>
    onChange({ ...value, style: { ...value.style, ...patch } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Orientation</p>
        <Select
          value={value.layout?.orientation ?? "horizontal"}
          onValueChange={(next) =>
            updateLayout({ orientation: next as TimelineLayout["orientation"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Orientation" />
          </SelectTrigger>
          <SelectContent>
            {orientationOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={value.layout?.align ?? "center"}
            onValueChange={(next) => updateLayout({ align: next as TimelineLayout["align"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
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
            value={value.layout?.labelPosition ?? "top"}
            onValueChange={(next) =>
              updateLayout({ labelPosition: next as TimelineLayout["labelPosition"] })
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
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show guide lines</p>
          <p className="text-xs text-muted-foreground">
            Display helper lines across the timeline.
          </p>
        </div>
        <Switch
          checked={value.guides?.enabled ?? false}
          onCheckedChange={(checked) => updateGuides({ enabled: checked })}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Line style</p>
          <Select
            value={value.style?.lineStyle ?? "solid"}
            onValueChange={(next) =>
              updateStyle({ lineStyle: next as TimelineStyle["lineStyle"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Line style" />
            </SelectTrigger>
            <SelectContent>
              {lineStyleOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Marker size</p>
          <Select
            value={value.style?.markerSize ?? "md"}
            onValueChange={(next) =>
              updateStyle({ markerSize: next as TimelineStyle["markerSize"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Marker size" />
            </SelectTrigger>
            <SelectContent>
              {markerSizeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
