import { Download, Palette, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/ui/shared/EmptyState";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { ThemeExportDialog } from "./ThemeExportDialog";
import { ThemeLivePreview } from "./ThemeLivePreview";
import { ThemeProfileCard, type AdminThemeProfileCard } from "./ThemeProfileCard";
import { ThemeProfileDrawer } from "./ThemeProfileDrawer";
import { ThemeTemplateCard } from "./ThemeTemplateCard";
import { ThemeTemplateDrawer } from "./ThemeTemplateDrawer";

const resolveTemplatePalette = (template: AdminThemeTemplate | null) => {
  const resolved = mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, template?.tokens ?? null);
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
  const [editingTemplate, setEditingTemplate] = useState<AdminThemeTemplate | null>(null);
  const [editingProfile, setEditingProfile] = useState<AdminThemeProfileCard | null>(null);
  const initialCachedTemplates = getCachedAdminThemeTemplates();
  const initialCachedProfiles = getCachedAdminThemeProfiles();
  const hasInitialCache = initialCachedTemplates !== null || initialCachedProfiles !== null;
  const [templates, setTemplates] = useState<AdminThemeTemplate[]>(
    () => initialCachedTemplates ?? []
  );
  const [profiles, setProfiles] = useState<AdminThemeProfile[]>(() => initialCachedProfiles ?? []);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const hasHydratedRef = useRef(hasInitialCache);

  const dispatchThemeUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("theme:updated"));
  };

  const refresh = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
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
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      listAdminThemeTemplatesCached({ force: true }),
      listAdminThemeProfilesCached({ force: true }),
    ])
      .then(([templatesResult, profilesResult]) => {
        if (!active) return;
        setTemplates(templatesResult);
        setProfiles(profilesResult);
        hasHydratedRef.current = true;
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load admin themes.");
        }
      })
      .finally(() => {
        if (active && !hasInitialCache) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache]);

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

  // Live-preview tokens = the ACTIVE profile's template tokens, merged over the
  // defaults so the mini-admin never throws when no profile/template is active.
  const activePreviewTokens = useMemo(() => {
    const activeTemplate = templates.find((t) => t.id === activeProfile?.templateId) ?? null;
    return mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, activeTemplate?.tokens ?? null);
  }, [templates, activeProfile]);

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
    <AdminShell activeHref="/admin/themes" breadcrumbs={["Visual", "Admin UI Theme"]}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <PageHeader
          icon={<Palette />}
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

        {/* Preset row — template cards (swatch cards, hover lift) */}
        <section className="space-y-4">
          {filteredTemplateCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {filteredTemplateCards.map((template) => (
                <ThemeTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => openEditTemplate(template)}
                />
              ))}
            </div>
          ) : !isLoading ? (
            <EmptyState
              icon={<Palette />}
              title={
                templateQuery.trim()
                  ? "No templates match your search."
                  : "No theme templates yet. Create your first template to unlock profiles."
              }
            />
          ) : null}
        </section>

        {/* Two-column body: live preview (left) + controls (right) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <SectionCard
            icon={<Palette />}
            title="Live preview"
            description="A snapshot of how your admin will look."
          >
            <ThemeLivePreview tokens={activePreviewTokens} />
          </SectionCard>

          <div className="flex flex-col gap-6">
            <SectionCard
              icon={<Search />}
              title="Templates"
              description="Reusable token sets that power your profiles."
            >
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-9"
                  value={templateQuery}
                  onChange={(event) => setTemplateQuery(event.target.value)}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {templateQuery.trim()
                  ? `${filteredTemplateCards.length} of ${templateCards.length} templates`
                  : `${templateCards.length} templates`}
              </p>
            </SectionCard>
            {activeProfile ? (
              <p className="text-xs text-muted-foreground">
                Active profile: <span className="font-medium">{activeProfile.name}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Profiles — preset cards w/ active ring + Activate */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Profiles</h2>
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

          {profileCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
            </div>
          ) : !isLoading ? (
            <EmptyState
              icon={<Palette />}
              title="Create a profile to activate a template for your admin UI."
            />
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
