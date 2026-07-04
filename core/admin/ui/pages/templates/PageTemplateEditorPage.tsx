import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import type { PageDetail } from "@/services/pagesClient";
import {
  getCachedPageTemplateDetail,
  getPageTemplateCached,
  previewPageTemplate,
  updatePageTemplate,
  type PageTemplateDetail,
  type PageTemplateStatus,
} from "@/services/pageTemplatesClient";

import { PageEditor } from "../PageEditor";
import type {
  PageEditorHost,
  PageEditorHostSettingsRenderProps,
} from "../editor/pageEditorHostContract";
import { SegmentedControl } from "../editorControls";

/**
 * The Page Templates editor IS the Page Editor v2 surface bound to a
 * template document through the editor host seam: same canvas renderer,
 * inline-edit contract, registry control pipeline, and floating panel.
 * Only page chrome differs: the template metadata sheet replaces page
 * publish/SEO chrome, and revisions/autosave/assistant surfaces are not
 * advertised because templates do not own those contracts in v1.
 */

const toEditorDetail = (template: PageTemplateDetail): PageDetail => ({
  id: template.id,
  title: template.name,
  slug: template.slug,
  status: template.status,
  currentData: template.document,
  updatedAt: template.updatedAt,
});

const resolveTemplateId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const templatesIndex = parts.findIndex((segment) => segment === "page-templates");
  if (templatesIndex === -1) return null;
  return parts[templatesIndex + 1] ?? null;
};

const resolveSheetError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to save template settings.";
};

type TemplateSettingsFormProps = {
  templateId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (detail: PageDetail) => void;
};

const TemplateSettingsForm = ({ templateId, onOpenChange, onSaved }: TemplateSettingsFormProps) => {
  const cached = getCachedPageTemplateDetail(templateId);
  const [name, setName] = useState(cached?.name ?? "");
  const [slug, setSlug] = useState(cached?.slug ?? "");
  const [description, setDescription] = useState(cached?.description ?? "");
  const [category, setCategory] = useState(cached?.category ?? "");
  const [status, setStatus] = useState<PageTemplateStatus>(cached?.status ?? "draft");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePageTemplate(templateId, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() ? description.trim() : null,
        category: category.trim() ? category.trim() : null,
        status,
      });
      if (updated) {
        onSaved(toEditorDetail(updated));
      }
      onOpenChange(false);
    } catch (saveError) {
      setError(resolveSheetError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Name</div>
        <Input
          aria-label="Template name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Slug</div>
        <Input
          aria-label="Template slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Description</div>
        <Textarea
          aria-label="Template description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Category</div>
        <Input
          aria-label="Template category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </div>
      {/* Dedicated-widget contract: status renders as the shared segmented
          control (Draft | Published), never a native select. The stored enum
          tokens stay lowercase; only the display labels are capitalized. */}
      <div
        className="rounded-xl border border-border bg-muted/40 p-2"
        data-page-template-status-control="true"
      >
        <SegmentedControl
          label="Status"
          value={status}
          options={["draft", "published"]}
          optionLabels={{ draft: "Draft", published: "Published" }}
          onChange={(next) => setStatus(next === "published" ? "published" : "draft")}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Published templates are offered by the page editor insert picker. Draft templates stay
        library-only.
      </p>
      <Button type="button" disabled={isSaving || !name.trim()} onClick={handleSave}>
        {isSaving ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
};

const TemplateSettingsSheet = ({
  open,
  onOpenChange,
  detail,
  onSaved,
}: PageEditorHostSettingsRenderProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="space-y-6 p-6">
      <div>
        <SheetTitle>Template settings</SheetTitle>
        <SheetDescription>
          Template metadata. Template settings, SEO, and breakpoints never apply to target pages —
          only sections are inserted.
        </SheetDescription>
      </div>
      {detail ? (
        <TemplateSettingsForm
          key={`${detail.id}:${open ? "open" : "closed"}`}
          templateId={detail.id}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </SheetContent>
  </Sheet>
);

/**
 * Always-visible propagation cue rendered by the host `canvasChrome` seam
 * (inside the canvas frame, above the document sections) — the same seam the
 * Menus editor uses for its live shell preview, so the editor shell is reused,
 * not forked. Ports the prototype's "edit once, update everywhere" note.
 *
 * HONESTY GUARD: generic copy only — `PageTemplateDetail` carries no usage
 * field, so this never fabricates a page count. OWNERSHIP: kept page-scoped —
 * a template can be the site footer (site.footerTemplateId); the header/main
 * menu is a Menu (site.navigationMenuId, owned by TASK-479-10), not a template.
 */
const TemplatePropagationBanner = () => (
  <Card className="mx-auto mb-3 flex max-w-3xl flex-row items-center gap-3 bg-primary-soft/50 p-3">
    <RefreshCw className="size-5 shrink-0 text-primary" />
    <p className="text-sm text-muted-foreground">
      Editing this template updates every page that uses it.
    </p>
  </Card>
);

export function PageTemplateEditorPage({ templateId }: { templateId?: string }) {
  const [resolvedTemplateId] = useState<string | null>(() => {
    if (templateId) return templateId;
    if (typeof window === "undefined") return null;
    return resolveTemplateId(window.location.pathname);
  });

  const host = useMemo<PageEditorHost>(
    () => ({
      mode: "page-template",
      resourceLabel: "Page Templates",
      settingsLabel: "Template settings",
      previewTitle: "Template preview",
      loadFailedMessage: "Failed to load page template.",
      assistantSurface: false,
      detailCacheKey: (id) => cacheKeys.pageTemplateDetail(id),
      getCachedDetail: (id) => {
        const cached = getCachedPageTemplateDetail(id);
        return cached ? toEditorDetail(cached) : null;
      },
      loadDetail: async (id, options) => {
        const detail = await getPageTemplateCached(id, { force: options?.force });
        return detail ? toEditorDetail(detail) : null;
      },
      saveDocument: async (id, document) => {
        const updated = await updatePageTemplate(id, {
          document: document as unknown as Record<string, unknown>,
        });
        if (!updated) throw new Error("Failed to save page template.");
        return toEditorDetail(updated);
      },
      preview: async (id) => {
        const response = await previewPageTemplate(id, { ttlMinutes: 15 });
        return { previewUrl: response.previewUrl };
      },
      renderSettings: (props) => <TemplateSettingsSheet {...props} />,
      // Surface the propagation context as ALWAYS-VISIBLE canvas chrome via the
      // existing optional `canvasChrome` host field (same seam the Menus editor
      // uses), keeping the note visible without forking/wrapping the shared
      // editor and without any host-contract change. The banner is static, so it
      // ignores the document/device props.
      canvasChrome: () => <TemplatePropagationBanner />,
    }),
    []
  );

  return (
    <PageEditor
      key={resolvedTemplateId ?? "missing"}
      pageId={resolvedTemplateId ?? undefined}
      host={host}
    />
  );
}
