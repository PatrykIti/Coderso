import { useEffect, useRef, useState, type ReactNode } from "react";

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
import { listMediaCached } from "@/services/mediaClient";
import { listPagesCached } from "@/services/pagesClient";
import {
  getMenuWithItems,
  listMenus,
  type MenuItemNode,
  type MenuSummary,
} from "@/services/menusClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import {
  collectNavigationMenuPageIds,
  mapMenuNodesToNavigationItems as mapNavigationMenuNodesToNavigationItems,
} from "../../../../services/navigation/navigationMenuMapping";

import {
  navigationDefaults,
  navigationMobileModeIds,
  navigationVariantIds,
  type NavigationActiveLinkMode,
  type NavigationBadgeTone,
  type NavigationData,
  type NavigationItemMeta,
  type NavigationLinkTarget,
} from "../../../../widgets/core/navigation";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

type NavigationLayout = NonNullable<NavigationData["layout"]>;
type NavigationBehavior = NonNullable<NavigationData["behavior"]>;
type NavigationStyle = NonNullable<NavigationData["style"]>;
type NavigationLogo = NavigationData["logo"];
type NavigationItem = NavigationData["items"][number];
type NavigationChild = NonNullable<NavigationItem["children"]>[number];
type NavigationTargetItem = NavigationItem | NavigationChild;

const variantOptionCopy: Record<
  (typeof navigationVariantIds)[number],
  { label: string; description: string }
> = {
  simple: {
    label: "Simple",
    description: "Logo and links with no CTA.",
  },
  "with-cta": {
    label: "With CTA",
    description: "Logo, links, and right-side CTA button.",
  },
  split: {
    label: "Split",
    description: "Centered links with right-side actions and CTA.",
  },
};

const variantOptions = navigationVariantIds.map((id) => ({
  id,
  ...variantOptionCopy[id],
}));

const linkSourceOptions = [
  { id: "manual", label: "Manual links" },
  { id: "menu", label: "Existing menu" },
  { id: "pages", label: "Pages index" },
] as const;

const alignmentOptions = ["left", "center", "right"] as const;
const maxWidthOptions = ["none", "5xl", "6xl", "7xl"] as const;
const paddingYOptions = ["none", "2", "3", "4", "5"] as const;
const itemGapOptions = ["none", "2", "3", "4", "6"] as const;
const mobileModeOptionLabels: Record<(typeof navigationMobileModeIds)[number], string> = {
  expanded: "Expanded links on mobile",
  drawer: "Compact menu button on mobile",
  minimal: "Minimal header on mobile",
};
const mobileModeOptions = navigationMobileModeIds.map((id) => ({
  id,
  label: mobileModeOptionLabels[id],
}));
const borderWidthOptions = ["0", "1", "2", "3"] as const;
const fontSizeOptions = ["none", "xs", "sm", "base", "lg"] as const;
const fontWeightOptions = ["none", "normal", "medium", "semibold", "bold"] as const;
const textTransformOptions = ["none", "uppercase", "capitalize"] as const;
const letterSpacingOptions = ["none", "wide", "wider"] as const;
const shadowOptions = ["none", "sm", "md", "lg"] as const;
const blurOptions = ["none", "sm", "md"] as const;
const dropdownDirectionOptions = ["bottom", "top", "auto"] as const;
const motionOptions = ["none", "subtle", "standard"] as const;
const logoHeightOptions = ["sm", "md", "lg", "xl"] as const;
const ctaRadiusOptions = ["sm", "md", "lg", "full"] as const;
const ctaSeparatorOptions = ["none", "line", "spacing"] as const;
const activeLinkModeOptions: Array<{ id: NavigationActiveLinkMode; label: string }> = [
  { id: "none", label: "No active state" },
  { id: "pathname", label: "Match current path" },
  { id: "exact", label: "Exact URL match" },
];
const linkTargetOptions: Array<{ id: NavigationLinkTarget; label: string }> = [
  { id: "self", label: "Same tab" },
  { id: "blank", label: "New tab" },
];
const badgeToneOptions: Array<{ id: NavigationBadgeTone; label: string }> = [
  { id: "default", label: "Default" },
  { id: "accent", label: "Accent" },
  { id: "success", label: "Success" },
  { id: "warning", label: "Warning" },
  { id: "danger", label: "Danger" },
];
const MAX_NAVIGATION_ITEMS = 8;
const MAX_NAVIGATION_CHILD_ITEMS = 6;
const NO_MENU_VALUE = "__none__";
const formatTokenOptionLabel = (option: string) => (option === "none" ? "None" : option);

const variantSupportsCta = (variant: string) => variant === "with-cta" || variant === "split";

const isValidHref = (value: string | undefined) =>
  !value ||
  value.trim().length === 0 ||
  Boolean(
    normalizeWidgetSafeHref(value, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    })
  );

const isValidImageUrl = (value: string | undefined) =>
  !value ||
  value.trim().length === 0 ||
  Boolean(
    normalizeWidgetSafeHref(value, {
      allowRelative: true,
      allowHttp: true,
    })
  );

const isHexColorValue = (value: string | undefined) =>
  !value ||
  value.trim().length === 0 ||
  value.startsWith("var(") ||
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

const createEmptyNavigationMeta = (): NavigationItemMeta => ({
  visibility: "all",
  badge: null,
  description: null,
  icon: null,
});

const createNavigationItemDraft = (label: string): NavigationItem => ({
  label,
  href: "/",
  target: "self",
});

const createNavigationChildDraft = (): NavigationChild => ({
  label: "Sub-link",
  href: "/",
  target: "self",
});

const moveArrayItem = <T,>(items: T[], index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

const mobileModeDetails: Record<
  NonNullable<NavigationBehavior["mobileMode"]>,
  { summary: string; cta: string }
> = {
  expanded: {
    summary: "Keep primary links visible on mobile and skip the drawer toggle.",
    cta: "Primary CTA stays inline unless `Hide CTA on mobile` is enabled.",
  },
  drawer: {
    summary:
      "Show a drawer toggle on mobile, keep desktop navigation unchanged, and move the primary CTA into the drawer panel on mobile.",
    cta: "Drawer mode renders one mobile CTA path inside the panel unless `Hide CTA on mobile` is enabled.",
  },
  minimal: {
    summary:
      "Keep only brand and right-side actions on mobile. No drawer toggle or mobile link panel is rendered.",
    cta: "Primary CTA may stay in the mobile header unless `Hide CTA on mobile` is enabled.",
  },
};

export function mapMenuNodesToNavigationItems(
  nodes: MenuItemNode[],
  pagePathById?: ReadonlyMap<string, string>
): NavigationItem[] {
  return mapNavigationMenuNodesToNavigationItems(nodes, pagePathById);
}

export function buildMenuSelectionPatch(
  menuId: string | undefined,
  items?: NavigationItem[]
): Partial<NavigationData> {
  return {
    menuKey: menuId,
    ...(items ? { items } : {}),
  };
}

function EditorSection({
  id,
  mode = "visual",
  role = "visual",
  title,
  description,
  children,
}: {
  id: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback = "#111827",
  onClear,
  themeDefault,
  controlPath,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
  onClear?: () => void;
  themeDefault?: string;
  controlPath?: string;
}) {
  return (
    <SharedColorControl
      controlId={controlPath ? `navigation.visual.${controlPath}` : undefined}
      controlPath={controlPath}
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
      showValueInput={false}
      treatAsThemeDefaultValues={themeDefault ? [themeDefault] : undefined}
    />
  );
}

function NavigationControlGroup({
  id,
  label,
  path,
  children,
  className,
}: {
  id: string;
  label: string;
  path: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <WidgetControlRow id={id} label={label} path={path} className={className}>
      {(fieldProps) => (
        <div
          id={fieldProps.id}
          aria-labelledby={fieldProps["aria-labelledby"]}
          aria-describedby={fieldProps["aria-describedby"]}
          className="space-y-2"
        >
          {children}
        </div>
      )}
    </WidgetControlRow>
  );
}

function NavigationDestinationFeedback({
  href,
  subject = "link",
}: {
  href: string | undefined;
  subject?: string;
}) {
  if ((href ?? "").trim().length > 0) return null;

  return (
    <p className="text-xs text-amber-700">
      This {subject} is saved in the editor but hidden from runtime until a public-safe destination
      is selected.
    </p>
  );
}

function NavigationItemPreviewList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: NavigationItem[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item.href || item.label}-${index}`}
              className="rounded-md border bg-background/70 p-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
                <span className="truncate text-xs text-muted-foreground">{item.href}</span>
              </div>
              {item.children?.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.children.length} sub-link{item.children.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationTargetField({
  value,
  onChange,
}: {
  value: NavigationLinkTarget | undefined;
  onChange: (next: NavigationLinkTarget) => void;
}) {
  return (
    <WidgetControlRow id="navigation.visual.link-target" label="Link target" path="items.target">
      {() => (
        <Select
          value={value ?? "self"}
          onValueChange={(next) => onChange(next as NavigationLinkTarget)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose target" />
          </SelectTrigger>
          <SelectContent>
            {linkTargetOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </WidgetControlRow>
  );
}

function NavigationMetadataFields({
  item,
  onChange,
}: {
  item: NavigationTargetItem;
  onChange: (patch: Partial<NavigationTargetItem>) => void;
}) {
  const meta = item.meta ?? createEmptyNavigationMeta();

  const patchMeta = (patch: Partial<NavigationItemMeta>) =>
    onChange({
      meta: {
        ...meta,
        ...patch,
      },
    });

  const patchBadge = (patch: Partial<NonNullable<NavigationItemMeta["badge"]>>) =>
    patchMeta({
      badge: {
        ...(meta.badge ?? { label: "", tone: "default" }),
        ...patch,
      },
    });

  return (
    <div className="mt-3 space-y-3 rounded-md border border-dashed border-border/70 bg-muted/15 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Link metadata
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <WidgetControlRow
          id="navigation.visual.link-meta-icon"
          label="Icon text"
          path="items.meta.icon"
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
              value={meta.icon ?? ""}
              onChange={(event) => patchMeta({ icon: event.target.value || null })}
              placeholder="sparkles"
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="navigation.visual.link-meta-description"
          label="Description"
          path="items.meta.description"
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
              value={meta.description ?? ""}
              onChange={(event) => patchMeta({ description: event.target.value || null })}
              placeholder="Helpful context under the label"
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="navigation.visual.link-meta-badge-label"
          label="Badge label"
          path="items.meta.badge.label"
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
              value={meta.badge?.label ?? ""}
              onChange={(event) => {
                const nextLabel = event.target.value;
                if (nextLabel.trim().length === 0) {
                  patchMeta({ badge: null });
                  return;
                }
                patchBadge({ label: nextLabel });
              }}
              placeholder="New"
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="navigation.visual.link-meta-badge-tone"
          label="Badge tone"
          path="items.meta.badge.tone"
        >
          {() => (
            <Select
              value={meta.badge?.tone ?? "default"}
              onValueChange={(next) => patchBadge({ tone: next as NavigationBadgeTone })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose tone" />
              </SelectTrigger>
              <SelectContent>
                {badgeToneOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </div>
      <NavigationTargetField value={item.target} onChange={(next) => onChange({ target: next })} />
      <p className="text-xs text-muted-foreground">
        Visibility metadata remains preserved from existing payloads and menu settings, but this
        editor does not turn it into a runtime auth gate.
      </p>
    </div>
  );
}

function MenuSelectField({
  menuId,
  onSelectionChange,
}: {
  menuId: string | undefined;
  onSelectionChange: (payload: { menuId: string | undefined; items?: NavigationItem[] }) => void;
}) {
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [isResolvingMenu, setIsResolvingMenu] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    listMenus()
      .then((items) => {
        if (!active) return;
        setMenus(items);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setMenuError(err.message);
        } else {
          setMenuError("Failed to load menus.");
        }
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingMenus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleMenuChange = async (nextValue: string) => {
    if (nextValue === NO_MENU_VALUE) {
      onSelectionChange({ menuId: undefined });
      return;
    }

    onSelectionChange({ menuId: nextValue });
    setMenuError(null);
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setIsResolvingMenu(true);
    try {
      const payload = await getMenuWithItems(nextValue);
      const pageIds = collectNavigationMenuPageIds(payload.items);
      const pagePathById =
        pageIds.length === 0
          ? new Map<string, string>()
          : new Map(
              (await listPagesCached({ force: true })).map((page) => [page.id, page.slug] as const)
            );
      if (requestId !== requestIdRef.current) return;
      onSelectionChange({
        menuId: nextValue,
        items: mapNavigationMenuNodesToNavigationItems(payload.items, pagePathById),
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (isApiClientError(err)) {
        setMenuError(err.message);
      } else {
        setMenuError("Failed to load selected menu items.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsResolvingMenu(false);
      }
    }
  };

  const selectValue = menuId && menuId.trim().length > 0 ? menuId : NO_MENU_VALUE;
  const selectedMenuLabel =
    selectValue === NO_MENU_VALUE
      ? "No menu selected"
      : (menus.find((menu) => menu.id === selectValue)?.name ?? "Selected menu");

  return (
    <WidgetControlRow id="navigation.visual.menu-key" label="Choose existing menu" path="menuKey">
      {() => (
        <div className="space-y-2">
          <Select value={selectValue} onValueChange={(next) => void handleMenuChange(next)}>
            <SelectTrigger>
              <SelectValue placeholder="Select menu">{selectedMenuLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MENU_VALUE}>No menu selected</SelectItem>
              {menus.map((menu) => (
                <SelectItem key={menu.id} value={menu.id}>
                  {menu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoadingMenus ? (
            <p className="text-xs text-muted-foreground">Loading menus...</p>
          ) : null}
          {isResolvingMenu ? (
            <p className="text-xs text-muted-foreground">Syncing links from selected menu...</p>
          ) : null}
          {menuError ? <p className="text-xs text-destructive">{menuError}</p> : null}
        </div>
      )}
    </WidgetControlRow>
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
  const hasSavedImage = (logo.value ?? "").trim().length > 0;
  const hasUnsafeSavedImage = hasSavedImage && !isValidImageUrl(logo.value);

  const handleAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ assetId: undefined, source: "external", value: "" });
      return;
    }
    onChange({ assetId, source: "library" });
    setLookupError(null);
    try {
      const items = await listMediaCached({ force: true });
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
            : (match.alt ?? match.title ?? match.originalName ?? ""),
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
      <WidgetControlRow
        id="navigation.visual.logo-image"
        label="Logo image"
        path="logo.value"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ assetId: undefined, source: "external", value: "" })}
            disabled={!hasSavedImage}
          >
            Clear image
          </Button>
        }
      >
        {() => (
          <div className="space-y-2">
            <div
              data-widget-control="navigation.visual.logo-source"
              data-widget-control-path="logo.source"
              data-widget-control-ownership="writable"
            >
              <span className="sr-only">Logo source</span>
            </div>
            <div
              data-widget-control="navigation.visual.logo-asset"
              data-widget-control-path="logo.assetId"
              data-widget-control-ownership="writable"
            >
              <MediaPicker
                value={source === "library" ? (logo.assetId ?? null) : null}
                onChange={(value) => void handleAssetChange(value)}
                multiple={false}
                accept={["image/*"]}
              />
            </div>
          </div>
        )}
      </WidgetControlRow>
      <div className="space-y-2">
        {hasSavedImage ? (
          <p className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            A logo image is already configured. Pick an image from the Media Library to replace it.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No image is saved. Runtime uses the logo alt text as a safe text fallback until a Media
            Library image is selected.
          </p>
        )}
        {hasUnsafeSavedImage ? (
          <p className="text-xs text-destructive">
            Saved logo image is not public-safe and will not render. Clear it or pick a Media
            Library image.
          </p>
        ) : null}
        {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
      </div>
    </div>
  );
}

export function NavigationWizardEditor({ value, variant }: WidgetEditorProps<NavigationData>) {
  const logo: NavigationLogo = {
    source: "external",
    ...value.logo,
  };
  const linksSource = value.linksSource ?? "manual";
  const linksSourceLabel =
    linkSourceOptions.find((option) => option.id === linksSource)?.label ?? "Manual links";
  const usesPagesIndex = linksSource === "pages";
  const items = value.items.length > 0 ? value.items : navigationDefaults.items;
  const ctaEnabled = variantSupportsCta(variant);
  const variantLabel = variantOptions.find((option) => option.id === variant)?.label ?? "Simple";
  const logoTypeLabel = logo.type === "image" ? "Image logo" : "Text logo";
  const logoValueSummary =
    logo.type === "text"
      ? logo.value?.trim() || "No logo text yet"
      : (logo.value?.trim() || "").length > 0
        ? "Saved image logo configured"
        : "Choose the logo image in Visual";

  return (
    <WidgetEditorSection
      id="navigation.wizard.starter-menu"
      mode="wizard"
      role="setup"
      title="Starter menu"
      description="Review the current navigation setup. Daily logo, source, link, and CTA editing happens in Visual."
    >
      <div className="space-y-4">
        <ReadonlyWidgetSummaryRow
          id="navigation.wizard.variant"
          label="Current layout"
          path="variant"
          value={variantLabel}
        />

        <ReadonlyWidgetSummaryRow
          id="navigation.wizard.links-source"
          label="Current links source"
          path="linksSource"
          value={linksSourceLabel}
        />

        {linksSource === "menu" ? (
          <ReadonlyWidgetSummaryRow
            id="navigation.wizard.menu-key"
            label="Selected menu"
            path="menuKey"
            value={value.menuKey ?? "No menu selected"}
          />
        ) : null}

        {linksSource === "menu" ? (
          <div className="space-y-3">
            <NavigationItemPreviewList
              title="Synced menu preview"
              items={items}
              emptyLabel="Visual selects and syncs menus for this navigation."
            />
            <p className="text-xs text-muted-foreground">
              Switch source or sync a different menu in Visual.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {usesPagesIndex ? "Fallback links" : "Quick links"}
            </p>
            {usesPagesIndex ? (
              <p className="text-xs text-muted-foreground">
                Pages index uses published pages with{" "}
                <span className="font-medium">Show in navigation</span> enabled. Fallback links
                appear when no pages match.
              </p>
            ) : null}
            <NavigationItemPreviewList
              title={usesPagesIndex ? "Fallback links preview" : "Starter links preview"}
              items={items.slice(0, 3)}
              emptyLabel={
                usesPagesIndex
                  ? "Visual owns fallback links when the pages source needs them."
                  : "Visual owns starter link labels and destinations."
              }
            />
            {items.length > 3 ? (
              <p className="text-xs text-muted-foreground">
                Showing the first 3 links here. {items.length - 3} additional link
                {items.length - 3 === 1 ? "" : "s"} continue in Visual mode.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Visual owns source switching, link labels, destinations, and dropdown structure.
            </p>
          </div>
        )}

        <ReadonlyWidgetSummaryRow
          id="navigation.wizard.logo.type"
          label="Logo type"
          path="logo.type"
          value={logoTypeLabel}
        />

        <ReadonlyWidgetSummaryRow
          id="navigation.wizard.logo.value"
          label={logo.type === "text" ? "Logo text" : "Logo image"}
          path="logo.value"
          value={logoValueSummary}
        />

        <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
          {ctaEnabled
            ? "This layout supports a primary CTA. Set its label and destination in Visual."
            : "Simple variant hides CTA in runtime output. Switch to With CTA or Split when you want a primary action, then finish it in Visual."}
        </div>
      </div>
    </WidgetEditorSection>
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
    activeLinkMode: "none",
    ...value.behavior,
  };
  const layout: NavigationLayout = {
    alignment: "right",
    maxWidth: "6xl",
    paddingY: "4",
    itemGap: "4",
    ...value.layout,
  };
  const style: NavigationStyle = { ...value.style };
  const ctaEnabled = variantSupportsCta(variant);
  const navigationLinksDescription =
    linksSource === "menu"
      ? "Review synced menu links. Menu owns labels, URLs, and dropdown structure."
      : linksSource === "pages"
        ? "Review fallback links for the Pages source."
        : "Edit manual labels, URLs, and first-level dropdown links.";

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
  const clearStyleField = (key: keyof NavigationStyle) => {
    const { [key]: _removed, ...nextStyle } = value.style ?? {};
    update({ style: Object.keys(nextStyle).length > 0 ? nextStyle : {} });
  };

  const updateBehavior = (patch: Partial<NavigationBehavior>) =>
    update({
      behavior: {
        ...value.behavior,
        ...patch,
      },
    });
  const updateLayout = (patch: Partial<NavigationLayout>) =>
    update({
      layout: {
        ...value.layout,
        ...patch,
      },
    });

  const updateItem = (index: number, patch: Partial<NavigationItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    update({ items: next });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    update({ items: moveArrayItem(items, index, direction) });
  };

  const removeItem = (index: number) => {
    if (items.length <= 2) return;
    update({
      items: items.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const addItem = () => {
    if (items.length >= MAX_NAVIGATION_ITEMS) return;
    update({
      items: [...items, createNavigationItemDraft(`Item ${items.length + 1}`)],
    });
  };

  const addChild = (itemIndex: number) => {
    const next = [...items];
    const currentChildren = next[itemIndex].children ?? [];
    if (currentChildren.length >= MAX_NAVIGATION_CHILD_ITEMS) return;
    next[itemIndex] = {
      ...next[itemIndex],
      children: [...currentChildren, createNavigationChildDraft()],
    };
    update({ items: next });
  };

  const updateChild = (itemIndex: number, childIndex: number, patch: Partial<NavigationChild>) => {
    const next = [...items];
    const currentChildren = [...(next[itemIndex].children ?? [])];
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

  const moveChild = (itemIndex: number, childIndex: number, direction: -1 | 1) => {
    const next = [...items];
    next[itemIndex] = {
      ...next[itemIndex],
      children: moveArrayItem(next[itemIndex].children ?? [], childIndex, direction),
    };
    update({ items: next });
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="navigation.visual.variant-structure"
        mode="visual"
        role="layout"
        title="Variant and Structure"
        description="Choose navigation structure and source strategy."
      >
        <NavigationControlGroup id="navigation.visual.variant" label="Variant" path="variant">
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
                  <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
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
        </NavigationControlGroup>

        <NavigationControlGroup
          id="navigation.visual.links-source"
          label="Links source"
          path="linksSource"
        >
          <Select
            value={linksSource}
            onValueChange={(next) =>
              update({
                linksSource: next as NavigationData["linksSource"],
                menuKey: next === "menu" ? value.menuKey : undefined,
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
        </NavigationControlGroup>

        {linksSource === "menu" ? (
          <MenuSelectField
            menuId={value.menuKey}
            onSelectionChange={({ menuId, items }) =>
              update(buildMenuSelectionPatch(menuId, items))
            }
          />
        ) : null}
      </EditorSection>

      <EditorSection
        id="navigation.visual.brand-logo"
        mode="visual"
        role="content"
        title="Brand and Logo"
        description="Configure brand mark and destination link."
      >
        <NavigationControlGroup id="navigation.visual.logo-type" label="Logo type" path="logo.type">
          <Select
            value={logo.type}
            onValueChange={(next) =>
              updateLogo({
                type: next as NavigationLogo["type"],
                value: next === "text" ? logo.value || "Coderso" : logo.value,
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
        </NavigationControlGroup>

        {logo.type === "text" ? (
          <WidgetControlRow id="navigation.visual.logo-text" label="Logo text" path="logo.value">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
                value={logo.value}
                onChange={(event) => updateLogo({ value: event.target.value })}
                placeholder="Coderso"
              />
            )}
          </WidgetControlRow>
        ) : (
          <NavigationLogoSourceFields logo={logo} onChange={updateLogo} />
        )}

        <LinkDestinationField
          fieldId="navigation-visual-logo-destination"
          label="Logo destination"
          value={logo.href ?? ""}
          controlPath="logo.href"
          onChange={(next) => updateLogo({ href: next })}
          feedback={!isValidHref(logo.href) ? "Saved destination is not public-safe." : null}
          feedbackTone="destructive"
        />
        {logo.type === "image" ? (
          <WidgetControlRow id="navigation.visual.logo-alt" label="Logo alt text" path="logo.alt">
            {(fieldProps) => (
              <Input
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
                value={logo.alt ?? ""}
                onChange={(event) => updateLogo({ alt: event.target.value })}
                placeholder="Logo alt text"
              />
            )}
          </WidgetControlRow>
        ) : null}
      </EditorSection>

      <EditorSection
        id="navigation.visual.navigation-links"
        mode="visual"
        role="content"
        title="Navigation Links"
        description={navigationLinksDescription}
      >
        <NavigationControlGroup
          id="navigation.visual.active-link-mode"
          label="Active link state"
          path="behavior.activeLinkMode"
        >
          <Select
            value={behavior.activeLinkMode ?? "none"}
            onValueChange={(next) =>
              updateBehavior({ activeLinkMode: next as NavigationBehavior["activeLinkMode"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose active-link behavior" />
            </SelectTrigger>
            <SelectContent>
              {activeLinkModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </NavigationControlGroup>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Active links are detected in runtime from the current browser pathname. Menu and Pages
            sources stay on same-tab targets until their upstream owners define target metadata.
          </p>
          <div
            className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground"
            data-navigation-preview-boundary="runtime-script"
          >
            Admin preview renders static navigation markup. Drawer, submenu, collapse-on-scroll, and
            active-link updates are activated by the public runtime script.
          </div>
        </div>
        {linksSource === "menu" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Links are synced from the selected menu and remain read-only here so this widget does
              not fork Menu ownership.
            </p>
            <NavigationItemPreviewList
              title="Current synced menu"
              items={items}
              emptyLabel="Choose a menu above to preview its current links."
            />
          </div>
        ) : (
          <>
            {linksSource === "pages" ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Links are sourced from published pages with{" "}
                  <span className="font-medium">Show in navigation</span> enabled. Manual links
                  below act as fallback when no pages match.
                </p>
                <NavigationItemPreviewList
                  title="Current fallback links"
                  items={items}
                  emptyLabel="Add fallback links for the pages source."
                />
              </div>
            ) : null}
            <div
              className="space-y-2"
              data-widget-control="navigation.visual.items"
              data-widget-control-path="items"
              data-widget-control-ownership="writable"
            >
              {items.map((item, index) => (
                <div
                  key={`${item.href || item.label}-${index}`}
                  className="rounded-md border border-border/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Link {index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        Parent links can be reordered and may expose one level of sub-links.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, 1)}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={items.length <= 2}
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <WidgetControlRow
                      id={`navigation.visual.link-${index + 1}-label`}
                      label="Label"
                      path="items.label"
                    >
                      {(fieldProps) => (
                        <Input
                          id={fieldProps.id}
                          aria-labelledby={fieldProps["aria-labelledby"]}
                          aria-describedby={fieldProps["aria-describedby"]}
                          value={item.label}
                          onChange={(event) => updateItem(index, { label: event.target.value })}
                          placeholder={`Item ${index + 1} label`}
                        />
                      )}
                    </WidgetControlRow>
                    <LinkDestinationField
                      fieldId={`navigation-visual-link-${index + 1}-destination`}
                      label="Destination"
                      value={item.href}
                      controlPath="items.href"
                      onChange={(next) => updateItem(index, { href: next })}
                      feedback={
                        !isValidHref(item.href) ? "Saved destination is not public-safe." : null
                      }
                      feedbackTone="destructive"
                    />
                  </div>
                  <NavigationDestinationFeedback href={item.href} subject="link" />
                  <NavigationMetadataFields
                    item={item}
                    onChange={(patch) => updateItem(index, patch)}
                  />
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Sub-links
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={(item.children ?? []).length >= MAX_NAVIGATION_CHILD_ITEMS}
                        onClick={() => addChild(index)}
                      >
                        Add sub-link
                      </Button>
                    </div>
                    {(item.children ?? []).length >= MAX_NAVIGATION_CHILD_ITEMS ? (
                      <p className="text-xs text-muted-foreground">
                        Reached the current limit of {MAX_NAVIGATION_CHILD_ITEMS} sub-links for this
                        parent.
                      </p>
                    ) : null}
                    {(item.children ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No sub-links yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(item.children ?? []).map((child, childIndex) => (
                          <div
                            key={`${child.href || child.label}-${childIndex}`}
                            className="rounded-md border border-dashed border-border/70 bg-muted/15 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">Sub-link {childIndex + 1}</p>
                                <p className="text-xs text-muted-foreground">
                                  Child links stay scoped to this parent.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={childIndex === 0}
                                  onClick={() => moveChild(index, childIndex, -1)}
                                >
                                  Move up
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={childIndex === (item.children?.length ?? 0) - 1}
                                  onClick={() => moveChild(index, childIndex, 1)}
                                >
                                  Move down
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => removeChild(index, childIndex)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              <WidgetControlRow
                                id={`navigation.visual.link-${index + 1}-child-${childIndex + 1}-label`}
                                label="Label"
                                path="items.children.label"
                              >
                                {(fieldProps) => (
                                  <Input
                                    id={fieldProps.id}
                                    aria-labelledby={fieldProps["aria-labelledby"]}
                                    aria-describedby={fieldProps["aria-describedby"]}
                                    value={child.label}
                                    onChange={(event) =>
                                      updateChild(index, childIndex, {
                                        label: event.target.value,
                                      })
                                    }
                                    placeholder="Sub-link label"
                                  />
                                )}
                              </WidgetControlRow>
                              <LinkDestinationField
                                fieldId={`navigation-visual-link-${index + 1}-child-${childIndex + 1}-destination`}
                                label="Destination"
                                value={child.href}
                                controlPath="items.children.href"
                                onChange={(next) =>
                                  updateChild(index, childIndex, {
                                    href: next,
                                  })
                                }
                                feedback={
                                  !isValidHref(child.href)
                                    ? "Saved destination is not public-safe."
                                    : null
                                }
                                feedbackTone="destructive"
                              />
                            </div>
                            <NavigationDestinationFeedback href={child.href} subject="sub-link" />
                            <NavigationMetadataFields
                              item={child}
                              onChange={(patch) => updateChild(index, childIndex, patch)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {items.length >= MAX_NAVIGATION_ITEMS
                ? `Reached the current limit of ${MAX_NAVIGATION_ITEMS} top-level links. Reorder existing links or remove one before adding another.`
                : `You can add up to ${MAX_NAVIGATION_ITEMS} top-level links in this widget.`}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={items.length >= MAX_NAVIGATION_ITEMS}
              className="w-full"
            >
              Add link item
            </Button>
          </>
        )}
      </EditorSection>

      <EditorSection
        id="navigation.visual.cta-right-actions"
        mode="visual"
        role="content"
        title="CTA and Right Actions"
        description="Configure CTA copy and mix it with slot content on the right."
      >
        {ctaEnabled ? (
          <div className="space-y-2">
            <WidgetControlRow id="navigation.visual.cta-label" label="CTA label" path="cta.label">
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
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
              )}
            </WidgetControlRow>
            <LinkDestinationField
              fieldId="navigation-visual-cta-destination"
              label="Primary CTA destination"
              value={value.cta?.href ?? ""}
              controlPath="cta.href"
              onChange={(next) =>
                update({
                  cta: {
                    label: value.cta?.label ?? "",
                    href: next,
                  },
                })
              }
              feedback={
                !isValidHref(value.cta?.href) ? "Saved destination is not public-safe." : null
              }
              feedbackTone="destructive"
            />
            <NavigationDestinationFeedback href={value.cta?.href} subject="CTA" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">CTA is disabled for the Simple variant.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Use the existing `Right Actions` slot for secondary actions like login buttons or language
          switchers. This widget keeps only one schema-backed primary CTA.
        </p>
      </EditorSection>

      <EditorSection
        id="navigation.visual.mobile-behavior"
        mode="visual"
        role="layout"
        title="Mobile Behavior"
        description="Control how navigation behaves on small devices."
      >
        <NavigationControlGroup
          id="navigation.visual.mobile-mode"
          label="Mobile mode"
          path="behavior.mobileMode"
        >
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
        </NavigationControlGroup>
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {mobileModeDetails[behavior.mobileMode ?? "expanded"].summary}
          </p>
          <p className="mt-1">{mobileModeDetails[behavior.mobileMode ?? "expanded"].cta}</p>
          <p className="mt-1">
            Drawer mode moves focus into the panel on open, loops it while open, and returns focus
            to the trigger on close.
          </p>
        </div>
        <WidgetControlRow
          id="navigation.visual.hide-cta-on-mobile"
          label="Hide CTA on mobile"
          path="behavior.hideCtaOnMobile"
          help="Keep CTA visible only on tablet/desktop."
          className="rounded-lg border p-3"
        >
          {() => (
            <Switch
              checked={behavior.hideCtaOnMobile ?? false}
              onCheckedChange={(checked) => updateBehavior({ hideCtaOnMobile: checked })}
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="navigation.visual.colors-borders-typography"
        mode="visual"
        role="visual"
        title="Colors, Borders, Typography"
        description="Tune visual style for links, brand and CTA."
      >
        <ColorField
          label="Surface color"
          value={style.surfaceColor}
          onChange={(next) => updateStyle({ surfaceColor: next })}
          onClear={() => clearStyleField("surfaceColor")}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
          themeDefault={navigationDefaults.style?.surfaceColor}
          controlPath="style.surfaceColor"
        />
        <p className="text-xs text-muted-foreground">
          The default surface uses the active theme token. The admin swatch is a fallback preview;
          public pages resolve `var(--color-bg)` from the active theme.
        </p>
        <ColorField
          label="Border color"
          value={style.borderColor}
          onChange={(next) => updateStyle({ borderColor: next })}
          onClear={() => clearStyleField("borderColor")}
          placeholder="#e2e8f0"
          pickerFallback="#e2e8f0"
          themeDefault={navigationDefaults.style?.borderColor}
          controlPath="style.borderColor"
        />
        <ColorField
          label="Text color"
          value={style.textColor}
          onChange={(next) => updateStyle({ textColor: next })}
          onClear={() => clearStyleField("textColor")}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
          themeDefault={navigationDefaults.style?.textColor}
          controlPath="style.textColor"
        />
        <ColorField
          label="Logo color"
          value={style.logoColor}
          onChange={(next) => updateStyle({ logoColor: next })}
          onClear={() => clearStyleField("logoColor")}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
          themeDefault={navigationDefaults.style?.logoColor}
          controlPath="style.logoColor"
        />
        <ColorField
          label="Link color"
          value={style.linkColor}
          onChange={(next) => updateStyle({ linkColor: next })}
          onClear={() => clearStyleField("linkColor")}
          placeholder="#334155"
          pickerFallback="#334155"
          themeDefault={navigationDefaults.style?.linkColor}
          controlPath="style.linkColor"
        />
        {!isHexColorValue(style.linkColor) ? (
          <p className="text-xs text-destructive">
            Use a hex color like `#334155` or keep a CSS variable token.
          </p>
        ) : null}
        <ColorField
          label="Link hover color"
          value={style.linkHoverColor}
          onChange={(next) => updateStyle({ linkHoverColor: next })}
          onClear={() => clearStyleField("linkHoverColor")}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
          themeDefault={navigationDefaults.style?.linkHoverColor}
          controlPath="style.linkHoverColor"
        />
        {!isHexColorValue(style.linkHoverColor) ? (
          <p className="text-xs text-destructive">
            Use a hex color like `#0f172a` or keep a CSS variable token.
          </p>
        ) : null}
        <ColorField
          label="Link active color"
          value={style.linkActiveColor}
          onChange={(next) => updateStyle({ linkActiveColor: next })}
          onClear={() => clearStyleField("linkActiveColor")}
          placeholder="#1d4ed8"
          pickerFallback="#1d4ed8"
          themeDefault={navigationDefaults.style?.linkActiveColor}
          controlPath="style.linkActiveColor"
        />
        {!isHexColorValue(style.linkActiveColor) ? (
          <p className="text-xs text-destructive">
            Use a hex color like `#1d4ed8` or keep a CSS variable token.
          </p>
        ) : null}
        <ColorField
          label="CTA background"
          value={style.ctaBackgroundColor}
          onChange={(next) => updateStyle({ ctaBackgroundColor: next })}
          onClear={() => clearStyleField("ctaBackgroundColor")}
          placeholder="#1d4ed8"
          pickerFallback="#1d4ed8"
          themeDefault={navigationDefaults.style?.ctaBackgroundColor}
          controlPath="style.ctaBackgroundColor"
        />
        <ColorField
          label="CTA text color"
          value={style.ctaTextColor}
          onChange={(next) => updateStyle({ ctaTextColor: next })}
          onClear={() => clearStyleField("ctaTextColor")}
          placeholder="#ffffff"
          pickerFallback="#ffffff"
          themeDefault={navigationDefaults.style?.ctaTextColor}
          controlPath="style.ctaTextColor"
        />
        <ColorField
          label="CTA border color"
          value={style.ctaBorderColor}
          onChange={(next) => updateStyle({ ctaBorderColor: next })}
          onClear={() => clearStyleField("ctaBorderColor")}
          placeholder="#1d4ed8"
          pickerFallback="#1d4ed8"
          themeDefault={navigationDefaults.style?.ctaBorderColor}
          controlPath="style.ctaBorderColor"
        />

        <div className="grid gap-2 md:grid-cols-2">
          <NavigationControlGroup
            id="navigation.visual.border-width"
            label="Border width"
            path="style.borderWidth"
          >
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.font-size"
            label="Font size"
            path="style.fontSize"
          >
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.font-weight"
            label="Font weight"
            path="style.fontWeight"
          >
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.text-transform"
            label="Text transform"
            path="style.textTransform"
          >
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.letter-spacing"
            label="Letter spacing"
            path="style.letterSpacing"
          >
            <Select
              value={style.letterSpacing ?? "none"}
              onValueChange={(next) =>
                updateStyle({ letterSpacing: next as NavigationStyle["letterSpacing"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Letter spacing" />
              </SelectTrigger>
              <SelectContent>
                {letterSpacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.link-underline"
            label="Link underline"
            path="style.linkUnderline"
          >
            <Select
              value={style.linkUnderline ?? "none"}
              onValueChange={(next) =>
                updateStyle({ linkUnderline: next as NavigationStyle["linkUnderline"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Underline policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="hover">On hover + active</SelectItem>
                <SelectItem value="always">Always</SelectItem>
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.surface-shadow"
            label="Surface shadow"
            path="style.shadow"
          >
            <Select
              value={style.shadow ?? "none"}
              onValueChange={(next) => updateStyle({ shadow: next as NavigationStyle["shadow"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Shadow" />
              </SelectTrigger>
              <SelectContent>
                {shadowOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.backdrop-blur"
            label="Backdrop blur"
            path="style.backdropBlur"
          >
            <Select
              value={style.backdropBlur ?? "none"}
              onValueChange={(next) =>
                updateStyle({ backdropBlur: next as NavigationStyle["backdropBlur"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Backdrop blur" />
              </SelectTrigger>
              <SelectContent>
                {blurOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.dropdown-direction"
            label="Dropdown direction"
            path="style.dropdownDirection"
          >
            <Select
              value={style.dropdownDirection ?? "bottom"}
              onValueChange={(next) =>
                updateStyle({ dropdownDirection: next as NavigationStyle["dropdownDirection"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                {dropdownDirectionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup id="navigation.visual.motion" label="Motion" path="style.motion">
            <Select
              value={style.motion ?? "subtle"}
              onValueChange={(next) => updateStyle({ motion: next as NavigationStyle["motion"] })}
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
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.logo-size"
            label="Logo size"
            path="style.logoHeight"
          >
            <Select
              value={style.logoHeight ?? "md"}
              onValueChange={(next) =>
                updateStyle({ logoHeight: next as NavigationStyle["logoHeight"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Logo size" />
              </SelectTrigger>
              <SelectContent>
                {logoHeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.cta-radius"
            label="CTA radius"
            path="style.ctaBorderRadius"
          >
            <Select
              value={style.ctaBorderRadius ?? "md"}
              onValueChange={(next) =>
                updateStyle({ ctaBorderRadius: next as NavigationStyle["ctaBorderRadius"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="CTA radius" />
              </SelectTrigger>
              <SelectContent>
                {ctaRadiusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.cta-separator"
            label="CTA separator"
            path="style.ctaSeparator"
          >
            <Select
              value={style.ctaSeparator ?? "none"}
              onValueChange={(next) =>
                updateStyle({ ctaSeparator: next as NavigationStyle["ctaSeparator"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="CTA separator" />
              </SelectTrigger>
              <SelectContent>
                {ctaSeparatorOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
        </div>
      </EditorSection>

      <EditorSection
        id="navigation.visual.surface-runtime-behavior"
        mode="visual"
        role="layout"
        title="Surface and Runtime Behavior"
        description="Control layout width, spacing, and overlay behavior on top of hero sections."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <NavigationControlGroup
            id="navigation.visual.alignment"
            label="Alignment"
            path="layout.alignment"
          >
            <Select
              value={layout.alignment}
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.max-width"
            label="Max width"
            path="layout.maxWidth"
          >
            <Select
              value={layout.maxWidth}
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.vertical-padding"
            label="Vertical padding"
            path="layout.paddingY"
          >
            <Select
              value={layout.paddingY}
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
          <NavigationControlGroup
            id="navigation.visual.links-gap"
            label="Links gap"
            path="layout.itemGap"
          >
            <Select
              value={layout.itemGap}
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
                    {formatTokenOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NavigationControlGroup>
        </div>
        <WidgetControlRow
          id="navigation.visual.transparent-surface"
          label="Transparent surface"
          path="behavior.transparent"
          help="Ignore surface color and render transparent background."
          className="rounded-lg border p-3"
        >
          {() => (
            <Switch
              checked={behavior.transparent ?? false}
              onCheckedChange={(checked) => updateBehavior({ transparent: checked })}
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="navigation.visual.sticky"
          label="Sticky navigation"
          path="behavior.sticky"
          help="Pin navigation to top during scroll."
          className="rounded-lg border p-3"
        >
          {() => (
            <Switch
              checked={behavior.sticky ?? false}
              onCheckedChange={(checked) => updateBehavior({ sticky: checked })}
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="navigation.visual.collapse-on-scroll"
          label="Collapse on scroll"
          path="behavior.collapseOnScroll"
          help="Shrink the Navigation header while scrolling down."
          className="rounded-lg border p-3"
        >
          {() => (
            <Switch
              checked={behavior.collapseOnScroll ?? false}
              onCheckedChange={(checked) => updateBehavior({ collapseOnScroll: checked })}
            />
          )}
        </WidgetControlRow>
      </EditorSection>
    </div>
  );
}

export function NavigationAdvancedEditor({ value, variant }: WidgetEditorProps<NavigationData>) {
  const behavior: NavigationBehavior = {
    ...navigationDefaults.behavior,
    ...value.behavior,
  };
  const ctaConfigured = Boolean(value.cta?.label || value.cta?.href);
  const ctaVariantSupports = variant ? variantSupportsCta(variant) : true;
  const ctaSummary = ctaVariantSupports
    ? ctaConfigured
      ? "Configured"
      : "Not configured"
    : ctaConfigured
      ? "Configured, hidden by Simple variant"
      : "Hidden by Simple variant";
  const mobileMode = behavior.mobileMode ?? "expanded";
  const activeLinkMode = behavior.activeLinkMode ?? "none";

  return (
    <div className="space-y-4">
      <EditorSection
        id="navigation.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only navigation source and runtime ownership overview."
      >
        <dl className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">Links source</dt>
            <dd>{value.linksSource ?? "manual"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Menu key</dt>
            <dd>{value.menuKey?.trim() ? "Custom menu configured" : "Not configured"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Manual links</dt>
            <dd>{value.items.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">CTA</dt>
            <dd>{ctaSummary}</dd>
          </div>
        </dl>
      </EditorSection>

      <EditorSection
        id="navigation.advanced.layout-token-summary"
        mode="advanced"
        role="diagnostics"
        title="Layout token summary"
        description="Read-only layout tokens. Visual owns normal layout changes."
      >
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-layout-alignment"
          label="Alignment"
          path="layout.alignment"
          value={formatTokenOptionLabel(
            value.layout?.alignment ?? navigationDefaults.layout?.alignment ?? "right"
          )}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-layout-max-width"
          label="Max width"
          path="layout.maxWidth"
          value={formatTokenOptionLabel(value.layout?.maxWidth ?? "6xl")}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-layout-padding-y"
          label="Vertical padding"
          path="layout.paddingY"
          value={formatTokenOptionLabel(value.layout?.paddingY ?? "4")}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-layout-item-gap"
          label="Links gap"
          path="layout.itemGap"
          value={formatTokenOptionLabel(value.layout?.itemGap ?? "4")}
        />
      </EditorSection>

      <EditorSection
        id="navigation.advanced.runtime-behavior-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime behavior summary"
        description="Read-only behavior diagnostics. Visual owns runtime toggles."
      >
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-sticky"
          label="Sticky navigation"
          path="behavior.sticky"
          value={behavior.sticky ? "Enabled" : "Disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-transparent"
          label="Transparent surface"
          path="behavior.transparent"
          value={behavior.transparent ? "Enabled" : "Disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-collapse"
          label="Collapse on scroll"
          path="behavior.collapseOnScroll"
          value={behavior.collapseOnScroll ? "Enabled" : "Disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-mobile-mode"
          label="Mobile mode"
          path="behavior.mobileMode"
          value={mobileModeDetails[mobileMode].summary}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-hide-cta-mobile"
          label="Hide CTA on mobile"
          path="behavior.hideCtaOnMobile"
          value={behavior.hideCtaOnMobile ? "Enabled" : "Disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-active-link-mode"
          label="Active link mode"
          path="behavior.activeLinkMode"
          value={
            activeLinkModeOptions.find((option) => option.id === activeLinkMode)?.label ??
            "No active state"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="navigation-advanced-behavior-preview-boundary"
          label="Admin preview runtime"
          path="behavior.activeLinkMode"
          value="Static markup only; drawer, submenu, collapse, and active-link updates run in public runtime."
        />
      </EditorSection>
    </div>
  );
}
