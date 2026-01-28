import {
  Check,
  ChevronDown,
  Download,
  Plus,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { useState } from "react";

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
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ThemeCard, type ThemeProfile } from "./ThemeCard";
import { ThemeExportDialog } from "./ThemeExportDialog";
import { ThemeProfileDrawer } from "./ThemeProfileDrawer";

const activeTheme = {
  id: "neo-minimalist",
  name: "Neo Minimalist",
  description:
    "Clean, high-contrast interface designed for maximum readability and focus.",
  typography: "Space Grotesk",
  tokens: 124,
};

const profiles: ThemeProfile[] = [
  {
    id: "glassmorphism-ui",
    name: "Glassmorphism UI",
    description: "Frosted layers with luminous highlights and airy panels.",
    palette: ["#3b82f6", "#8b5cf6", "#cbd5e1"],
    icon: <Sparkles className="h-4 w-4" />,
    iconClassName: "bg-sky-100 text-sky-600",
  },
  {
    id: "corporate-light",
    name: "Corporate Light",
    description: "Bright, structured layout optimized for editorial clarity.",
    palette: ["#0f172a", "#e2e8f0"],
    icon: <Sun className="h-4 w-4" />,
    iconClassName: "bg-amber-100 text-amber-600",
  },
  {
    id: "neo-minimalist",
    name: "Neo Minimalist",
    description: "Minimal blocks with crisp contrast and sharp focus states.",
    palette: ["#1392ec", "#94a3b8"],
    icon: <Check className="h-4 w-4" />,
    iconClassName: "bg-primary text-primary-foreground",
    isActive: true,
  },
];

const primaryPalette = ["#e7f4fd", "#cfebfb", "#1392ec", "#0f75bd", "#0a4e7e"];
const radiusScale = ["sm", "lg", "xl", "2xl"];

export function ThemesPage() {
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ThemeProfile | null>(null);

  const openCreateProfile = () => {
    setEditingProfile(null);
    setProfileDrawerOpen(true);
  };

  const openEditProfile = (profile: ThemeProfile) => {
    setEditingProfile(profile);
    setProfileDrawerOpen(true);
  };

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
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: "#1392ec" }}
                      />
                      <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{activeTheme.name}</h2>
                    <Badge className="bg-emerald-100 text-[10px] uppercase tracking-wide text-emerald-700">
                      Current
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeTheme.description}
                  </p>
                  <div className="flex flex-wrap gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase text-muted-foreground">
                        Typography:
                      </span>
                      <span className="text-foreground">{activeTheme.typography}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase text-muted-foreground">
                        Tokens:
                      </span>
                      <span className="text-foreground">{activeTheme.tokens} variables</span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto">
                  <Button className="w-full md:w-auto" asChild>
                    <a href={`/admin/themes/${activeTheme.id}`}>Edit Theme</a>
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
                {profiles.length} profiles
              </Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {profiles.map((profile) => (
                <ThemeCard
                  key={profile.id}
                  theme={profile}
                  onEdit={() => openEditProfile(profile)}
                  onDuplicate={() => undefined}
                  onActivate={() => undefined}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden w-full max-w-sm shrink-0 xl:block">
          <Card className="sticky top-8 border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Configured tokens for {activeTheme.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Primary Palette
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {primaryPalette.map((color) => (
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
                    <p className="text-2xl font-semibold text-foreground">
                      The quick fox
                    </p>
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
      />
      <ThemeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AdminShell>
  );
}
