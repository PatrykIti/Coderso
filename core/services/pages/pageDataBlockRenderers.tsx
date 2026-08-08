import { createElement, type ReactNode } from "react";

import { ContentListBlock } from "../../widgets/core/contentList";
import { FormEmbedBlock, type FormEmbedData } from "../../widgets/core/formEmbed";
import {
  FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../widgets/core/formEmbedContract";
import { ListingFiltersBlock } from "../../widgets/core/listingFilters";
import type { PageBlockV2 } from "./pageDocumentV2Types";
import {
  mapPageFiltersBlockToListingFiltersData,
  pageEmbedAllowedTags,
  pageEmbedSelfClosingTags,
  readPageFiltersBlockLayout,
  type PageRuntimeDataBinding,
  type PageRuntimeFormBinding,
} from "./pageRuntimeBindingContract";
import { sanitizeAuthoringLinkHref, sanitizeAuthoringMediaUrl } from "./pageAuthoringSanitizers";
import { readBoolean, readText, type PageBlockRenderContext } from "./pageRendererV2Contract";
import {
  renderBlockText,
  toSanitizedEmbedElementProps,
  type SanitizedEmbedElementFrame,
} from "./pageStaticBlockRenderers";
import { pageBlockTextDataAttributes, toPageBlockTypographyStyle } from "./pageBlockRenderStyles";
import { decodeHtmlEntities, tokenizeHtml } from "../posts/editor/postRichTextHtmlUtils";

const renderInertDataBoundBlock = (
  type: "collection" | "filters" | "form" | "embed",
  message: string
) => (
  <div
    className="rounded border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
    data-page-block-inert={type}
  >
    {message}
  </div>
);

const getRuntimeBinding = <Kind extends PageRuntimeDataBinding["kind"]>(
  block: PageBlockV2,
  context: PageBlockRenderContext,
  kind: Kind
): Extract<PageRuntimeDataBinding, { kind: Kind }> | null => {
  const binding = context.runtimeDataByBlockId?.[block.id];
  return binding?.kind === kind
    ? (binding as Extract<PageRuntimeDataBinding, { kind: Kind }>)
    : null;
};

export const renderCollectionBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "collection");
  const isCanvas = context.layoutMode === "canvas-device";
  if (!binding) {
    if (isCanvas) {
      // Editor canvas without preview data (TASK-457): an unset contentTypeId
      // asks the author to pick a content type; a set contentTypeId without a
      // binding yet means the editor-provided preview data is still
      // resolving. Runtime paths never reach this branch (layoutMode stays
      // "runtime").
      const contentTypeId = readText(block.props.contentTypeId);
      return renderInertDataBoundBlock(
        "collection",
        contentTypeId
          ? "Loading collection preview..."
          : "Pick a content type in the Content panel to preview entries here."
      );
    }
    return renderInertDataBoundBlock("collection", "Collection content is not available yet.");
  }
  if (binding.data.resolved?.error) {
    // Fail closed identically on canvas and runtime: dangling references
    // never render a fake listing (the Content panel marks the dangling id).
    return renderInertDataBoundBlock("collection", "Collection content is not available yet.");
  }
  // TASK-459-03: the binding resolves the listing template's cardVariant to
  // the effective list variant; absent template keeps today's grid render.
  const listing = (
    <ContentListBlock data={binding.data} variant={binding.variant ?? "grid"} blockId={block.id} />
  );
  if (isCanvas) {
    // Canvas-safe preview (TASK-457): the author sees the exact shared
    // listing markup the front renders, with pointer events off so entry
    // links and pagination affordances never navigate inside the canvas.
    return (
      <div className="pointer-events-none min-w-0" data-page-editor-collection-preview="inert">
        {listing}
      </div>
    );
  }
  return listing;
};

/**
 * Filters block renderer (TASK-459-02): reuses the shared `listing-filters`
 * facet markup on the v2 pipeline. The outer wrapper carries the SAME
 * fetch-swap hooks the collection listing markup ships
 * (`data-listing-query-id` + `data-listing-block-id`), so the runtime client
 * script swaps the result count together with the facet form. The form itself
 * is a plain GET form — without JS a submit reloads the page with `lq.*`
 * params the server already honors.
 */
export const renderFiltersBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "filters");
  const isCanvas = context.layoutMode === "canvas-device";
  if (isCanvas) {
    const queryId = readText(block.props.queryId);
    if (!queryId) {
      return renderInertDataBoundBlock(
        "filters",
        "Pick a saved query in the Content panel to preview filters here."
      );
    }
    // Canvas-safe preview: the configured facet form renders from the block
    // props alone (no live filtering, counts stay 0) with pointer events off,
    // mirroring the collection block's inert-canvas discipline.
    return (
      <div className="pointer-events-none min-w-0" data-page-editor-filters-preview="inert">
        <ListingFiltersBlock
          data={mapPageFiltersBlockToListingFiltersData(block)}
          variant={readPageFiltersBlockLayout(block)}
          blockId={`${block.id}-form`}
          withRuntimeScript={false}
        />
      </div>
    );
  }
  if (!binding || binding.data.resolved?.error) {
    // Fail closed identically to the collection block: an unresolved or
    // dangling saved query never renders a fake filter form.
    return renderInertDataBoundBlock("filters", "Filters are not available yet.");
  }
  const listingQueryId = binding.data.listingQueryId ?? "";
  if (!listingQueryId) {
    return renderInertDataBoundBlock("filters", "Filters are not available yet.");
  }
  const showCount = readBoolean(block.props.showCount, true);
  return (
    <div
      className="min-w-0"
      data-page-filters-block="true"
      data-listing-block-id={block.id}
      data-listing-query-id={listingQueryId}
    >
      {showCount ? (
        <p
          className="px-4 text-sm font-medium text-[var(--coderso-block-text,#334155)]"
          data-page-filters-count={binding.total}
        >
          {binding.total === 1 ? "1 result" : `${binding.total} results`}
        </p>
      ) : null}
      <ListingFiltersBlock
        data={binding.data}
        variant={readPageFiltersBlockLayout(block)}
        blockId={`${block.id}-form`}
        withRuntimeScript={false}
      />
    </div>
  );
};

export const mapFormBindingToEmbedData = (
  block: PageBlockV2,
  binding: PageRuntimeFormBinding
): FormEmbedData => {
  const title =
    readText(block.props.title) || binding.title || binding.resolution.formName || "Form";
  const fields = {
    ...(typeof block.props.textareaRows === "number" &&
    Number.isInteger(block.props.textareaRows) &&
    block.props.textareaRows >= FORM_EMBED_TEXTAREA_ROWS_LIMITS.min &&
    block.props.textareaRows <= FORM_EMBED_TEXTAREA_ROWS_LIMITS.max
      ? { textareaRows: block.props.textareaRows }
      : {}),
    ...(typeof block.props.showSelectPrompt === "boolean"
      ? { showSelectPrompt: block.props.showSelectPrompt }
      : {}),
  };
  const loadingLabel =
    typeof block.props.loadingLabel === "string" ? block.props.loadingLabel.trim() : "";
  const successBehavior = block.props.successBehavior;
  const submitBehavior = {
    ...(loadingLabel.length > 0 && loadingLabel.length <= FORM_EMBED_LOADING_LABEL_MAX_LENGTH
      ? { loadingLabel }
      : {}),
    ...(typeof successBehavior === "string" &&
    FORM_EMBED_SUCCESS_BEHAVIORS.includes(
      successBehavior as (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number]
    )
      ? { successBehavior: successBehavior as (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number] }
      : {}),
  };
  return {
    formId: binding.formId,
    title,
    description: binding.resolution.description ?? "",
    successMessage: binding.resolution.successMessage ?? undefined,
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
    ...(Object.keys(submitBehavior).length > 0 ? { submitBehavior } : {}),
    resolved: {
      formId: binding.resolution.formId,
      formName: binding.resolution.formName,
      description: binding.resolution.description,
      status: binding.resolution.status,
      successMessage: binding.resolution.successMessage,
      successRedirectUrl: binding.resolution.successRedirectUrl,
      submissionAccess: binding.resolution.submissionAccess,
      submissionNonce: binding.resolution.submissionNonce,
      ...(binding.resolution.botProtection
        ? { botProtection: binding.resolution.botProtection }
        : {}),
      settings: {
        layoutMode: binding.resolution.settings.layoutMode,
        saveProgress: binding.resolution.settings.saveProgress,
        stepTitles: binding.resolution.settings.stepTitles,
        // TASK-516-06: present-only theme passthrough. `binding.resolution.settings`
        // IS the full FormSettings (formRuntimeContract.ts:34) and carries `theme`
        // after 516-01's normalizeFormSettings. Un-themed forms ⇒ spread is `{}` ⇒
        // byte-identical to the pre-516 markup; themed forms reach the widget so the
        // public embed can inherit the form theme (formEmbed reads it via
        // `resolved.settings.theme`, not resolveFormTheme, to preserve present-only).
        ...(binding.resolution.settings.theme ? { theme: binding.resolution.settings.theme } : {}),
      },
      fields: binding.resolution.fields,
      ...(binding.resolution.error ? { error: binding.resolution.error } : {}),
    },
  };
};

export const renderFormBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "form");
  const isCanvas = context.layoutMode === "canvas-device";
  if (!binding) {
    if (isCanvas) {
      // Editor canvas without preview data (TASK-456): an unset formId asks
      // the author to pick a form; a set formId without a binding yet means
      // the editor-provided preview data is still resolving. Runtime paths
      // never reach this branch (layoutMode stays "runtime").
      const formId = readText(block.props.formId);
      return renderInertDataBoundBlock(
        "form",
        formId ? "Loading form preview..." : "Pick a form in the Content panel to preview it here."
      );
    }
    const title = readText(block.props.title);
    return renderInertDataBoundBlock(
      "form",
      title ? `${title} is not available yet.` : "Form is not available yet."
    );
  }
  const embed = (
    <FormEmbedBlock data={mapFormBindingToEmbedData(block, binding)} variant="standard" />
  );
  if (isCanvas) {
    // Canvas-safe preview (TASK-456): the author sees the exact shared form
    // markup the front renders, but with every control disabled and pointer
    // events off, so the canvas never submits, focuses, or navigates. The
    // editor-provided preview binding also carries no submission nonce.
    return (
      <fieldset
        disabled
        className="pointer-events-none min-w-0 border-0 p-0"
        data-page-editor-form-preview="inert"
      >
        {embed}
      </fieldset>
    );
  }
  return embed;
};

const createSanitizedEmbedElement = (frame: SanitizedEmbedElementFrame) =>
  createElement(
    frame.tagName,
    toSanitizedEmbedElementProps(frame.tagName, frame.rawAttrs, frame.key),
    ...frame.children
  );

const renderSanitizedEmbedHtml = (sanitizedHtml: string): ReactNode[] => {
  const roots: ReactNode[] = [];
  const stack: SanitizedEmbedElementFrame[] = [];
  let nextKey = 0;

  const appendNode = (node: ReactNode) => {
    const parent = stack.at(-1);
    if (parent) {
      parent.children.push(node);
      return;
    }
    roots.push(node);
  };

  for (const token of tokenizeHtml(sanitizedHtml)) {
    if (token.kind === "text") {
      appendNode(decodeHtmlEntities(token.value));
      continue;
    }
    if (token.kind === "comment" || !pageEmbedAllowedTags.has(token.name)) continue;

    if (token.closing) {
      const current = stack.at(-1);
      if (current?.tagName === token.name) {
        stack.pop();
        appendNode(createSanitizedEmbedElement(current));
      }
      continue;
    }

    if (token.selfClosing || pageEmbedSelfClosingTags.has(token.name)) {
      appendNode(
        createElement(
          token.name,
          toSanitizedEmbedElementProps(token.name, token.rawAttrs, nextKey++)
        )
      );
      continue;
    }

    stack.push({ tagName: token.name, rawAttrs: token.rawAttrs, children: [], key: nextKey++ });
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (current) appendNode(createSanitizedEmbedElement(current));
  }

  return roots;
};

export const renderEmbedBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const binding = getRuntimeBinding(block, context, "embed");
  if (!binding) {
    return renderInertDataBoundBlock("embed", "Embed content is not available yet.");
  }
  const iframeSrc = sanitizeAuthoringMediaUrl(binding.iframeSrc);
  if (iframeSrc) {
    return (
      <div
        className="overflow-hidden rounded-lg border bg-black/5"
        data-page-embed-provider="youtube"
      >
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={iframeSrc}
            loading="lazy"
            title={binding.iframeTitle}
            className="absolute inset-0 h-full w-full border-0"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }
  if (binding.sanitizedHtml) {
    return (
      <div className="prose max-w-none" data-page-embed-html="sanitized">
        {renderSanitizedEmbedHtml(binding.sanitizedHtml)}
      </div>
    );
  }
  return renderInertDataBoundBlock("embed", "Embed content is not available yet.");
};

const isListLinkItem = (value: unknown): value is { label: string; href: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { label?: unknown }).label === "string" &&
  typeof (value as { href?: unknown }).href === "string";

export const renderList = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const items = Array.isArray(block.props.items) ? block.props.items : [];
  const children = items.map((item, index) => {
    const label = isListLinkItem(item) ? item.label : readText(item);
    const href = isListLinkItem(item) ? (sanitizeAuthoringLinkHref(item.href) ?? "") : "";
    return (
      <li key={`${block.id}-${index}`}>
        {href ? (
          <a
            className="font-medium text-[var(--coderso-block-text,#1f2937)] underline-offset-4 hover:underline"
            href={href}
          >
            {label}
          </a>
        ) : (
          // Link items stay panel-only; only plain string items expose the
          // inline-edit hook (the contract fails closed for object items).
          renderBlockText(block, `items.${index}`, label, context)
        )}
      </li>
    );
  });
  const listStyle = toPageBlockTypographyStyle(block);
  return readBoolean(block.props.ordered, false) ? (
    <ol
      className="list-decimal space-y-2 pl-6 text-[var(--coderso-block-text,#334155)]"
      style={listStyle}
      {...pageBlockTextDataAttributes}
    >
      {children}
    </ol>
  ) : (
    <ul
      className="list-disc space-y-2 pl-6 text-[var(--coderso-block-text,#334155)]"
      style={listStyle}
      {...pageBlockTextDataAttributes}
    >
      {children}
    </ul>
  );
};
