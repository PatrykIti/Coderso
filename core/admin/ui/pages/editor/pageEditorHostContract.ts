import type { ReactNode } from "react";

import type {
  PageBlockType,
  PageBreakpoint,
  PageDocumentV2,
  PageSectionType,
  PageSectionV2,
} from "../../../../services/pages/pageDocumentV2";

export type PageEditorResourceStatus = "draft" | "published" | "scheduled" | "archived";

export type PageEditorResourceAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageEditorResourceDetail = {
  id: string;
  title: string;
  slug: string;
  status: PageEditorResourceStatus;
  currentData: Record<string, unknown>;
  publishedData?: Record<string, unknown> | null;
  updatedAt: string;
  publishedAt?: string | null;
  authorId?: string | null;
  author?: PageEditorResourceAuthor | null;
};

export type PageEditorHostLoadOptions = {
  force?: boolean;
};

export type PageEditorHostFreshnessMode = "updatedAt" | "forced-clean-replace";

// Stale, same-timestamp, or malformed cached records fail closed for hosts
// whose detail payload owns an authoritative updatedAt timestamp.
export const isNewerPageDetailTimestamp = (candidate: string, loaded: string): boolean => {
  const candidateMs = Date.parse(candidate);
  const loadedMs = Date.parse(loaded);
  if (Number.isNaN(candidateMs) || Number.isNaN(loadedMs)) return false;
  return candidateMs > loadedMs;
};

export const shouldApplyFreshPageEditorDetail = ({
  current,
  fresh,
  isDirty,
  mode,
}: {
  current: PageEditorResourceDetail | null;
  fresh: PageEditorResourceDetail;
  isDirty: boolean;
  mode: PageEditorHostFreshnessMode;
}) => {
  if (isDirty) return false;
  if (!current) return true;
  if (mode === "forced-clean-replace") return true;
  return isNewerPageDetailTimestamp(fresh.updatedAt, current.updatedAt);
};

export type PageEditorPreviewProbeFailureReason =
  | "unreachable"
  | "http_error"
  | "redirect_blocked"
  | "timeout"
  | "invalid_target";

export type PageEditorPreviewProbeResult =
  | {
      ok: true;
      status?: number;
      targetLabel: string;
    }
  | {
      ok: false;
      status?: number;
      reason: PageEditorPreviewProbeFailureReason;
      targetLabel: string;
    };

export type PageEditorRevisionKind = "publish" | "autosave";

export type PageEditorRevision = {
  id: string;
  pageId: string;
  version: number;
  kind: PageEditorRevisionKind;
  title?: string | null;
  slug?: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: PageEditorResourceAuthor | null;
};

export type PageEditorHostRevisions = {
  list: (id: string) => Promise<PageEditorRevision[]>;
  restore: (
    id: string,
    revisionId: string
  ) => Promise<{
    ok: boolean;
    restored: boolean;
    revision: PageEditorRevision;
    page: PageEditorResourceDetail;
  }>;
  discard: (id: string, revisionId: string) => Promise<{ ok: boolean }>;
};

export type PageEditorHostPreviewResponse = {
  previewUrl: string;
  probe?: PageEditorPreviewProbeResult;
};

/**
 * Hosts that return the post-publish detail let the editor adopt the
 * authoritative status/timestamps instead of hand-building a page object.
 */
export type PageEditorHostPublishResult = {
  ok?: boolean;
  page?: PageEditorResourceDetail | null;
};

export type PageEditorHostSettingsRenderProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: PageEditorResourceDetail | null;
  onSaved: (detail: PageEditorResourceDetail) => void;
};

/**
 * Host-side palette scoping (TASK-458-03): when present, the listed types
 * INTERSECT the globally insertable section/block options everywhere insert
 * choices surface (command palette, ghost tiles, add-beside). The palette
 * can only narrow the global capability tables, never widen them — gated
 * types (e.g. the `navigation` section) stay gated even when listed.
 * Absent palette (page + page-template hosts) keeps the full catalog.
 */
export type PageEditorHostPalette = {
  sections?: PageSectionType[];
  blocks?: PageBlockType[];
};

export type PageEditorHostAppearancePanelProps = {
  document: PageDocumentV2;
  device: PageBreakpoint;
  /** Draft-discipline write path: patches mark the document unsaved. */
  updateDocument: (updater: (current: PageDocumentV2) => PageDocumentV2) => void;
};

/**
 * Host-owned floating-toolbar panel (TASK-458-03): rendered as an extra
 * always-available panel tab ahead of the registry panels. The menu host
 * uses it to expose the menu appearance controls through the shared control
 * primitives, writing into the document draft.
 */
export type PageEditorHostAppearancePanel = {
  label: string;
  description: string;
  render: (props: PageEditorHostAppearancePanelProps) => ReactNode;
};

export type PageEditorHostCanvasChromeProps = {
  document: PageDocumentV2;
  device: PageBreakpoint;
};

/**
 * Document host abstraction: the Page Editor v2 surface (canvas, floating
 * panel, registry control pipeline, inline edit) is shared verbatim between
 * Pages and Page Templates. Hosts only swap the page-chrome concerns: load
 * and save endpoints, cache keys, publish/revisions availability, preview
 * issuance, the settings sheet, and assistant surface advertisement.
 */
export type PageEditorHost = {
  mode: "page" | "page-template";
  resourceLabel: string;
  settingsLabel: string;
  previewTitle: string;
  loadFailedMessage: string;
  /** Advertise the assistant active surface only when the host owns one. */
  assistantSurface: boolean;
  detailCacheKey: (id: string) => string;
  getCachedDetail: (id: string) => PageEditorResourceDetail | null;
  freshnessMode?: PageEditorHostFreshnessMode;
  loadDetail: (
    id: string,
    options?: PageEditorHostLoadOptions
  ) => Promise<PageEditorResourceDetail | null>;
  saveDocument: (id: string, document: PageDocumentV2) => Promise<PageEditorResourceDetail>;
  autosaveDocument?: (id: string, document: PageDocumentV2) => Promise<unknown>;
  publish?: (
    id: string,
    document: PageDocumentV2
  ) => Promise<PageEditorHostPublishResult | null | undefined>;
  /**
   * Preview-token issuance. Optional (TASK-458-03): hosts without a preview
   * route (menus — the live canvas IS the preview) omit it and the toolbar
   * preview affordance is hidden, consistent with publish/revisions.
   */
  preview?: (id: string) => Promise<PageEditorHostPreviewResponse>;
  revisions?: PageEditorHostRevisions;
  /** Page-chrome settings: defaults to the page settings sheet when omitted. */
  renderSettings?: (props: PageEditorHostSettingsRenderProps) => ReactNode;
  /** Published reusable templates offered by the insert/apply picker. */
  templateLibrary?: {
    listPublished: () => Promise<{ id: string; name: string; description: string | null }[]>;
    instantiateSections: (id: string) => Promise<PageSectionV2[]>;
  };
  /** Host-side narrowing of the insertable section/block options. */
  palette?: PageEditorHostPalette;
  /** Extra host-owned floating-toolbar panel (e.g. menu appearance). */
  appearancePanel?: PageEditorHostAppearancePanel;
  /**
   * Host-owned chrome rendered inside the canvas frame above the document
   * sections (e.g. the live menu shell preview). Receives the CURRENT draft
   * so it restyles live as the panel edits it.
   */
  canvasChrome?: (props: PageEditorHostCanvasChromeProps) => ReactNode;
};
