import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Copy,
  Eye,
  History,
  Layers,
  LayoutPanelTop,
  ListPlus,
  MonitorSmartphone,
  PanelTop,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Type,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError, isSessionExpiredApiError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  discardPageRevision,
  getCachedPageDetail,
  getPageCached,
  listPageRevisions,
  previewPage,
  publishPage,
  restorePageRevision,
  autosavePage,
  updatePage,
  type PageDetail,
  type PageRevision,
  type PreviewProbeResult,
} from "@/services/pagesClient";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { createAdminActionToastAdapter } from "@/ui/shared/actionToasts";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  clearResponsiveOverride,
  createPageBlockV2,
  createPageDocumentId,
  createPageSectionV2,
  normalizeStoredPageDocumentV2ForRead,
  resolvePageSectionForBreakpoint,
  type PageBlockType,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionType,
  type PageSectionV2,
} from "../../../services/pages/pageDocumentV2";
import { normalizePageRevisionRetentionValue } from "../../../services/pages/revisionRetention";
import { DeviceSwitcher } from "./DeviceSwitcher";

export type PageEditorProps = {
  pageId?: string;
  initialPage?: PageDetail | null;
};

type ToolbarPanel = "layout" | "content" | "style" | "spacing" | "responsive" | "visibility";

type SectionOption = {
  type: PageSectionType;
  label: string;
  description: string;
};

type BlockOption = {
  type: PageBlockType;
  label: string;
  description: string;
};

const pageEditorActionToasts = createAdminActionToastAdapter({
  actions: {
    saveDraft: {
      success: "Draft saved.",
      errorFallback: "Failed to save draft.",
    },
    publish: {
      success: "Page published.",
      errorFallback: "Failed to publish page.",
    },
  },
});

const sectionOptions: SectionOption[] = [
  { type: "hero", label: "Hero", description: "Headline, copy, and primary action." },
  { type: "content", label: "Content", description: "Simple text-led section." },
  { type: "feature-grid", label: "Feature grid", description: "Cards or repeated highlights." },
  { type: "media-split", label: "Media split", description: "Copy next to image or video." },
  { type: "gallery", label: "Gallery", description: "Visual collection section." },
  { type: "lead-form", label: "Lead form", description: "Form-focused conversion section." },
  { type: "faq", label: "FAQ", description: "Question and answer content." },
  { type: "cta", label: "CTA", description: "Focused call to action." },
];

const blockOptions: BlockOption[] = [
  { type: "heading", label: "Heading", description: "Section title or subheading." },
  { type: "text", label: "Text", description: "Paragraph copy." },
  { type: "button", label: "Button", description: "Clickable call to action." },
  { type: "image", label: "Image", description: "Image from media or URL." },
  { type: "list", label: "List", description: "Bulleted or numbered points." },
  { type: "card", label: "Card", description: "Compact title and body block." },
  { type: "divider", label: "Divider", description: "Visual separator." },
  { type: "spacer", label: "Spacer", description: "Vertical rhythm control." },
];

const canvasDeviceFrameClassMap: Record<PageBreakpoint, string> = {
  desktop: "max-w-[1080px]",
  tablet: "max-w-[744px]",
  mobile: "max-w-[390px]",
};

const pageEditorStatusBadgeClassName = (status: string) =>
  status === "published"
    ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800";

const resolvePageId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const pageIndex = parts.findIndex((segment) => segment === "pages");
  if (pageIndex === -1) return null;
  return parts[pageIndex + 1] ?? null;
};

const cloneDocument = (document: PageDocumentV2): PageDocumentV2 =>
  JSON.parse(JSON.stringify(document)) as PageDocumentV2;

const readText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolvePageEditorMutationError = (action: "saveDraft" | "publish", error: unknown) => {
  if (isSessionExpiredApiError(error)) {
    const message =
      action === "publish"
        ? "Your admin session expired. Sign in again before publishing."
        : "Your admin session expired. Sign in again before saving.";
    pageEditorActionToasts.error(action, {
      ...(typeof error === "object" && error !== null ? error : {}),
      name: "ApiClientError",
      code: "session_expired",
      status: 401,
      message,
    });
    return message;
  }
  return pageEditorActionToasts.error(action, error);
};

const resolveInlineError = (error: unknown, fallback: string) => {
  if (isSessionExpiredApiError(error)) return "Your admin session expired. Sign in again.";
  if (isApiClientError(error)) return error.message;
  return fallback;
};

const normalizePageData = (data?: Record<string, unknown> | null): PageDocumentV2 =>
  normalizeStoredPageDocumentV2ForRead(data);

const createStarterSection = (type: PageSectionType) => {
  const blocks =
    type === "hero"
      ? [
          createPageBlockV2("heading", {
            props: { text: "Build with Coderso", level: "h1", align: "center" },
          }),
          createPageBlockV2("text", {
            props: {
              text: "Compose sections and atomic blocks directly on the canvas.",
              format: "plain",
              align: "center",
            },
          }),
          createPageBlockV2("button", {
            props: {
              label: "Primary action",
              href: "/",
              target: "self",
              variant: "primary",
              size: "md",
            },
          }),
        ]
      : [
          createPageBlockV2("heading", {
            props: { text: `${type.replace(/-/g, " ")} section`, level: "h2", align: "left" },
          }),
          createPageBlockV2("text", {
            props: { text: "Add focused content blocks here.", format: "plain", align: "left" },
          }),
        ];
  return createPageSectionV2(type, { blocks });
};

const duplicateSectionWithIds = (section: PageSectionV2): PageSectionV2 => ({
  ...cloneDocument({
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [section],
  }).sections[0]!,
  id: createPageDocumentId("sec"),
  name: `${section.name} copy`,
  blocks: section.blocks.map((block) => ({ ...block, id: createPageDocumentId("blk") })),
});

const summarizeSectionsForAssistant = (sections: PageSectionV2[]) =>
  sections.map((section, sectionIndex) => ({
    id: section.id,
    type: section.type,
    name: section.name,
    path: `sections.${sectionIndex}`,
    blockCount: section.blocks.length,
    blocks: section.blocks.map((block, blockIndex) => ({
      id: block.id,
      type: block.type,
      label: readText(block.props.text) || readText(block.props.label) || null,
      path: `sections.${sectionIndex}.blocks.${blockIndex}`,
      childCount: 0,
      slotKeys: [],
      templateId: null,
      templateName: null,
    })),
  }));

const SectionCanvas = ({
  section,
  selected,
  onSelect,
}: {
  section: PageSectionV2;
  selected: boolean;
  onSelect: () => void;
}) => (
  <section
    className={`group relative rounded border bg-white p-6 shadow-sm transition ${
      selected
        ? "border-primary ring-2 ring-primary/20"
        : "border-transparent hover:border-primary/40"
    }`}
    data-page-editor-section={section.type}
    onClick={(event) => {
      event.stopPropagation();
      onSelect();
    }}
  >
    <div className="absolute -top-3 left-4 hidden rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground group-hover:block group-focus-within:block">
      {section.name} · {section.variant}
    </div>
    <div className="grid gap-3">
      {section.blocks.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Add the first block
        </div>
      ) : (
        section.blocks.map((block) => (
          <div
            key={block.id}
            className="rounded border border-dashed border-transparent p-2 hover:border-primary/30"
            data-page-editor-block={block.type}
          >
            <BlockPreview block={block} />
          </div>
        ))
      )}
    </div>
  </section>
);

const BlockPreview = ({ block }: { block: PageBlockV2 }) => {
  if (block.type === "heading") {
    return <h2 className="text-3xl font-semibold">{readText(block.props.text, "Heading")}</h2>;
  }
  if (block.type === "button") {
    return (
      <span className="inline-flex rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        {readText(block.props.label, "Button")}
      </span>
    );
  }
  if (block.type === "image") {
    return (
      <div className="rounded bg-muted p-8 text-center text-sm text-muted-foreground">Image</div>
    );
  }
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      {readText(block.props.text, block.type)}
    </p>
  );
};

export function PageEditor({ pageId: initialPageId, initialPage }: PageEditorProps) {
  const [pageId] = useState<string | null>(() => {
    if (initialPageId ?? initialPage?.id) return initialPageId ?? initialPage?.id ?? null;
    if (typeof window === "undefined") return null;
    return resolvePageId(window.location.pathname);
  });
  const initialCachedPage = useMemo(
    () => (!initialPage && pageId ? getCachedPageDetail(pageId) : null),
    [initialPage, pageId]
  );
  const initialPageDetail = initialPage ?? initialCachedPage;
  const [page, setPage] = useState<PageDetail | null>(initialPageDetail ?? null);
  const [pageDocument, setPageDocument] = useState<PageDocumentV2>(() =>
    normalizePageData(initialPageDetail?.currentData)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => pageDocument.sections[0]?.id ?? null
  );
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialPageDetail && Boolean(pageId));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [layersOpen, setLayersOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolbarPanel>("content");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(initialPageDetail?.title ?? "Homepage");
  const [settingsSlug, setSettingsSlug] = useState(initialPageDetail?.slug ?? "/");
  const [showInNav, setShowInNav] = useState(pageDocument.settings.showInNav);
  const [revisionRetention, setRevisionRetention] = useState(
    normalizePageRevisionRetentionValue(pageDocument.settings.revisionRetention)
  );
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [discardingRevisionId, setDiscardingRevisionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewProbe, setPreviewProbe] = useState<PreviewProbeResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedSection =
    pageDocument.sections.find((section) => section.id === selectedSectionId) ?? null;
  const resolvedSelectedSection = selectedSection
    ? resolvePageSectionForBreakpoint(selectedSection, device)
    : null;

  const filteredSections = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return query
      ? sectionOptions.filter((option) =>
          `${option.label} ${option.description}`.toLowerCase().includes(query)
        )
      : sectionOptions;
  }, [commandQuery]);
  const filteredBlocks = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    return query
      ? blockOptions.filter((option) =>
          `${option.label} ${option.description}`.toLowerCase().includes(query)
        )
      : blockOptions;
  }, [commandQuery]);

  const setDocumentDraft = useCallback((updater: (current: PageDocumentV2) => PageDocumentV2) => {
    setPageDocument((current) => updater(cloneDocument(current)));
    setHasUnsavedChanges(true);
  }, []);

  const updateSelectedSection = useCallback(
    (updater: (section: PageSectionV2) => PageSectionV2) => {
      if (!selectedSectionId) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? updater(section) : section
        ),
      }));
    },
    [selectedSectionId, setDocumentDraft]
  );

  const updateSectionGroup = useCallback(
    <Key extends "layout" | "style" | "spacing" | "visibility">(
      key: Key,
      patch: Partial<PageSectionV2[Key]>
    ) => {
      updateSelectedSection((section) => {
        if (device === "desktop") {
          return { ...section, [key]: { ...section[key], ...patch } };
        }
        return {
          ...section,
          responsive: {
            ...section.responsive,
            [device]: {
              ...(section.responsive[device] ?? {}),
              [key]: {
                ...((section.responsive[device]?.[key] as Record<string, unknown> | undefined) ??
                  {}),
                ...patch,
              },
            },
          },
        };
      });
    },
    [device, updateSelectedSection]
  );

  const updateFirstBlockProps = useCallback(
    (patch: Record<string, unknown>) => {
      updateSelectedSection((section) => ({
        ...section,
        blocks: section.blocks.map((block, index) =>
          index === 0 ? { ...block, props: { ...block.props, ...patch } } : block
        ),
      }));
    },
    [updateSelectedSection]
  );

  const addSection = useCallback(
    (type: PageSectionType) => {
      const section = createStarterSection(type);
      setDocumentDraft((current) => ({ ...current, sections: [...current.sections, section] }));
      setSelectedSectionId(section.id);
      setCommandOpen(false);
      setCommandQuery("");
    },
    [setDocumentDraft]
  );

  const addBlock = useCallback(
    (type: PageBlockType) => {
      if (!selectedSectionId) {
        addSection("content");
        return;
      }
      const block = createPageBlockV2(type);
      updateSelectedSection((section) => ({ ...section, blocks: [...section.blocks, block] }));
      setCommandOpen(false);
      setCommandQuery("");
    },
    [addSection, selectedSectionId, updateSelectedSection]
  );

  const moveSelectedSection = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSectionId) return;
      setDocumentDraft((current) => {
        const index = current.sections.findIndex((section) => section.id === selectedSectionId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.sections.length) return current;
        const sections = [...current.sections];
        const [section] = sections.splice(index, 1);
        if (!section) return current;
        sections.splice(target, 0, section);
        return { ...current, sections };
      });
    },
    [selectedSectionId, setDocumentDraft]
  );

  const duplicateSelectedSection = useCallback(() => {
    if (!selectedSection) return;
    const duplicate = duplicateSectionWithIds(selectedSection);
    setDocumentDraft((current) => {
      const index = current.sections.findIndex((section) => section.id === selectedSection.id);
      const sections = [...current.sections];
      sections.splice(index + 1, 0, duplicate);
      return { ...current, sections };
    });
    setSelectedSectionId(duplicate.id);
  }, [selectedSection, setDocumentDraft]);

  const deleteSelectedSection = useCallback(() => {
    if (!selectedSectionId) return;
    setDocumentDraft((current) => {
      const sections = current.sections.filter((section) => section.id !== selectedSectionId);
      return { ...current, sections };
    });
    setSelectedSectionId(null);
  }, [selectedSectionId, setDocumentDraft]);

  useEffect(() => {
    if (!pageId || initialPageDetail) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loaded = await getPageCached(pageId);
        if (cancelled) return;
        setPage(loaded);
        const document = normalizePageData(loaded?.currentData);
        setPageDocument(document);
        setSelectedSectionId(document.sections[0]?.id ?? null);
        setSettingsTitle(loaded?.title ?? "Homepage");
        setSettingsSlug(loaded?.slug ?? "/");
        setShowInNav(document.settings.showInNav);
        setRevisionRetention(
          normalizePageRevisionRetentionValue(document.settings.revisionRetention)
        );
      } catch (loadError) {
        if (!cancelled) setError(resolveInlineError(loadError, "Failed to load page."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialPageDetail, pageId]);

  useEffect(() => {
    if (!page) return;
    setActiveAssistantSurfaceContext({
      kind: "page",
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        template: pageDocument.settings.template,
      },
      selectedSectionId,
      selectedBlockId: null,
      sections: summarizeSectionsForAssistant(pageDocument.sections),
      warnings: hasUnsavedChanges ? ["page_has_unsaved_changes"] : [],
    });
    return () => clearActiveAssistantSurfaceContext();
  }, [hasUnsavedChanges, page, pageDocument, selectedSectionId]);

  useEffect(() => {
    if (!pageId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.pageDetail(pageId)) return;
      if (hasUnsavedChanges) return;
      const cached = getCachedPageDetail(pageId);
      if (!cached) return;
      setPage(cached);
      setPageDocument(normalizePageData(cached.currentData));
    });
  }, [hasUnsavedChanges, pageId]);

  useEffect(() => {
    if (!page || !hasUnsavedChanges) return undefined;
    const timeoutId = window.setTimeout(() => {
      void autosavePage(page.id, { data: pageDocument });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [hasUnsavedChanges, page, pageDocument]);

  const saveCurrentDraft = useCallback(async () => {
    if (!page) return null;
    const updated = await updatePage(page.id, { data: pageDocument });
    setPage(updated);
    setPageDocument(normalizePageData(updated.currentData));
    setHasUnsavedChanges(false);
    return updated;
  }, [page, pageDocument]);

  const handleSaveDraft = async () => {
    if (!page) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveCurrentDraft();
      pageEditorActionToasts.success("saveDraft");
    } catch (saveError) {
      setError(resolvePageEditorMutationError("saveDraft", saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page) return;
    setIsPublishing(true);
    setError(null);
    try {
      await publishPage(page.id, pageDocument);
      setPage({ ...page, status: "published" });
      setHasUnsavedChanges(false);
      pageEditorActionToasts.success("publish");
    } catch (publishError) {
      setError(resolvePageEditorMutationError("publish", publishError));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!page) return;
    setIsSaving(true);
    setError(null);
    try {
      const nextDocument: PageDocumentV2 = {
        ...pageDocument,
        settings: {
          ...pageDocument.settings,
          showInNav,
          revisionRetention,
        },
      };
      const updated = await updatePage(page.id, {
        title: settingsTitle.trim(),
        slug: settingsSlug.startsWith("/") ? settingsSlug : `/${settingsSlug}`,
        data: nextDocument,
      });
      setPage(updated);
      setPageDocument(normalizePageData(updated.currentData));
      setHasUnsavedChanges(false);
      setSettingsOpen(false);
      pageEditorActionToasts.success("saveDraft");
    } catch (settingsError) {
      setError(resolvePageEditorMutationError("saveDraft", settingsError));
    } finally {
      setIsSaving(false);
    }
  };

  const openRevisions = async () => {
    if (!page) return;
    setRevisionsOpen(true);
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      setRevisions(await listPageRevisions(page.id));
    } catch (revisionError) {
      setRevisionsError(resolveInlineError(revisionError, "Failed to load page history."));
    } finally {
      setRevisionsLoading(false);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    if (!page) return;
    setRestoringRevisionId(revisionId);
    try {
      const result = await restorePageRevision(page.id, revisionId);
      if (result.page) {
        setPage(result.page);
        setPageDocument(normalizePageData(result.page.currentData));
        setHasUnsavedChanges(false);
      }
      setRevisions(await listPageRevisions(page.id));
    } catch (restoreError) {
      setRevisionsError(resolveInlineError(restoreError, "Failed to restore revision."));
    } finally {
      setRestoringRevisionId(null);
    }
  };

  const discardRevision = async (revisionId: string) => {
    if (!page) return;
    setDiscardingRevisionId(revisionId);
    try {
      await discardPageRevision(page.id, revisionId);
      setRevisions(await listPageRevisions(page.id));
    } catch (discardError) {
      setRevisionsError(resolveInlineError(discardError, "Failed to discard revision."));
    } finally {
      setDiscardingRevisionId(null);
    }
  };

  const handlePreview = async () => {
    if (!page) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const previewPageId = hasUnsavedChanges ? (await saveCurrentDraft())?.id : page.id;
      if (!previewPageId) return;
      const response = await previewPage(previewPageId, { ttlMinutes: 15, probe: true });
      setPreviewUrl(response.previewUrl);
      setPreviewProbe(response.probe ?? null);
      setPreviewOpen(true);
    } catch (previewErrorValue) {
      setPreviewError(resolveInlineError(previewErrorValue, "Failed to generate preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const topbarActions = (
    <div className="flex items-center gap-2">
      <DeviceSwitcher value={device} onChange={setDevice} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setLayersOpen((open) => !open)}
      >
        <Layers className="h-4 w-4" />
        Layers
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings2 className="h-4 w-4" />
        Page settings
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={openRevisions}>
        <History className="h-4 w-4" />
        History
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={previewLoading || !page}
        onClick={handlePreview}
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isSaving || !page}
        onClick={handleSaveDraft}
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
      <Button type="button" size="sm" disabled={isPublishing || !page} onClick={handlePublish}>
        {isPublishing ? "Publishing..." : "Publish"}
      </Button>
    </div>
  );

  return (
    <EditorShell
      breadcrumbs={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Pages</span>
          <span className="text-sm font-semibold">{page?.title ?? settingsTitle}</span>
          <span className={pageEditorStatusBadgeClassName(page?.status ?? "draft")}>
            {page?.status ?? "draft"}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              Unsaved
            </span>
          ) : null}
        </div>
      }
      topbarActions={topbarActions}
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.12)_1px,transparent_0)] [background-size:24px_24px]">
        {error ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Page editor error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {previewError ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>{previewError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-center border-b bg-background/80 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
          {device === "desktop" ? "Desktop · 1080px · base view" : `${device} · override context`}
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain p-6"
          data-page-editor-canvas-scroller="true"
          onClick={() => setSelectedSectionId(null)}
        >
          <div
            className={`mx-auto min-h-full w-full rounded bg-white p-4 shadow-sm transition-all ${canvasDeviceFrameClassMap[device]}`}
            data-page-editor-canvas-frame="true"
            data-page-editor-canvas-device={device}
          >
            {isLoading ? (
              <div className="p-16 text-center text-sm text-muted-foreground">Loading page...</div>
            ) : pageDocument.sections.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-sm text-muted-foreground">This page has no sections yet.</p>
                <Button type="button" className="mt-4" onClick={() => setCommandOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add section
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCommandOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add section
                  </Button>
                </div>
                {pageDocument.sections.map((section) => (
                  <SectionCanvas
                    key={section.id}
                    section={resolvePageSectionForBreakpoint(section, device)}
                    selected={section.id === selectedSectionId}
                    onSelect={() => setSelectedSectionId(section.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {layersOpen ? (
          <div className="absolute left-4 top-16 z-20 w-72 rounded border bg-background p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Layers</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setLayersOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {pageDocument.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm ${
                    section.id === selectedSectionId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedSectionId(section.id)}
                >
                  <span>{section.name}</span>
                  <span className="text-xs uppercase text-muted-foreground">{section.type}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedSection && resolvedSelectedSection ? (
          <div className="absolute bottom-6 left-1/2 z-30 w-[min(760px,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-slate-950 p-2 text-white shadow-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <PanelTop className="h-4 w-4 text-slate-400" />
                <span className="truncate text-sm font-semibold">{selectedSection.name}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {selectedSection.variant}
                </span>
              </div>
              {[
                ["layout", LayoutPanelTop],
                ["content", Type],
                ["style", Brush],
                ["spacing", ListPlus],
                ["responsive", MonitorSmartphone],
                ["visibility", Eye],
              ].map(([panel, Icon]) => (
                <Button
                  key={panel as string}
                  type="button"
                  variant={activePanel === panel ? "secondary" : "ghost"}
                  size="icon-sm"
                  title={String(panel)}
                  onClick={() => setActivePanel(panel as ToolbarPanel)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Move up"
                onClick={() => moveSelectedSection(-1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Move down"
                onClick={() => moveSelectedSection(1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Duplicate"
                onClick={duplicateSelectedSection}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Delete"
                onClick={deleteSelectedSection}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <ToolbarSubpanel
              panel={activePanel}
              device={device}
              section={resolvedSelectedSection}
              onLayout={(patch) => updateSectionGroup("layout", patch)}
              onStyle={(patch) => updateSectionGroup("style", patch)}
              onSpacing={(patch) => updateSectionGroup("spacing", patch)}
              onVisibility={(patch) => updateSectionGroup("visibility", patch)}
              onContent={updateFirstBlockProps}
              onClearOverride={(path) => {
                if (device === "desktop") return;
                updateSelectedSection((section) => clearResponsiveOverride(section, device, path));
              }}
              onAddBlock={() => setCommandOpen(true)}
            />
          </div>
        ) : null}

        {commandOpen ? (
          <div className="absolute inset-0 z-40 flex items-start justify-center bg-background/50 p-8 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-xl border bg-background p-4 shadow-2xl">
              <div className="flex items-center gap-2 rounded border px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Search sections and blocks"
                  autoFocus
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <CommandGroup title="Sections">
                  {filteredSections.map((option) => (
                    <CommandButton
                      key={option.type}
                      label={option.label}
                      description={option.description}
                      onClick={() => addSection(option.type)}
                    />
                  ))}
                </CommandGroup>
                <CommandGroup title="Blocks">
                  {filteredBlocks.map((option) => (
                    <CommandButton
                      key={option.type}
                      label={option.label}
                      description={option.description}
                      onClick={() => addBlock(option.type)}
                    />
                  ))}
                </CommandGroup>
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="button" variant="ghost" onClick={() => setCommandOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <SettingsSheet
          open={settingsOpen}
          title={settingsTitle}
          slug={settingsSlug}
          showInNav={showInNav}
          revisionRetention={revisionRetention}
          isSaving={isSaving}
          onOpenChange={setSettingsOpen}
          onTitleChange={setSettingsTitle}
          onSlugChange={setSettingsSlug}
          onShowInNavChange={setShowInNav}
          onRevisionRetentionChange={setRevisionRetention}
          onSave={handleSettingsSave}
        />

        <HistorySheet
          open={revisionsOpen}
          revisions={revisions}
          isLoading={revisionsLoading}
          error={revisionsError}
          restoringRevisionId={restoringRevisionId}
          discardingRevisionId={discardingRevisionId}
          onOpenChange={setRevisionsOpen}
          onRestore={restoreRevision}
          onDiscard={discardRevision}
        />

        <RuntimePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="Page preview"
          canPreview={Boolean(previewUrl)}
          previewUrl={previewUrl}
          isLoading={previewLoading}
          error={previewError}
          device={device}
          onDeviceChange={setDevice}
          probeResult={previewProbe}
          iframeTitle="Page runtime preview"
        />
      </div>
    </EditorShell>
  );
}

const CommandGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const CommandButton = ({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="w-full rounded border p-3 text-left hover:bg-muted"
    onClick={onClick}
  >
    <span className="block text-sm font-semibold">{label}</span>
    <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
  </button>
);

const ToolbarSubpanel = ({
  panel,
  device,
  section,
  onLayout,
  onStyle,
  onSpacing,
  onVisibility,
  onContent,
  onClearOverride,
  onAddBlock,
}: {
  panel: ToolbarPanel;
  device: PageBreakpoint;
  section: PageSectionV2;
  onLayout: (patch: Partial<PageSectionV2["layout"]>) => void;
  onStyle: (patch: Partial<PageSectionV2["style"]>) => void;
  onSpacing: (patch: Partial<PageSectionV2["spacing"]>) => void;
  onVisibility: (patch: Partial<PageSectionV2["visibility"]>) => void;
  onContent: (patch: Record<string, unknown>) => void;
  onClearOverride: (path: readonly string[]) => void;
  onAddBlock: () => void;
}) => (
  <div className="mt-2 rounded-lg bg-white p-3 text-slate-950">
    {panel === "layout" ? (
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Columns"
          value={section.layout.columns}
          min={1}
          max={4}
          onChange={(columns) => onLayout({ columns })}
        />
        <NumberField
          label="Max width"
          value={section.layout.maxWidth}
          min={320}
          max={1920}
          onChange={(maxWidth) => onLayout({ maxWidth })}
        />
        <SelectField
          label="Align"
          value={section.layout.align}
          options={["start", "center", "end", "stretch"]}
          onChange={(align) => onLayout({ align: align as PageSectionV2["layout"]["align"] })}
        />
      </div>
    ) : null}
    {panel === "content" ? (
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <TextField
          label="Primary text"
          value={readText(section.blocks[0]?.props.text ?? section.blocks[0]?.props.label)}
          onChange={(text) => onContent({ text, label: text })}
        />
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={onAddBlock}>
            <Plus className="h-4 w-4" />
            Add block
          </Button>
        </div>
      </div>
    ) : null}
    {panel === "style" ? (
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Background"
          value={section.style.background}
          onChange={(background) => onStyle({ background })}
        />
        <TextField
          label="Accent"
          value={section.style.accent}
          onChange={(accent) => onStyle({ accent })}
        />
        <NumberField
          label="Radius"
          value={section.style.radius}
          min={0}
          max={64}
          onChange={(radius) => onStyle({ radius })}
        />
      </div>
    ) : null}
    {panel === "spacing" ? (
      <div className="grid gap-3 sm:grid-cols-5">
        <NumberField
          label="Top"
          value={section.spacing.paddingTop}
          min={0}
          max={240}
          onChange={(paddingTop) => onSpacing({ paddingTop })}
        />
        <NumberField
          label="Bottom"
          value={section.spacing.paddingBottom}
          min={0}
          max={240}
          onChange={(paddingBottom) => onSpacing({ paddingBottom })}
        />
        <NumberField
          label="Left"
          value={section.spacing.paddingLeft}
          min={0}
          max={160}
          onChange={(paddingLeft) => onSpacing({ paddingLeft })}
        />
        <NumberField
          label="Right"
          value={section.spacing.paddingRight}
          min={0}
          max={160}
          onChange={(paddingRight) => onSpacing({ paddingRight })}
        />
        <NumberField
          label="Gap"
          value={section.spacing.gap}
          min={0}
          max={120}
          onChange={(gap) => onSpacing({ gap })}
        />
      </div>
    ) : null}
    {panel === "responsive" ? (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {device === "desktop"
            ? "Desktop is the base cascade."
            : `${device} edits create overrides.`}
        </p>
        {device !== "desktop" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onClearOverride(["layout", "columns"])}
          >
            Clear columns override
          </Button>
        ) : null}
      </div>
    ) : null}
    {panel === "visibility" ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Visible"
          value={section.visibility.visible ? "yes" : "no"}
          options={["yes", "no"]}
          onChange={(value) => onVisibility({ visible: value === "yes" })}
        />
        <TextField
          label="Anchor"
          value={section.visibility.anchor ?? ""}
          onChange={(anchor) => onVisibility({ anchor })}
        />
      </div>
    ) : null}
  </div>
);

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <input
      className="rounded border px-2 py-2 text-sm font-normal normal-case text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const NumberField = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <input
      className="rounded border px-2 py-2 text-sm font-normal text-foreground"
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <select
      className="rounded border px-2 py-2 text-sm font-normal text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const SettingsSheet = ({
  open,
  title,
  slug,
  showInNav,
  revisionRetention,
  isSaving,
  onOpenChange,
  onTitleChange,
  onSlugChange,
  onShowInNavChange,
  onRevisionRetentionChange,
  onSave,
}: {
  open: boolean;
  title: string;
  slug: string;
  showInNav: boolean;
  revisionRetention: number;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onShowInNavChange: (value: boolean) => void;
  onRevisionRetentionChange: (value: number) => void;
  onSave: () => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="space-y-6 p-6">
      <div>
        <SheetTitle>Page settings</SheetTitle>
        <SheetDescription>Update metadata and publishing defaults.</SheetDescription>
      </div>
      <TextField label="Title" value={title} onChange={onTitleChange} />
      <TextField label="Slug" value={slug} onChange={onSlugChange} />
      <SelectField
        label="Show in navigation"
        value={showInNav ? "yes" : "no"}
        options={["yes", "no"]}
        onChange={(value) => onShowInNavChange(value === "yes")}
      />
      <NumberField
        label="Revision retention"
        value={revisionRetention}
        min={1}
        max={100}
        onChange={onRevisionRetentionChange}
      />
      <Button type="button" disabled={isSaving} onClick={onSave}>
        {isSaving ? "Saving..." : "Save settings"}
      </Button>
    </SheetContent>
  </Sheet>
);

const HistorySheet = ({
  open,
  revisions,
  isLoading,
  error,
  restoringRevisionId,
  discardingRevisionId,
  onOpenChange,
  onRestore,
  onDiscard,
}: {
  open: boolean;
  revisions: PageRevision[];
  isLoading: boolean;
  error: string | null;
  restoringRevisionId: string | null;
  discardingRevisionId: string | null;
  onOpenChange: (open: boolean) => void;
  onRestore: (revisionId: string) => void;
  onDiscard: (revisionId: string) => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="space-y-4 p-6">
      <div>
        <SheetTitle>Page history</SheetTitle>
        <SheetDescription>Restore published versions or manage draft autosaves.</SheetDescription>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading revisions...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!isLoading && revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No revisions yet.</p>
      ) : null}
      <div className="space-y-3">
        {revisions.map((revision) => (
          <div key={revision.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {revision.kind === "autosave" ? "Draft version" : `Version ${revision.version}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {revision.title ?? revision.slug ?? revision.id}
                </p>
              </div>
              <div className="flex gap-2">
                {revision.kind === "autosave" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={discardingRevisionId === revision.id}
                    onClick={() => onDiscard(revision.id)}
                  >
                    Discard
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={restoringRevisionId === revision.id}
                  onClick={() => onRestore(revision.id)}
                >
                  Restore
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);
