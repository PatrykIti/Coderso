import { useRef, useState, type ReactNode } from "react";

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
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { listMedia } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import {
  navigationDefaults,
  type NavigationData,
} from "../../../../widgets/core/navigation";
import type { WidgetEditorProps } from "../../../../widgets/types";

type NavigationLayout = NonNullable<NavigationData["layout"]>;
type NavigationBehavior = NonNullable<NavigationData["behavior"]>;
type NavigationStyle = NonNullable<NavigationData["style"]>;
type NavigationLogo = NavigationData["logo"];
type NavigationItem = NavigationData["items"][number];
type NavigationChild = NonNullable<NavigationItem["children"]>[number];

const variantOptions = [
  {
    id: "simple",
    label: "Simple",
    description: "Logo and links with no CTA.",
  },
  {
    id: "with-cta",
    label: "With CTA",
    description: "Logo, links, and right-side CTA button.",
  },
  {
    id: "split",
    label: "Split",
    description: "Centered links with right-side actions and CTA.",
  },
] as const;

const linkSourceOptions = [
  { id: "manual", label: "Manual links" },
  { id: "menu", label: "Menu key (planned integration)" },
] as const;

const logoSourceOptions = [
  { id: "external", label: "External URL" },
  { id: "library", label: "Media library" },
] as const;

const alignmentOptions = ["left", "center", "right"] as const;
const maxWidthOptions = ["5xl", "6xl", "7xl"] as const;
const paddingYOptions = ["2", "3", "4", "5"] as const;
const itemGapOptions = ["2", "3", "4", "6"] as const;
const mobileModeOptions = [
  { id: "expanded", label: "Expanded links on mobile" },
  { id: "drawer", label: "Compact menu button on mobile" },
  { id: "minimal", label: "Minimal header on mobile" },
] as const;
const borderWidthOptions = ["0", "1", "2", "3"] as const;
const fontSizeOptions = ["xs", "sm", "base", "lg"] as const;
const fontWeightOptions = ["normal", "medium", "semibold", "bold"] as const;
const textTransformOptions = ["none", "uppercase", "capitalize"] as const;
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const variantSupportsCta = (variant: string) =>
  variant === "with-cta" || variant === "split";

const isValidHref = (value: string | undefined) =>
  !value || value.startsWith("/") || value.startsWith("http");

const isValidImageUrl = (value: string | undefined) =>
  !value || value.startsWith("http") || value.startsWith("/");

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

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
    <section className="rounded-lg border border-border/70 bg-background/50 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback = "#111827",
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
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

function NavigationLogoSourceFields({
  logo,
  onChange,
}: {
  logo: NavigationLogo;
  onChange: (patch: Partial<NavigationLogo>) => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const source = logo.source ?? "external";

  const handleSourceChange = (next: "external" | "library") => {
    requestIdRef.current += 1;
    setLookupError(null);
    if (next === "library") {
      onChange({ source: next, assetId: undefined, value: "" });
      return;
    }
    onChange({ source: next, assetId: undefined });
  };

  const handleAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ assetId: undefined, value: "" });
      return;
    }
    onChange({ assetId, source: "library" });
    setLookupError(null);
    try {
      const items = await listMedia();
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (!match) {
        setLookupError("Selected media could not be resolved.");
        return;
      }
      onChange({
        assetId,
        source: "library",
        value: match.url,
        alt:
          logo.alt && logo.alt.trim().length > 0
            ? logo.alt
            : match.alt ?? match.title ?? match.originalName ?? "",
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (isApiClientError(err)) {
        setLookupError(err.message);
      } else {
        setLookupError("Failed to resolve selected logo.");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Logo source</p>
        <Select value={source} onValueChange={(next) => handleSourceChange(next as "external" | "library")}>
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {logoSourceOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {source === "library" ? (
        <div className="space-y-2">
          <MediaPicker
            value={logo.assetId ?? null}
            onChange={(value) => void handleAssetChange(value)}
            multiple={false}
            accept={["image/*"]}
          />
          {lookupError ? (
            <p className="text-xs text-destructive">{lookupError}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Logo image URL</p>
          <Input
            value={logo.value ?? ""}
            onChange={(event) => onChange({ value: event.target.value })}
            placeholder="https://..."
          />
          {!isValidImageUrl(logo.value) ? (
            <p className="text-xs text-destructive">
              Use a relative path or full URL.
            </p>
          ) : null}
        </div>
      )}
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
  const logo: NavigationLogo = {
    source: "external",
    ...value.logo,
  };
  const linksSource = value.linksSource ?? "manual";
  const items = value.items.length > 0 ? value.items : navigationDefaults.items;
  const ctaEnabled = variantSupportsCta(variant);

  const updateLogo = (patch: Partial<NavigationLogo>) =>
    update({
      logo: {
        source: "external",
        ...value.logo,
        ...patch,
      },
    });

  const updateItem = (index: number, patch: Partial<NavigationItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    update({ items: next });
  };

  return (
    <div className="space-y-4">
      <NavigationVariantSelect value={variant} onChange={onVariantChange} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Links source</p>
        <Select
          value={linksSource}
          onValueChange={(next) =>
            update({
              linksSource: next as NavigationData["linksSource"],
              menuKey: next === "menu" ? value.menuKey ?? "main" : undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select links source" />
          </SelectTrigger>
          <SelectContent>
            {linkSourceOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {linksSource === "menu" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Menu key</p>
          <Input
            value={value.menuKey ?? ""}
            onChange={(event) => update({ menuKey: event.target.value })}
            placeholder="main"
          />
          <p className="text-xs text-muted-foreground">
            Runtime menu resolver will use this key when menu integration is enabled.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Quick links</p>
          <div className="space-y-2">
            {items.slice(0, 3).map((item, index) => (
              <div key={`${item.href || item.label}-${index}`} className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={item.label}
                  onChange={(event) => updateItem(index, { label: event.target.value })}
                  placeholder={`Item ${index + 1} label`}
                />
                <Input
                  value={item.href}
                  onChange={(event) => updateItem(index, { href: event.target.value })}
                  placeholder="/path"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Logo type</p>
        <Select
          value={logo.type}
          onValueChange={(next) =>
            updateLogo({
              type: next as NavigationLogo["type"],
              value: next === "text" ? logo.value || "Nextless" : logo.value,
            })
          }
        >
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
        {logo.type === "text" ? (
          <>
            <p className="text-sm font-medium">Logo text</p>
            <Input
              value={logo.value}
              onChange={(event) => updateLogo({ value: event.target.value })}
              placeholder="Nextless"
            />
          </>
        ) : (
          <NavigationLogoSourceFields logo={logo} onChange={updateLogo} />
        )}
        <Input
          value={logo.href ?? ""}
          onChange={(event) => updateLogo({ href: event.target.value })}
          placeholder="Logo link (e.g. /)"
        />
        {logo.type === "image" ? (
          <Input
            value={logo.alt ?? ""}
            onChange={(event) => updateLogo({ alt: event.target.value })}
            placeholder="Logo alt text"
          />
        ) : null}
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">CTA enabled</p>
            <p className="text-xs text-muted-foreground">
              Toggle CTA capability for this navigation variant.
            </p>
          </div>
          <Switch
            checked={ctaEnabled}
            onCheckedChange={(checked) => {
              if (checked && !variantSupportsCta(variant)) {
                onVariantChange?.("with-cta");
              }
              if (!checked && variantSupportsCta(variant)) {
                onVariantChange?.("simple");
              }
            }}
          />
        </div>
      </div>

      {ctaEnabled ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Primary CTA</p>
          <Input
            value={value.cta?.label ?? ""}
            onChange={(event) =>
              update({
                cta: {
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
          Simple variant hides CTA in runtime output.
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
  const update = (patch: Partial<NavigationData>) => onChange({ ...value, ...patch });
  const logo: NavigationLogo = { source: "external", ...value.logo };
  const linksSource = value.linksSource ?? "manual";
  const items = value.items.length > 0 ? value.items : navigationDefaults.items;
  const behavior: NavigationBehavior = {
    mobileMode: "expanded",
    hideCtaOnMobile: false,
    ...value.behavior,
  };
  const style: NavigationStyle = { ...value.style };
  const ctaEnabled = variantSupportsCta(variant);

  const updateLogo = (patch: Partial<NavigationLogo>) =>
    update({
      logo: {
        source: "external",
        ...value.logo,
        ...patch,
      },
    });

  const updateStyle = (patch: Partial<NavigationStyle>) =>
    update({
      style: {
        ...value.style,
        ...patch,
      },
    });

  const updateBehavior = (patch: Partial<NavigationBehavior>) =>
    update({
      behavior: {
        ...value.behavior,
        ...patch,
      },
    });

  const updateItem = (index: number, patch: Partial<NavigationItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    update({ items: next });
  };

  const removeItem = (index: number) => {
    if (items.length <= 2) return;
    update({
      items: items.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const addItem = () => {
    if (items.length >= 8) return;
    update({
      items: [...items, { label: `Item ${items.length + 1}`, href: "/" }],
    });
  };

  const addChild = (itemIndex: number) => {
    const next = [...items];
    const currentChildren = next[itemIndex].children ?? [];
    next[itemIndex] = {
      ...next[itemIndex],
      children: [...currentChildren, { label: "Sub-link", href: "/" }],
    };
    update({ items: next });
  };

  const updateChild = (
    itemIndex: number,
    childIndex: number,
    patch: Partial<NavigationChild>
  ) => {
    const next = [...items];
    const currentChildren = next[itemIndex].children ?? [];
    currentChildren[childIndex] = {
      ...currentChildren[childIndex],
      ...patch,
    };
    next[itemIndex] = {
      ...next[itemIndex],
      children: currentChildren,
    };
    update({ items: next });
  };

  const removeChild = (itemIndex: number, childIndex: number) => {
    const next = [...items];
    const currentChildren = next[itemIndex].children ?? [];
    next[itemIndex] = {
      ...next[itemIndex],
      children: currentChildren.filter((_, currentIndex) => currentIndex !== childIndex),
    };
    update({ items: next });
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and Structure"
        description="Choose navigation structure and source strategy."
      >
        <div className="space-y-2">
          {variantOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onVariantChange?.(option.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition",
                variant === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold leading-tight">
                  {option.label}
                </p>
                <Badge
                  className="shrink-0"
                  variant={variant === option.id ? "default" : "outline"}
                >
                  {variant === option.id ? "Selected" : "Pick"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Links source</p>
          <Select
            value={linksSource}
            onValueChange={(next) =>
              update({
                linksSource: next as NavigationData["linksSource"],
                menuKey: next === "menu" ? value.menuKey ?? "main" : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select links source" />
            </SelectTrigger>
            <SelectContent>
              {linkSourceOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {linksSource === "menu" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Menu key</p>
            <Input
              value={value.menuKey ?? ""}
              onChange={(event) => update({ menuKey: event.target.value })}
              placeholder="main"
            />
          </div>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Brand and Logo"
        description="Configure brand mark and destination link."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Logo type</p>
          <Select
            value={logo.type}
            onValueChange={(next) =>
              updateLogo({
                type: next as NavigationLogo["type"],
                value: next === "text" ? logo.value || "Nextless" : logo.value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose logo type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text logo</SelectItem>
              <SelectItem value="image">Image logo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {logo.type === "text" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Logo text</p>
            <Input
              value={logo.value}
              onChange={(event) => updateLogo({ value: event.target.value })}
              placeholder="Nextless"
            />
          </div>
        ) : (
          <NavigationLogoSourceFields logo={logo} onChange={updateLogo} />
        )}

        <Input
          value={logo.href ?? ""}
          onChange={(event) => updateLogo({ href: event.target.value })}
          placeholder="Logo link (e.g. /)"
        />
        {logo.type === "image" ? (
          <Input
            value={logo.alt ?? ""}
            onChange={(event) => updateLogo({ alt: event.target.value })}
            placeholder="Logo alt text"
          />
        ) : null}
      </EditorSection>

      <EditorSection
        title="Navigation Links"
        description="Edit labels, URLs, and first-level dropdown links."
      >
        {linksSource === "menu" ? (
          <p className="text-xs text-muted-foreground">
            This variant is configured to resolve links by menu key.
            Manual links remain as fallback data.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={`${item.href || item.label}-${index}`}
                  className="rounded-md border border-border/70 p-3"
                >
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <Input
                      value={item.label}
                      onChange={(event) =>
                        updateItem(index, { label: event.target.value })
                      }
                      placeholder={`Item ${index + 1} label`}
                    />
                    <Input
                      value={item.href}
                      onChange={(event) =>
                        updateItem(index, { href: event.target.value })
                      }
                      placeholder="/path"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={items.length <= 2}
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </Button>
                  </div>
                  {!isValidHref(item.href) ? (
                    <p className="mt-2 text-xs text-destructive">
                      Use a relative path or full URL.
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Sub-links
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addChild(index)}
                      >
                        Add sub-link
                      </Button>
                    </div>
                    {(item.children ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No sub-links yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(item.children ?? []).map((child, childIndex) => (
                          <div
                            key={`${child.href || child.label}-${childIndex}`}
                            className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                          >
                            <Input
                              value={child.label}
                              onChange={(event) =>
                                updateChild(index, childIndex, {
                                  label: event.target.value,
                                })
                              }
                              placeholder="Sub-link label"
                            />
                            <Input
                              value={child.href}
                              onChange={(event) =>
                                updateChild(index, childIndex, {
                                  href: event.target.value,
                                })
                              }
                              placeholder="/path"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeChild(index, childIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={items.length >= 8}
              className="w-full"
            >
              Add link item
            </Button>
          </>
        )}
      </EditorSection>

      <EditorSection
        title="CTA and Right Actions"
        description="Configure CTA copy and mix it with slot content on the right."
      >
        {ctaEnabled ? (
          <div className="space-y-2">
            <Input
              value={value.cta?.label ?? ""}
              onChange={(event) =>
                update({
                  cta: {
                    label: event.target.value,
                    href: value.cta?.href ?? "",
                  },
                })
              }
              placeholder="CTA label"
            />
            <Input
              value={value.cta?.href ?? ""}
              onChange={(event) =>
                update({
                  cta: {
                    label: value.cta?.label ?? "",
                    href: event.target.value,
                  },
                })
              }
              placeholder="/start"
            />
            {!isValidHref(value.cta?.href) ? (
              <p className="text-xs text-destructive">
                Use a relative path or full URL.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            CTA is disabled for the Simple variant.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Use `Right Actions` slot to insert extra widgets like login buttons or language switchers.
        </p>
      </EditorSection>

      <EditorSection
        title="Mobile Behavior"
        description="Control how navigation behaves on small devices."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Mobile mode</p>
          <Select
            value={behavior.mobileMode ?? "expanded"}
            onValueChange={(next) =>
              updateBehavior({
                mobileMode: next as NavigationBehavior["mobileMode"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mobile mode" />
            </SelectTrigger>
            <SelectContent>
              {mobileModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Hide CTA on mobile</p>
            <p className="text-xs text-muted-foreground">
              Keep CTA visible only on tablet/desktop.
            </p>
          </div>
          <Switch
            checked={behavior.hideCtaOnMobile ?? false}
            onCheckedChange={(checked) =>
              updateBehavior({ hideCtaOnMobile: checked })
            }
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Colors, Borders, Typography"
        description="Tune visual style for links, brand and CTA."
      >
        <ColorField
          label="Surface color"
          value={style.surfaceColor}
          onChange={(next) => updateStyle({ surfaceColor: next })}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Border color"
          value={style.borderColor}
          onChange={(next) => updateStyle({ borderColor: next })}
          placeholder="#e2e8f0"
          pickerFallback="#e2e8f0"
        />
        <ColorField
          label="Text color"
          value={style.textColor}
          onChange={(next) => updateStyle({ textColor: next })}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Logo color"
          value={style.logoColor}
          onChange={(next) => updateStyle({ logoColor: next })}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Link color"
          value={style.linkColor}
          onChange={(next) => updateStyle({ linkColor: next })}
          placeholder="#334155"
          pickerFallback="#334155"
        />
        <ColorField
          label="CTA background"
          value={style.ctaBackgroundColor}
          onChange={(next) => updateStyle({ ctaBackgroundColor: next })}
          placeholder="#1d4ed8"
          pickerFallback="#1d4ed8"
        />
        <ColorField
          label="CTA text color"
          value={style.ctaTextColor}
          onChange={(next) => updateStyle({ ctaTextColor: next })}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="CTA border color"
          value={style.ctaBorderColor}
          onChange={(next) => updateStyle({ ctaBorderColor: next })}
          placeholder="#1d4ed8"
          pickerFallback="#1d4ed8"
        />

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Border width</p>
            <Select
              value={style.borderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle({ borderWidth: next as NavigationStyle["borderWidth"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Font size</p>
            <Select
              value={style.fontSize ?? "sm"}
              onValueChange={(next) =>
                updateStyle({ fontSize: next as NavigationStyle["fontSize"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Font size" />
              </SelectTrigger>
              <SelectContent>
                {fontSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Font weight</p>
            <Select
              value={style.fontWeight ?? "medium"}
              onValueChange={(next) =>
                updateStyle({ fontWeight: next as NavigationStyle["fontWeight"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Font weight" />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Text transform</p>
            <Select
              value={style.textTransform ?? "none"}
              onValueChange={(next) =>
                updateStyle({ textTransform: next as NavigationStyle["textTransform"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Text transform" />
              </SelectTrigger>
              <SelectContent>
                {textTransformOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Surface and Runtime Behavior"
        description="Control overlay behavior on top of hero sections."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Transparent surface</p>
            <p className="text-xs text-muted-foreground">
              Ignore surface color and render transparent background.
            </p>
          </div>
          <Switch
            checked={behavior.transparent ?? false}
            onCheckedChange={(checked) => updateBehavior({ transparent: checked })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Sticky and collapse behavior are in Advanced because they are technical runtime toggles.
        </p>
      </EditorSection>
    </div>
  );
}

export function NavigationAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<NavigationData>) {
  const updateLayout = (patch: Partial<NavigationLayout>) =>
    onChange({
      ...value,
      layout: {
        ...value.layout,
        ...patch,
      },
    });
  const updateBehavior = (patch: Partial<NavigationBehavior>) =>
    onChange({
      ...value,
      behavior: {
        ...value.behavior,
        ...patch,
      },
    });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-background/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Layout Tokens
        </p>
        <div className="mt-3 space-y-3">
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

          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Max width</p>
              <Select
                value={value.layout?.maxWidth ?? "6xl"}
                onValueChange={(next) =>
                  updateLayout({ maxWidth: next as NavigationLayout["maxWidth"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Max width" />
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
            <div className="space-y-2">
              <p className="text-sm font-medium">Vertical padding</p>
              <Select
                value={value.layout?.paddingY ?? "4"}
                onValueChange={(next) =>
                  updateLayout({ paddingY: next as NavigationLayout["paddingY"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Padding Y" />
                </SelectTrigger>
                <SelectContent>
                  {paddingYOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Links gap</p>
              <Select
                value={value.layout?.itemGap ?? "4"}
                onValueChange={(next) =>
                  updateLayout({ itemGap: next as NavigationLayout["itemGap"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Gap" />
                </SelectTrigger>
                <SelectContent>
                  {itemGapOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-background/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Runtime Behavior
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Sticky navigation</p>
              <p className="text-xs text-muted-foreground">
                Pin navigation to top during scroll.
              </p>
            </div>
            <Switch
              checked={value.behavior?.sticky ?? false}
              onCheckedChange={(checked) => updateBehavior({ sticky: checked })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Collapse on scroll</p>
              <p className="text-xs text-muted-foreground">
                Store collapse intent for runtime integration.
              </p>
            </div>
            <Switch
              checked={value.behavior?.collapseOnScroll ?? false}
              onCheckedChange={(checked) =>
                updateBehavior({ collapseOnScroll: checked })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
