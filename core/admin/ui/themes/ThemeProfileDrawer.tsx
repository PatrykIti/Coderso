import { Palette, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AdminThemeProfileCard } from "./ThemeProfileCard";
import type { AdminThemeTemplate } from "@/services/adminThemeClient";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../services/adminThemes/tokenTypes";
import { mergeAdminThemeTokens } from "../../../services/adminThemes/tokenUtils";

const resolvePalette = (template: AdminThemeTemplate | null) => {
  const resolved = mergeAdminThemeTokens(
    DEFAULT_ADMIN_THEME_TOKENS,
    template?.tokens ?? null
  );
  return [
    resolved.buttons.primary.bg,
    resolved.buttons.secondary.bg,
    resolved.buttons.outline.border,
    resolved.base.surface,
    resolved.base.text,
  ];
};

type ThemeProfileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: AdminThemeTemplate[];
  profile?: AdminThemeProfileCard | null;
  isSaving?: boolean;
  onSave?: (input: {
    name: string;
    description: string;
    templateId: string;
  }) => Promise<void> | void;
};

type ThemeProfileFormProps = {
  profile?: AdminThemeProfileCard | null;
  templates: AdminThemeTemplate[];
  isSaving: boolean;
  onSave?: ThemeProfileDrawerProps["onSave"];
  onClose: () => void;
};

function ThemeProfileForm({
  profile,
  templates,
  isSaving,
  onSave,
  onClose,
}: ThemeProfileFormProps) {
  const defaultTemplateId = templates[0]?.id ?? "";
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [templateId, setTemplateId] = useState(
    profile?.templateId ?? defaultTemplateId
  );
  const resolvedTemplateId = templateId || templates[0]?.id || "";

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({ name, description, templateId: resolvedTemplateId });
  };

  const templateOptions = useMemo(
    () => templates.map((template) => ({ value: template.id, label: template.name })),
    [templates]
  );
  const selectedTheme = useMemo(
    () => templates.find((template) => template.id === resolvedTemplateId) ?? null,
    [templates, resolvedTemplateId]
  );
  const palette = useMemo(() => resolvePalette(selectedTheme), [selectedTheme]);

  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1">
          <SheetTitle>{profile ? "Edit Profile" : "New Profile"}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Define palette and typography for this theme.
          </p>
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close theme profile drawer">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 px-6 py-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Profile name
            </label>
            <Input
              placeholder="Neo Minimalist"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Description
            </label>
            <Input
              placeholder="Short summary"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Theme Template
            </label>
            <Select
              value={resolvedTemplateId}
              onValueChange={setTemplateId}
              disabled={isSaving || templateOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.length > 0 ? (
                  templateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-themes" disabled>
                    No themes available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Profiles simply point to a template and can be activated anytime.
            </p>
          </div>
          <Separator />
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              Palette preview
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="group flex flex-col items-center gap-1 text-[10px] text-muted-foreground"
                  title={color}
                  onClick={() => {
                    if (typeof navigator !== "undefined") {
                      void navigator.clipboard.writeText(color);
                    }
                  }}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-background shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-[9px] text-foreground/70">
                    {color}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !resolvedTemplateId}
        >
          {isSaving ? "Saving..." : profile ? "Save Profile" : "Create Profile"}
        </Button>
      </div>
    </>
  );
}

export function ThemeProfileDrawer({
  open,
  onOpenChange,
  templates,
  profile,
  isSaving = false,
  onSave,
}: ThemeProfileDrawerProps) {
  const formKey = `${profile?.id ?? "new"}-${open ? "open" : "closed"}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <ThemeProfileForm
          key={formKey}
          profile={profile}
          templates={templates}
          isSaving={isSaving}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
