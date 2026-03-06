import { Globe, Settings, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { PageDetail, PageTemplateOption } from "@/services/pagesClient";
import { areRevisionSnapshotsEqual } from "../../../services/content/revisionSnapshot";
import {
  normalizePageLayoutSettings,
  pageLayoutTokens,
  type PageLayoutSettings,
  type PageMaxWidthToken,
} from "../../../services/pages/layoutSettings";
import { DEFAULT_PAGE_REVISION_RETENTION, MAX_PAGE_REVISION_RETENTION, MIN_PAGE_REVISION_RETENTION, normalizePageRevisionRetentionValue } from "../../../services/pages/revisionRetention";
import {
  containerTokens,
  spacingTokens,
  type ContainerToken,
  type SpacingToken,
} from "../../../widgets/types";

type PageSettingsValue = {
  template: string;
  showInNav: boolean;
  layout: PageLayoutSettings;
  revisionRetention: number;
};

type PageSettingsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PageDetail | null;
  settings: PageSettingsValue;
  templateOptions?: PageTemplateOption[] | null;
  templateOptionsLoading?: boolean;
  templateOptionsError?: string | null;
  onSave: (payload: {
    title: string;
    slug: string;
    settings: PageSettingsValue;
  }) => Promise<boolean> | boolean;
  onAutosave?: (payload: {
    title: string;
    slug: string;
    settings: PageSettingsValue;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  isAutosaving?: boolean;
  error?: string | null;
};

const MAX_WIDTH_DEFAULT_VALUE = "max-width-default";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const isHexColor = (value: string) =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

export function PageSettingsDrawer({
  open,
  onOpenChange,
  page,
  settings,
  templateOptions,
  templateOptionsLoading = false,
  templateOptionsError,
  onSave,
  onAutosave,
  isSubmitting = false,
  isAutosaving = false,
  error,
}: PageSettingsDrawerProps) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [template, setTemplate] = useState(settings.template);
  const [showInNav, setShowInNav] = useState(settings.showInNav);
  const [layout, setLayout] = useState<PageLayoutSettings>(settings.layout);
  const [revisionRetention, setRevisionRetention] = useState(settings.revisionRetention);

  const initialPayload = useMemo(
    () => ({
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      settings,
    }),
    [page?.slug, page?.title, settings]
  );
  const draftPayload = useMemo(
    () => ({
      title: title.trim(),
      slug: slug.startsWith("/") ? slug : `/${slug}`,
      settings: {
        template,
        showInNav,
        layout,
        revisionRetention,
      },
    }),
    [layout, revisionRetention, showInNav, slug, template, title]
  );
  const isDirty = useMemo(
    () => !areRevisionSnapshotsEqual(initialPayload, draftPayload),
    [draftPayload, initialPayload]
  );
  const shouldSkipAutosaveRef = useRef(false);

  const resolvedTemplateOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    if (Array.isArray(templateOptions)) {
      for (const option of templateOptions) {
        const key = typeof option.key === "string" ? option.key.trim() : "";
        if (!key) continue;
        const label = typeof option.label === "string" ? option.label.trim() : key;
        map.set(key, { key, label: label || key });
      }
    }

    const currentKey = template.trim();
    if (currentKey && !map.has(currentKey)) {
      map.set(currentKey, {
        key: currentKey,
        label: `Custom (${currentKey})`,
      });
    }

    if (!map.has("landing")) {
      map.set("landing", { key: "landing", label: "Landing" });
    }

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.key === "landing") return -1;
      if (b.key === "landing") return 1;
      return a.label.localeCompare(b.label);
    });
    return list;
  }, [templateOptions, template]);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && slug.trim().length > 0,
    [slug, title]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (shouldSkipAutosaveRef.current) {
      shouldSkipAutosaveRef.current = false;
      onOpenChange(false);
      return;
    }

    if (isDirty && onAutosave && !isSubmitting) {
      void Promise.resolve(onAutosave(draftPayload));
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    const saved = await onSave(draftPayload);
    if (saved) {
      shouldSkipAutosaveRef.current = true;
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Page settings</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Configure metadata, layout, and defaults for this page.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close page settings">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-6 py-6">
          <div className="space-y-6">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to update page</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Preview modes</AlertTitle>
              <AlertDescription>
                Canvas preview is editable and uses admin theme. Runtime preview is
                read-only and uses site theme.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Page title
              </label>
              <Input
                placeholder="e.g. About us"
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) {
                    setSlug(nextTitle.trim() ? `/${slugify(nextTitle)}` : "");
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slug
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="/about"
                  className="pl-9"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">Template and navigation</p>
              <p className="text-xs text-muted-foreground">
                Control base page template and menu visibility.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Template
                  </label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          templateOptionsLoading ? "Loading templates..." : "Choose template"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {resolvedTemplateOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templateOptionsLoading ? (
                    <p className="text-xs text-muted-foreground">Loading template options...</p>
                  ) : null}
                  {templateOptionsError ? (
                    <p className="text-xs text-destructive">{templateOptionsError}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Show in navigation
                  </label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm text-muted-foreground">
                      Add page to menu index
                    </span>
                    <Switch
                      checked={showInNav}
                      onCheckedChange={(checked) => setShowInNav(checked === true)}
                    />
                  </div>
                </div>
              </div>
            </div>


            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">Revision history</p>
              <p className="text-xs text-muted-foreground">
                Limit how many publish snapshots are kept per page.
              </p>
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Revisions to keep
                </label>
                <Input
                  type="number"
                  min={MIN_PAGE_REVISION_RETENTION}
                  max={MAX_PAGE_REVISION_RETENTION}
                  value={revisionRetention}
                  onChange={(event) => {
                    setRevisionRetention(
                      normalizePageRevisionRetentionValue(event.target.value)
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Default is {DEFAULT_PAGE_REVISION_RETENTION}. Range{" "}
                  {MIN_PAGE_REVISION_RETENTION}–{MAX_PAGE_REVISION_RETENTION}.
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Layout and appearance</p>
                  <p className="text-xs text-muted-foreground">
                    Wrapper width, spacing and background for the whole page.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLayout(normalizePageLayoutSettings(undefined))}
                >
                  Reset to theme defaults
                </Button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Page width
                  </label>
                  <Select
                    value={layout.wrapper.container}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        wrapper: {
                          ...prev.wrapper,
                          container: next as ContainerToken,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose width" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Max width
                  </label>
                  <Select
                    value={layout.wrapper.maxWidth ?? MAX_WIDTH_DEFAULT_VALUE}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        wrapper: {
                          ...prev.wrapper,
                          maxWidth:
                            next === MAX_WIDTH_DEFAULT_VALUE
                              ? undefined
                              : (next as PageMaxWidthToken),
                        },
                      }))
                    }
                    disabled={layout.wrapper.container === "full"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose max width" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MAX_WIDTH_DEFAULT_VALUE}>
                        Theme default
                      </SelectItem>
                      {pageLayoutTokens.maxWidth.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Section spacing
                  </label>
                  <Select
                    value={layout.sections.gap}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          gap: next as SpacingToken,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose section spacing" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Background color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-10 w-14 p-1"
                      value={isHexColor(layout.wrapper.background.color) ? layout.wrapper.background.color : "#ffffff"}
                      onChange={(event) =>
                        setLayout((prev) => ({
                          ...prev,
                          wrapper: {
                            ...prev.wrapper,
                            background: {
                              ...prev.wrapper.background,
                              color: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                    <Input
                      value={layout.wrapper.background.color}
                      onChange={(event) =>
                        setLayout((prev) => ({
                          ...prev,
                          wrapper: {
                            ...prev.wrapper,
                            background: {
                              ...prev.wrapper.background,
                              color: event.target.value,
                            },
                          },
                        }))
                      }
                      placeholder="#ffffff or transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Background media URL
                  </label>
                  <Input
                    value={layout.wrapper.background.media.src ?? ""}
                    onChange={(event) => {
                      const nextValue = event.target.value.trim() ? event.target.value : null;
                      setLayout((prev) => ({
                        ...prev,
                        wrapper: {
                          ...prev.wrapper,
                          background: {
                            ...prev.wrapper.background,
                            image: nextValue,
                            media: nextValue
                              ? {
                                  type: "image",
                                  source: "external",
                                  src: nextValue,
                                }
                              : {
                                  type: "none",
                                  source: "external",
                                  src: null,
                                },
                          },
                        },
                      }));
                    }}
                    placeholder="https://cdn.example.com/background.jpg"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">Default widget layout</p>
              <p className="text-xs text-muted-foreground">
                Used when widget blocks choose inherited values.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Default container
                  </label>
                  <Select
                    value={layout.sections.defaults.container}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          defaults: {
                            ...prev.sections.defaults,
                            container: next as ContainerToken,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose container" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Apply defaults to new blocks
                  </label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm text-muted-foreground">
                      Auto-apply defaults on insert
                    </span>
                    <Switch
                      checked={layout.applyDefaultsToNewBlocks}
                      onCheckedChange={(checked) =>
                        setLayout((prev) => ({
                          ...prev,
                          applyDefaultsToNewBlocks: checked === true,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Default padding top
                  </label>
                  <Select
                    value={layout.sections.defaults.padding.top}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          defaults: {
                            ...prev.sections.defaults,
                            padding: {
                              ...prev.sections.defaults.padding,
                              top: next as SpacingToken,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose top padding" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Default padding bottom
                  </label>
                  <Select
                    value={layout.sections.defaults.padding.bottom}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          defaults: {
                            ...prev.sections.defaults,
                            padding: {
                              ...prev.sections.defaults.padding,
                              bottom: next as SpacingToken,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose bottom padding" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Default margin top
                  </label>
                  <Select
                    value={layout.sections.defaults.margin.top}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          defaults: {
                            ...prev.sections.defaults,
                            margin: {
                              ...prev.sections.defaults.margin,
                              top: next as SpacingToken,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose top margin" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Default margin bottom
                  </label>
                  <Select
                    value={layout.sections.defaults.margin.bottom}
                    onValueChange={(next) =>
                      setLayout((prev) => ({
                        ...prev,
                        sections: {
                          ...prev.sections,
                          defaults: {
                            ...prev.sections.defaults,
                            margin: {
                              ...prev.sections.defaults.margin,
                              bottom: next as SpacingToken,
                            },
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose bottom margin" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacingTokens.map((token) => (
                        <SelectItem key={token} value={token}>
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>Save settings or close the drawer to keep one autosave snapshot.</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {isDirty ? "Close and autosave" : "Cancel"}
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </div>
          {isAutosaving ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Saving autosave snapshot...
            </p>
          ) : isDirty ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Closing the drawer stores one autosave snapshot in page history.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { PageSettingsValue };
