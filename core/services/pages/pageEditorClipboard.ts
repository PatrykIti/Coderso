import {
  createPageDocumentId,
  normalizePageDocumentV2ForWrite,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "./pageDocumentV2";
import { duplicatePageBlockTreeWithNewIds } from "./pageBlockPaths";

export const PAGE_EDITOR_CLIPBOARD_MIME = "coderso/page-fragment@v1" as const;

export type PageEditorClipboardKind = "section" | "block";

export type PageEditorClipboardPayload = {
  clip: typeof PAGE_EDITOR_CLIPBOARD_MIME;
  kind: PageEditorClipboardKind;
  data: unknown;
};

const syntheticDocument = (sections: unknown[]): Record<string, unknown> => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

const syntheticSection = (block: unknown): Record<string, unknown> => ({
  id: "clipboard-section",
  type: "content",
  name: "Clipboard",
  variant: "default",
  layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
  style: {
    background: "#ffffff",
    backgroundType: "color",
    accent: "#0d9488",
    radius: 0,
    shadow: "none",
  },
  spacing: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingLeft: 40,
    paddingRight: 40,
    gap: 24,
  },
  visibility: { visible: true, authOnly: false },
  responsive: {},
  blocks: [block],
});

export const serializePageEditorClipboardPayload = (
  kind: PageEditorClipboardKind,
  data: PageSectionV2 | PageBlockV2
): string =>
  JSON.stringify({
    clip: PAGE_EDITOR_CLIPBOARD_MIME,
    kind,
    data,
  } satisfies PageEditorClipboardPayload);

const parsePayload = (value: string): PageEditorClipboardPayload | null => {
  try {
    const parsed = JSON.parse(value) as Partial<PageEditorClipboardPayload>;
    if (parsed.clip !== PAGE_EDITOR_CLIPBOARD_MIME) return null;
    if (parsed.kind !== "section" && parsed.kind !== "block") return null;
    return { clip: parsed.clip, kind: parsed.kind, data: parsed.data };
  } catch {
    return null;
  }
};

const duplicateSectionWithNewIds = (section: PageSectionV2): PageSectionV2 => ({
  ...section,
  id: createPageDocumentId("sec"),
  name: `${section.name} copy`,
  blocks: section.blocks.map(duplicatePageBlockTreeWithNewIds),
});

export const parsePageEditorClipboardFragment = (
  value: string
): { kind: "section"; section: PageSectionV2 } | { kind: "block"; block: PageBlockV2 } | null => {
  const payload = parsePayload(value);
  if (!payload) return null;

  try {
    if (payload.kind === "section") {
      const document = normalizePageDocumentV2ForWrite(syntheticDocument([payload.data]));
      const section = document.sections[0];
      return section ? { kind: "section", section: duplicateSectionWithNewIds(section) } : null;
    }

    const document = normalizePageDocumentV2ForWrite(
      syntheticDocument([syntheticSection(payload.data)])
    );
    const block = document.sections[0]?.blocks[0];
    return block ? { kind: "block", block: duplicatePageBlockTreeWithNewIds(block) } : null;
  } catch {
    return null;
  }
};

export const insertSectionAfter = (
  document: PageDocumentV2,
  selectedSectionId: string | null,
  section: PageSectionV2
): PageDocumentV2 => {
  const sections = [...document.sections];
  const selectedIndex = selectedSectionId
    ? sections.findIndex((candidate) => candidate.id === selectedSectionId)
    : -1;
  sections.splice(selectedIndex >= 0 ? selectedIndex + 1 : sections.length, 0, section);
  return { ...document, sections };
};
