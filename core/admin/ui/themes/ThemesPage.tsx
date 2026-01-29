import {
  Check,
  ChevronDown,
  Download,
  Plus,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import {
  activateThemeProfile,
  createThemeProfile,
  listThemeProfiles,
  listThemes,
  updateThemeProfile,
  type ThemeMeta,
  type ThemeProfile as ApiThemeProfile,
} from "@/services/themeClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ThemeCard, type ThemeProfile } from "./ThemeCard";
import { ThemeExportDialog } from "./ThemeExportDialog";
import { ThemeProfileDrawer } from "./ThemeProfileDrawer";

const fallbackPalette = ["#e7f4fd", "#cfebfb", "#1392ec", "#0f75bd", "#0a4e7e"];
const radiusScale = ["sm", "lg", "xl", "2xl"];

const resolvePalette = (tokens: Record<string, unknown> | undefined) => {
  if (!tokens || typeof tokens !== "object") return fallbackPalette;
  const colors = (tokens as Record<string, unknown>).colors as
    | Record<string, string>
    | undefined;
  const palette = [colors?.primary, colors?.secondary, colors?.accent].filter(Boolean);
  return palette.length > 0 ? (palette as string[]) : fallbackPalette;
};

const countTokens = (tokens: Record<string, unknown> | undefined) => {
  if (!tokens || typeof tokens !== "object") return 0;
  return Object.values(tokens).reduce<number>((total, group) => {
    if (!group || typeof group !== "object") return total;
    return total + Object.keys(group as Record<string, unknown>).length;
  }, 0);
};

export function ThemesPage() {
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ThemeProfile | null>(null);
  const [themes, setThemes] = useState<ThemeMeta[]>([]);
  const [profiles, setProfiles] = useState<ApiThemeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateProfile = () => {
    setEditingProfile(null);
    setProfileDrawerOpen(true);
  };

  const openEditProfile = (profile: ThemeProfile) => {
    setEditingProfile(profile);
    setProfileDrawerOpen(true);
  };

  const dispatchThemeUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("theme:updated"));
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [themesResult, profilesResult] = await Promise.all([
        listThemes(),
        listThemeProfiles(),
      ]);
      setThemes(themesResult.items);
      setProfiles(profilesResult.items);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load themes.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const profilesForCards = useMemo(() => {
    return profiles.map((profile, index) => {
      const iconClassName = profile.isActive
        ? "bg-primary text-primary-foreground"
        : index % 2 === 0
          ? "bg-sky-100 text-sky-600"
          : "bg-amber-100 text-amber-600";
      const icon = profile.isActive ? (
        <Check className="h-4 w-4" />
      ) : index % 2 === 0 ? (
        <Sparkles className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      );

      return {
        id: profile.id,
        name: profile.name,
        description: profile.description ?? "No description provided.",
        themeName: profile.themeName,
        tokens: profile.tokens,
        palette: resolvePalette(profile.tokens),
        icon,
        iconClassName,
        isActive: profile.isActive,
      } satisfies ThemeProfile;
    });
  }, [profiles]);

  const activeProfile = profiles.find((profile) => profile.isActive) ?? profiles[0] ?? null;
  const activeTheme = activeProfile
    ? themes.find((theme) => theme.name === activeProfile.themeName) ?? null
    : null;

  const activeProfilePalette = resolvePalette(activeProfile?.tokens);
  const activeTokensCount = countTokens(activeProfile?.tokens);

  return (
    <AdminShell
      activeHref="/admin/themes"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Visual Engine</span>
          <span>/</span>
          <span className="text-foreground">Themes</span>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <PageHeader
            title="Themes"
            description="Manage theme profiles, palettes, and activation states."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                  <Download className="h-4 w-4" />
                  Export Config
                </Button>
                <Button className="gap-2" onClick={openCreateProfile}>
                  <Plus className="h-4 w-4" />
                  New Profile
                </Button>
              </div>
            }
          />

          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search profiles..." className="pl-9" />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary">
                    All
                  </Button>
                  <Button size="sm" variant="ghost">
                    Active
                  </Button>
                  <Button size="sm" variant="ghost">
                    Draft
                  </Button>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    Sort: Recently updated
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Recently updated</DropdownMenuItem>
                  <DropdownMenuItem>Name (A-Z)</DropdownMenuItem>
                  <DropdownMenuItem>Most used</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Show archived</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Active Theme
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <Button size="xs" variant="secondary">
                  Production
                </Button>
                <Button size="xs" variant="ghost">
                  Staging
                </Button>
              </div>
            </div>
            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative h-32 w-full max-w-[220px] overflow-hidden rounded-xl border bg-muted/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                  <div className="relative flex h-full flex-col justify-between p-4">
                    <div className="space-y-2">
                      <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
                      <div className="h-2 w-full rounded bg-muted-foreground/10" />
                    </div>
                    <div className="flex items-center gap-2">
                      {activeProfilePalette.slice(0, 2).map((color) => (
                        <span
                          key={color}
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      {activeProfile?.name ?? "No active profile"}
                    </h2>
                    <Badge className="bg-emerald-100 text-[10px] uppercase tracking-wide text-emerald-700">
                      Current
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeProfile?.description ?? "Select a theme profile to activate."}
                  </p>
                  <div className="flex flex-wrap gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase text-muted-foreground">
                        Theme:
                      </span>
                      <span className="text-foreground">
                        {activeTheme?.name ?? "Default"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase text-muted-foreground">
                        Tokens:
                      </span>
                      <span className="text-foreground">{activeTokensCount} variables</span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto">
                  <Button className="w-full md:w-auto" asChild disabled={!activeProfile}>
                    <a href={`/admin/themes/${activeProfile?.id ?? ""}`}>Edit Theme</a>
                  </Button>
                  <Button variant="outline" className="w-full md:w-auto">
                    Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Available Profiles
              </p>
              <Badge variant="outline" className="text-xs">
                {profilesForCards.length} profiles
              </Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {profilesForCards.map((profile) => (
                <ThemeCard
                  key={profile.id}
                  theme={profile}
                  onEdit={() => openEditProfile(profile)}
                  onDuplicate={() => undefined}
                  onActivate={() => {
                    if (profile.isActive) return;
                    setIsSaving(true);
                    activateThemeProfile(profile.id)
                      .then(() => loadData())
                      .then(() => dispatchThemeUpdated())
                      .catch((err) => {
                        if (isApiClientError(err)) {
                          setError(err.message);
                        } else {
                          setError("Failed to activate profile.");
                        }
                      })
                      .finally(() => setIsSaving(false));
                  }}
                />
              ))}
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading profiles...</p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </section>
        </div>

        <aside className="hidden w-full max-w-sm shrink-0 xl:block">
          <Card className="sticky top-8 border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Configured tokens for {activeProfile?.name ?? "active theme"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Primary Palette
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {activeProfilePalette.map((color) => (
                    <div
                      key={color}
                      className="aspect-square rounded-md border border-border/60"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Hex Code</span>
                  <code className="font-mono text-primary">#1392ec</code>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Typography Scale
                </p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      H1 Display - 32px
                    </span>
                    <p className="text-2xl font-semibold text-foreground">The quick fox</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      Body Base - 14px
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Design is not just what it looks like and feels like. Design is
                      how it works.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Radius &amp; Border
                </p>
                <div className="flex flex-wrap gap-2">
                  {radiusScale.map((radius) => (
                    <div
                      key={radius}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30 text-[10px] uppercase text-muted-foreground"
                    >
                      {radius}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setExportOpen(true)}
              >
                <Download className="h-4 w-4" />
                Export Config
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
      <ThemeProfileDrawer
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
        profile={editingProfile}
        themes={themes}
        isSaving={isSaving}
        onSave={async (input) => {
          setIsSaving(true);
          try {
            if (editingProfile) {
              await updateThemeProfile(editingProfile.id, {
                name: input.name,
                description: input.description,
              });
            } else {
              await createThemeProfile({
                name: input.name,
                description: input.description,
                themeName: input.themeName,
              });
            }
            setProfileDrawerOpen(false);
            setEditingProfile(null);
            await loadData();
            dispatchThemeUpdated();
          } catch (err) {
            if (isApiClientError(err)) {
              setError(err.message);
            } else {
              setError("Failed to save theme profile.");
            }
          } finally {
            setIsSaving(false);
          }
        }}
      />
      <ThemeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AdminShell>
  );
}
