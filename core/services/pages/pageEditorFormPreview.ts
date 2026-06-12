import { normalizeFormSettings } from "../forms/formSettings";
import {
  getPageBlockActiveSlotKeys,
  resolvePageDocumentForBreakpoint,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
} from "./pageDocumentV2";
import type { PageRuntimeDataByBlockId, PageRuntimeFormBinding } from "./pageRuntimeDataBinding";

/**
 * Canvas-preview data contract for the form block (TASK-456). The Page Editor
 * fetches form details through the cached admin forms client and this module
 * maps them onto the SAME runtime binding shape the public renderer consumes
 * (`PageRuntimeFormBinding`), with explicit canvas-safe values: no submission
 * nonce, no captcha projection. Fields render regardless of form status —
 * authoring preview mirrors the runtime resolver's preview semantics — and a
 * missing/deleted form maps to the existing fail-closed error binding.
 *
 * This module must stay Bun-free and side-effect free; it never imports the
 * admin client or the runtime resolver (whose nonce path is server-only).
 */

type PageEditorFormPreviewFields = PageRuntimeFormBinding["resolution"]["fields"];

/** Structural shape of the cached admin `FormDetail` consumed by the mapper. */
export type PageEditorFormPreviewDetail = {
  form: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    successMessage: string | null;
    successRedirectUrl: string | null;
    submissionAccess: "public" | "internal";
    settings: unknown;
  };
  fields: ReadonlyArray<{
    id: string;
    type: string;
    label: string;
    name: string;
    required: boolean;
    settings: Record<string, unknown>;
    orderIndex: number;
  }>;
};

const toPreviewFields = (
  fields: PageEditorFormPreviewDetail["fields"]
): PageEditorFormPreviewFields =>
  fields.map((field) => ({
    id: field.id,
    // The admin forms client returns server-normalized fields (the
    // `normalizeFormFields` owner in `core/services/forms/validation.ts`
    // guarantees the type/settings shape on every write). The preview trusts
    // that contract structurally instead of re-running the normalizer, which
    // is not browser-safe. An out-of-vocabulary type would still fail closed:
    // `FormEmbedBlock` renders its explicit "unsupported field type" marker.
    type: field.type as PageEditorFormPreviewFields[number]["type"],
    label: field.label,
    name: field.name,
    required: field.required,
    orderIndex: field.orderIndex,
    settings: field.settings as PageEditorFormPreviewFields[number]["settings"],
  }));

const readBlockFormId = (props: Record<string, unknown> | undefined): string | null => {
  const value = props?.formId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const readBlockTitle = (props: Record<string, unknown>): string | null => {
  const value = props.title;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

/**
 * Maps one form block reference to the canvas-preview runtime binding.
 * `detail === null` means the referenced form does not exist (the cached
 * fetch resolved to nothing): the binding carries the runtime's machine
 * error so the shared renderer shows the same fail-closed boundary the
 * front would.
 */
export const buildPageEditorFormPreviewBinding = (
  formId: string,
  title: string | null,
  detail: PageEditorFormPreviewDetail | null
): PageRuntimeFormBinding => {
  if (!detail) {
    return {
      kind: "form",
      formId,
      title,
      resolution: {
        formId,
        formName: "",
        description: null,
        status: "missing",
        successMessage: null,
        successRedirectUrl: null,
        settings: normalizeFormSettings(undefined),
        submissionAccess: "public",
        submissionNonce: null,
        botProtection: null,
        fields: [],
        error: "form_not_found",
      },
    };
  }
  return {
    kind: "form",
    formId,
    title,
    resolution: {
      formId: detail.form.id,
      formName: detail.form.name,
      description: detail.form.description,
      status: detail.form.status,
      successMessage: detail.form.successMessage,
      successRedirectUrl: detail.form.successRedirectUrl,
      settings: normalizeFormSettings(detail.form.settings),
      submissionAccess: detail.form.submissionAccess,
      // Canvas-safe by construction: the preview never carries a usable
      // submission nonce or captcha projection, and the renderer disables
      // all interactivity in canvas layout mode on top of that.
      submissionNonce: null,
      botProtection: null,
      fields: toPreviewFields(detail.fields),
    },
  };
};

const walkBlocks = function* (blocks: readonly PageBlockV2[]): Generator<PageBlockV2> {
  for (const block of blocks) {
    // Hidden blocks stay included: the editor canvas renders them as ghosts
    // and a hidden form block must still preview once toggled visible.
    yield block;
    for (const slotKey of getPageBlockActiveSlotKeys(block)) {
      yield* walkBlocks(block.slots?.[slotKey] ?? []);
    }
  }
};

/**
 * Unique form ids referenced anywhere in the document, across every
 * breakpoint (base props plus responsive prop overrides), so the editor can
 * prefetch each referenced form once regardless of the active device.
 */
export const collectPageEditorFormPreviewFormIds = (document: PageDocumentV2): string[] => {
  const ids = new Set<string>();
  for (const section of document.sections) {
    for (const block of walkBlocks(section.blocks)) {
      if (block.type !== "form") continue;
      const baseId = readBlockFormId(block.props);
      if (baseId) ids.add(baseId);
      for (const override of Object.values(block.responsive ?? {})) {
        const overrideId = readBlockFormId(override?.props);
        if (overrideId) ids.add(overrideId);
      }
    }
  }
  return [...ids];
};

/**
 * Builds the canvas `runtimeDataByBlockId` map for one breakpoint from the
 * resolved document (so per-breakpoint `formId` overrides preview the right
 * form). Blocks whose form detail has not resolved yet get NO binding — the
 * renderer's canvas branch shows its loading state for them.
 */
export const buildPageEditorFormPreviewBindings = (
  document: PageDocumentV2,
  breakpoint: PageBreakpoint,
  detailsByFormId: Readonly<Record<string, PageEditorFormPreviewDetail | null>>
): PageRuntimeDataByBlockId => {
  const bindings: PageRuntimeDataByBlockId = {};
  const resolved = resolvePageDocumentForBreakpoint(document, breakpoint);
  for (const section of resolved.sections) {
    for (const block of walkBlocks(section.blocks)) {
      if (block.type !== "form") continue;
      const formId = readBlockFormId(block.props);
      if (!formId) continue;
      const detail = detailsByFormId[formId];
      if (detail === undefined) continue;
      bindings[block.id] = buildPageEditorFormPreviewBinding(
        formId,
        readBlockTitle(block.props),
        detail
      );
    }
  }
  return bindings;
};
