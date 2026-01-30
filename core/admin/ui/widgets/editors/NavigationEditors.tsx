import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { NavigationData } from "../../../../widgets/core/navigation";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
  { id: "simple", label: "Simple" },
  { id: "with-cta", label: "With CTA" },
  { id: "split", label: "Split" },
];

const alignmentOptions = ["left", "center", "right"] as const;

type NavigationLayout = NonNullable<NavigationData["layout"]>;
type NavigationBehavior = NonNullable<NavigationData["behavior"]>;

function NavigationVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Navigation style</p>
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

export function NavigationWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<NavigationData>) {
  const update = (patch: Partial<NavigationData>) => onChange({ ...value, ...patch });

  const updateItem = (index: number, label: string) => {
    const items = [...value.items];
    items[index] = { ...items[index], label };
    update({ items });
  };

  return (
    <div className="space-y-4">
      <NavigationVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Logo text</p>
        <Input
          value={value.logo?.value ?? ""}
          onChange={(event) =>
            update({ logo: { ...value.logo, type: "text", value: event.target.value } })
          }
          placeholder="Nextless"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Menu items</p>
        <div className="space-y-2">
          {value.items.slice(0, 3).map((item, index) => (
            <Input
              key={item.href}
              value={item.label}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={`Item ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NavigationVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<NavigationData>) {
  const update = (patch: Partial<NavigationData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <NavigationVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Primary CTA</p>
        <Input
          value={value.cta?.label ?? ""}
          onChange={(event) =>
            update({ cta: { ...value.cta, label: event.target.value, href: value.cta?.href ?? "" } })
          }
          placeholder="Get started"
        />
        <Input
          value={value.cta?.href ?? ""}
          onChange={(event) =>
            update({ cta: { ...value.cta, href: event.target.value, label: value.cta?.label ?? "" } })
          }
          placeholder="/start"
        />
      </div>
    </div>
  );
}

export function NavigationAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<NavigationData>) {
  const updateLayout = (patch: Partial<NavigationLayout>) =>
    onChange({ ...value, layout: { ...value.layout, ...patch } });
  const updateBehavior = (patch: Partial<NavigationBehavior>) =>
    onChange({ ...value, behavior: { ...value.behavior, ...patch } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Alignment</p>
        <Select
          value={value.layout?.alignment ?? "left"}
          onValueChange={(next) =>
            updateLayout({ alignment: next as NavigationLayout["alignment"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Alignment" />
          </SelectTrigger>
          <SelectContent>
            {alignmentOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Sticky navigation</p>
            <p className="text-xs text-muted-foreground">
              Keep menu visible while scrolling.
            </p>
          </div>
          <Switch
            checked={value.behavior?.sticky ?? false}
            onCheckedChange={(checked) => updateBehavior({ sticky: checked })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Transparent on top</p>
            <p className="text-xs text-muted-foreground">
              Render the menu over the hero section.
            </p>
          </div>
          <Switch
            checked={value.behavior?.transparent ?? false}
            onCheckedChange={(checked) => updateBehavior({ transparent: checked })}
          />
        </div>
      </div>
    </div>
  );
}
