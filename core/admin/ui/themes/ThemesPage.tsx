import { Download, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  activateAdminThemeProfile,
  createAdminThemeProfile,
  createAdminThemeTemplate,
  getCachedAdminThemeProfiles,
  getCachedAdminThemeTemplates,
  listAdminThemeProfilesCached,
  listAdminThemeTemplatesCached,
  updateAdminThemeProfile,
  updateAdminThemeTemplate,
  type AdminThemeProfile,
  type AdminThemeTemplate,
} from "@/services/adminThemeClient";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../services/adminThemes/tokenTypes";
import { mergeAdminThemeTokens } from "../../../services/adminThemes/tokenUtils";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { ThemeExportDialog } from "./ThemeExportDialog";
import { ThemeProfileCard, type AdminThemeProfileCard } from "./ThemeProfileCard";
import { ThemeProfileDrawer } from "./ThemeProfileDrawer";
import { ThemeTemplateCard } from "./ThemeTemplateCard";
import { ThemeTemplateDrawer } from "./ThemeTemplateDrawer";

const resolveTemplatePalette = (template: AdminThemeTemplate | null) => {
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

const countTokens = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === "string") return 1;
  if (typeof value !== "object") return 0;
  return Object.values(value as Record<string, unknown>).reduce<number>(
    (total, entry) => total + countTokens(entry),
    0
  );
};

export function ThemesPage() {
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminThemeTemplate | null>(
    null
  );
  const [editingProfile, setEditingProfile] = useState<AdminThemeProfileCard | null>(
    null
  );
  const initialCachedTemplates = getCachedAdminThemeTemplates();
  const initialCachedProfiles = getCachedAdminThemeProfiles();
  const hasInitialCache =
    initialCachedTemplates !== null || initialCachedProfiles !== null;
  const [templates, setTemplates] = useState<AdminThemeTemplate[]>(
    () => initialCachedTemplates ?? []
  );
  const [profiles, setProfiles] = useState<AdminThemeProfile[]>(
    () => initialCachedProfiles ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const hasHydratedRef = useRef(hasInitialCache);

  const dispatchThemeUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("theme:updated"));
  };

  const refresh = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = options?.background ?? hasHydratedRef.current;
      if (!background) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [templatesResult, profilesResult] = await Promise.all([
          listAdminThemeTemplatesCached({ force }),
          listAdminThemeProfilesCached({ force }),
        ]);
        setTemplates(templatesResult);
        setProfiles(profilesResult);
        hasHydratedRef.current = true;
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load admin themes.");
        }
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    refresh({ force: true }).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (
        event.key !== cacheKeys.adminThemeTemplatesList &&
        event.key !== cacheKeys.adminThemeProfilesList
      ) {
        return;
      }
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [refresh]);

  const templateCards = useMemo(() => {
    return templates.map((template) => ({
      ...template,
      description: template.description ?? "No description provided.",
      palette: resolveTemplatePalette(template),
      tokenCount: countTokens(template.tokens),
    }));
  }, [templates]);

  const filteredTemplateCards = useMemo(() => {
    const normalized = templateQuery.trim().toLowerCase();
    if (!normalized) return templateCards;
    return templateCards.filter((template) => {
      return (
        template.name.toLowerCase().includes(normalized) ||
        template.description.toLowerCase().includes(normalized)
      );
    });
  }, [templateCards, templateQuery]);

  const profileCards = useMemo(() => {
    return profiles.map((profile) => {
      const template = templates.find((item) => item.id === profile.templateId) ?? null;
      return {
        id: profile.id,
        name: profile.name,
        description: profile.description ?? "No description provided.",
        templateId: profile.templateId,
        templateName: template?.name ?? "Unknown",
        palette: resolveTemplatePalette(template),
        isActive: profile.isActive,
      } satisfies AdminThemeProfileCard;
    });
  }, [profiles, templates]);

  const activeProfile = profileCards.find((profile) => profile.isActive) ?? null;

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateDrawerOpen(true);
  };

  const openEditTemplate = (template: AdminThemeTemplate) => {
    setEditingTemplate(template);
    setTemplateDrawerOpen(true);
  };

  const openCreateProfile = () => {
    setEditingProfile(null);
    setProfileDrawerOpen(true);
  };

  const openEditProfile = (profile: AdminThemeProfileCard) => {
    setEditingProfile(profile);
    setProfileDrawerOpen(true);
  };

  return (
    <AdminShell
      activeHref="/admin/themes"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Visual</span>
          <span>/</span>
          <span className="text-foreground">Admin UI Theme</span>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <PageHeader
          title="Admin UI Theme"
          description="Create theme templates and activate profiles for the admin panel."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
              <Button size="sm" className="gap-2" onClick={openCreateTemplate}>
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </div>
          }
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    className="pl-9"
                    value={templateQuery}
                    onChange={(event) => setTemplateQuery(event.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {templateQuery.trim()
                    ? `${filteredTemplateCards.length} of ${templateCards.length} templates`
                    : `${templateCards.length} templates`}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplateCards.map((template) => (
              <ThemeTemplateCard
                key={template.id}
                template={template}
                onEdit={() => openEditTemplate(template)}
              />
            ))}
            {!isLoading && filteredTemplateCards.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                {templateQuery.trim()
                  ? "No templates match your search."
                  : "No theme templates yet. Create your first template to unlock profiles."}
              </div>
            ) : null}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Profiles</h2>
              <p className="text-sm text-muted-foreground">
                Profiles activate a template for the admin UI.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={openCreateProfile}
              disabled={templates.length === 0}
            >
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {profileCards.map((profile) => (
              <ThemeProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => openEditProfile(profile)}
                onActivate={() => {
                  setIsSaving(true);
                  activateAdminThemeProfile(profile.id)
                    .then(() => refresh({ force: true, background: true }))
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
            {!isLoading && profileCards.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Create a profile to activate a template for your admin UI.
              </div>
            ) : null}
          </div>
          {activeProfile ? (
            <p className="text-xs text-muted-foreground">
              Active profile: <span className="font-medium">{activeProfile.name}</span>
            </p>
          ) : null}
        </section>
      </div>

      <ThemeTemplateDrawer
        open={templateDrawerOpen}
        onOpenChange={setTemplateDrawerOpen}
        template={editingTemplate}
        isSaving={isSaving}
        onSave={async ({ name, description, tokens }) => {
          setIsSaving(true);
          try {
            if (editingTemplate?.id) {
              await updateAdminThemeTemplate(editingTemplate.id, {
                name,
                description,
                tokens,
              });
            } else {
              await createAdminThemeTemplate({ name, description, tokens });
            }
            await refresh({ force: true, background: true });
            dispatchThemeUpdated();
            setTemplateDrawerOpen(false);
            setEditingTemplate(null);
          } catch (err) {
            if (isApiClientError(err)) {
              setError(err.message);
            } else {
              setError("Failed to save theme template.");
            }
          } finally {
            setIsSaving(false);
          }
        }}
      />

      <ThemeProfileDrawer
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
        templates={templates}
        profile={editingProfile}
        isSaving={isSaving}
        onSave={async ({ name, description, templateId }) => {
          setIsSaving(true);
          try {
            if (editingProfile?.id) {
              await updateAdminThemeProfile(editingProfile.id, {
                name,
                description,
                templateId,
              });
            } else {
              const shouldActivate = !profiles.some((profile) => profile.isActive);
              await createAdminThemeProfile({
                name,
                description,
                templateId,
                isActive: shouldActivate,
              });
            }
            await refresh({ force: true, background: true });
            dispatchThemeUpdated();
            setProfileDrawerOpen(false);
            setEditingProfile(null);
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
