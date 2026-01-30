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

import type { HeroData } from "../../../../widgets/core/hero";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
  { id: "centered", label: "Centered" },
  { id: "split", label: "Split" },
  { id: "media-left", label: "Media Left" },
];

const alignOptions = ["left", "center", "right"] as const;
const maxWidthOptions = ["sm", "md", "lg", "xl"] as const;
type HeroAlign = NonNullable<HeroData["layout"]>["align"];
type HeroMaxWidth = NonNullable<HeroData["layout"]>["maxWidth"];

function HeroVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Hero layout</p>
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose layout" />
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

export function HeroWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<HeroData>) {
  const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });
  const primary = value.primaryCta ?? { label: "", href: "" };

  return (
    <div className="space-y-4">
      <HeroVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Headline</p>
        <Input
          value={value.headline}
          onChange={(event) => update({ headline: event.target.value })}
          placeholder="Build with confidence"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Subhead</p>
        <Textarea
          value={value.subhead ?? ""}
          onChange={(event) => update({ subhead: event.target.value })}
          placeholder="Short supporting message"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA Label</p>
          <Input
            value={primary.label}
            onChange={(event) =>
              update({ primaryCta: { ...primary, label: event.target.value } })
            }
            placeholder="Get started"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA URL</p>
          <Input
            value={primary.href}
            onChange={(event) =>
              update({ primaryCta: { ...primary, href: event.target.value } })
            }
            placeholder="/start"
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show media</p>
          <p className="text-xs text-muted-foreground">
            Enable image or video alongside the hero.
          </p>
        </div>
        <Switch
          checked={value.media?.type !== "none"}
          onCheckedChange={(checked) =>
            update({ media: { ...value.media, type: checked ? "image" : "none" } })
          }
        />
      </div>
    </div>
  );
}

export function HeroVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<HeroData>) {
  const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });
  const secondary = value.secondaryCta ?? { label: "", href: "" };

  return (
    <div className="space-y-4">
      <HeroVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Body text</p>
        <Textarea
          value={value.body ?? ""}
          onChange={(event) => update({ body: event.target.value })}
          placeholder="Explain the key benefit."
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary CTA Label</p>
          <Input
            value={secondary.label}
            onChange={(event) =>
              update({ secondaryCta: { ...secondary, label: event.target.value } })
            }
            placeholder="Learn more"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Secondary CTA URL</p>
          <Input
            value={secondary.href}
            onChange={(event) =>
              update({ secondaryCta: { ...secondary, href: event.target.value } })
            }
            placeholder="/learn"
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Media URL</p>
        <Input
          value={value.media?.src ?? ""}
          onChange={(event) =>
            update({ media: { ...value.media, type: "image", src: event.target.value } })
          }
          placeholder="https://"
        />
      </div>
    </div>
  );
}

export function HeroAdvancedEditor({ value, onChange }: WidgetEditorProps<HeroData>) {
  const updateLayout = (patch: Partial<HeroData["layout"]>) =>
    onChange({ ...value, layout: { ...value.layout, ...patch } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Alignment</p>
        <Select
          value={value.layout?.align ?? "center"}
          onValueChange={(next) => updateLayout({ align: next as HeroAlign })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select alignment" />
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
        <p className="text-sm font-medium">Max width</p>
        <Select
          value={value.layout?.maxWidth ?? "xl"}
          onValueChange={(next) => updateLayout({ maxWidth: next as HeroMaxWidth })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select width" />
          </SelectTrigger>
          <SelectContent>
            {maxWidthOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
