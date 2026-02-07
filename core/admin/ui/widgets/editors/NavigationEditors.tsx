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

const variantSupportsCta = (variant: string) =>
  variant === "with-cta" || variant === "split";

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

  const updateLogo = (patch: Partial<NavigationData["logo"]>) =>
    update({ logo: { ...value.logo, ...patch } });

  const updateLogoType = (type: NavigationData["logo"]["type"]) => {
    const currentValue = value.logo?.value ?? "";
    const nextValue =
      type === "text"
        ? value.logo?.type === "text"
          ? currentValue
          : "Nextless"
        : value.logo?.type === "image"
          ? currentValue
          : "";
    updateLogo({ type, value: nextValue });
  };

  const updateItem = (
    index: number,
    patch: Partial<NavigationData["items"][number]>
  ) => {
    const items = [...value.items];
    items[index] = { ...items[index], ...patch };
    update({ items });
  };

  const showCtaFields = variantSupportsCta(variant);

  return (
    <div className="space-y-4">
      <NavigationVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Logo type</p>
        <Select value={value.logo?.type ?? "text"} onValueChange={updateLogoType}>
          <SelectTrigger>
            <SelectValue placeholder="Choose logo type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text logo</SelectItem>
            <SelectItem value="image">Image logo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {value.logo?.type === "image" ? "Logo image URL" : "Logo text"}
        </p>
        <Input
          value={value.logo?.value ?? ""}
          onChange={(event) => updateLogo({ value: event.target.value })}
          placeholder={value.logo?.type === "image" ? "https://..." : "Nextless"}
        />
        {value.logo?.type === "image" ? (
          <Input
            value={value.logo?.alt ?? ""}
            onChange={(event) => updateLogo({ alt: event.target.value })}
            placeholder="Logo alt text"
          />
        ) : null}
        <Input
          value={value.logo?.href ?? ""}
          onChange={(event) => updateLogo({ href: event.target.value })}
          placeholder="Logo link (e.g. /)"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Menu items</p>
        <div className="space-y-2">
          {value.items.slice(0, 3).map((item, index) => (
            <div key={`${item.href || item.label}-${index}`} className="grid gap-2 sm:grid-cols-2">
              <Input
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                placeholder={`Item ${index + 1} label`}
              />
              <Input
                value={item.href}
                onChange={(event) => updateItem(index, { href: event.target.value })}
                placeholder={`/${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              />
            </div>
          ))}
        </div>
      </div>
      {showCtaFields ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA</p>
          <Input
            value={value.cta?.label ?? ""}
            onChange={(event) =>
              update({
                cta: {
                  ...value.cta,
                  label: event.target.value,
                  href: value.cta?.href ?? "",
                },
              })
            }
            placeholder="Get started"
          />
          <Input
            value={value.cta?.href ?? ""}
            onChange={(event) =>
              update({
                cta: {
                  ...value.cta,
                  label: value.cta?.label ?? "",
                  href: event.target.value,
                },
              })
            }
            placeholder="/start"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          The Simple variant hides CTA in runtime output.
        </p>
      )}
    </div>
  );
}

export function NavigationVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<NavigationData>) {
  const updateLayout = (patch: Partial<NavigationLayout>) =>
    onChange({ ...value, layout: { ...value.layout, ...patch } });
  const updateBehavior = (patch: Partial<NavigationBehavior>) =>
    onChange({ ...value, behavior: { ...value.behavior, ...patch } });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Visual mode focuses on runtime look and behavior. Edit labels and links in
        Wizard, and detailed behavior in Advanced.
      </div>
      <NavigationVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Menu alignment</p>
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
              Keep navigation pinned while scrolling.
            </p>
          </div>
          <Switch
            checked={value.behavior?.sticky ?? false}
            onCheckedChange={(checked) => updateBehavior({ sticky: checked })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Transparent header</p>
            <p className="text-xs text-muted-foreground">
              Remove default background to overlay top content.
            </p>
          </div>
          <Switch
            checked={value.behavior?.transparent ?? false}
            onCheckedChange={(checked) => updateBehavior({ transparent: checked })}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {variantSupportsCta(variant)
          ? "CTA content is configured in Wizard and rendered on the right side."
          : "Simple variant does not render CTA."}
      </p>
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
  const updateItem = (
    index: number,
    patch: Partial<NavigationData["items"][number]>
  ) => {
    const items = [...value.items];
    items[index] = { ...items[index], ...patch };
    onChange({ ...value, items });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">All menu items</p>
        <div className="space-y-2">
          {value.items.map((item, index) => (
            <div key={`${item.href || item.label}-${index}`} className="grid gap-2 sm:grid-cols-2">
              <Input
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                placeholder={`Item ${index + 1} label`}
              />
              <Input
                value={item.href}
                onChange={(event) => updateItem(index, { href: event.target.value })}
                placeholder="https://..."
              />
            </div>
          ))}
        </div>
      </div>
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
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Collapse on scroll</p>
            <p className="text-xs text-muted-foreground">
              Store collapse intent for runtime integrations.
            </p>
          </div>
          <Switch
            checked={value.behavior?.collapseOnScroll ?? false}
            onCheckedChange={(checked) => updateBehavior({ collapseOnScroll: checked })}
          />
        </div>
      </div>
    </div>
  );
}
