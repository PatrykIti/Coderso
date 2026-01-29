import { Palette, X } from "lucide-react";
import { useEffect, useState } from "react";

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

import type { ThemeProfile } from "./ThemeCard";
import type { ThemeMeta } from "@/services/themeClient";

type ThemeProfileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themes: ThemeMeta[];
  profile?: ThemeProfile | null;
  isSaving?: boolean;
  onSave?: (input: {
    name: string;
    description: string;
    themeName: string;
  }) => Promise<void> | void;
};

export function ThemeProfileDrawer({
  open,
  onOpenChange,
  themes,
  profile,
  isSaving = false,
  onSave,
}: ThemeProfileDrawerProps) {
  const defaultThemeName = themes[0]?.name ?? "";
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [themeName, setThemeName] = useState(profile?.themeName ?? defaultThemeName);

  useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? "");
    setDescription(profile?.description ?? "");
    setThemeName(profile?.themeName ?? defaultThemeName);
  }, [open, profile, defaultThemeName]);

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({ name, description, themeName });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
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
                Theme
              </label>
              <Select value={themeName} onValueChange={setThemeName} disabled={isSaving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme.name} value={theme.name}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Palette className="h-4 w-4 text-primary" />
                Palette preview
              </div>
              <div className="mt-3 flex gap-2">
                {(profile?.palette ?? ["#e2e8f0", "#94a3b8", "#0f172a"]).map(
                  (color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full border border-background shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || !themeName}>
            {isSaving ? "Saving..." : profile ? "Save Profile" : "Create Profile"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
