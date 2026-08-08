import type { WidgetBlock } from "../widgets/types";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import { resolveContentListRuntimeData } from "../services/content/contentListResolver";
import { resolvePostsFeedRuntimeData } from "../services/content/postsFeedResolver";
import { resolveEntryTeaserRuntimeData } from "../services/content/entryTeaserResolver";
import {
  hydrateProductCompareRuntimeData,
  hydrateProductGalleryRuntimeData,
  hydrateProductTableRuntimeData,
  type CommerceRuntimeCache,
} from "../services/commerce/commerceWidgetRuntime";
import { normalizeContentListData, type ContentListData } from "../widgets/core/contentList";
import { normalizePostsFeedData, type PostsFeedData } from "../widgets/core/postsFeed";
import { normalizeEntryTeaserData, type EntryTeaserData } from "../widgets/core/entryTeaser";
import type { ProductGalleryData } from "../widgets/core/productGallery";
import type { ProductCompareData } from "../widgets/core/productCompare";
import type { ProductTableData } from "../widgets/core/productTable";
import { normalizeContactData, type ContactData } from "../widgets/core/contact";
import { normalizeFormEmbedData, type FormEmbedData } from "../widgets/core/formEmbed";
import { normalizeNewsletterData, type NewsletterData } from "../widgets/core/newsletter";
import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../widgets/core/bookingCalendar";
import {
  appointmentFormSchema,
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../widgets/core/appointmentForm";
import {
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../widgets/core/listingFilters";
import { normalizeSearchBoxData, type SearchBoxData } from "../widgets/core/searchBox";
import { resolveNavigationRuntimeData } from "../services/navigation/navigationRuntimeResolver";
import { resolveTemplateSectionRuntimeData } from "../services/widgets/templateSectionRuntime";
import { resolveFormRuntimeData } from "../services/forms/formRuntimeResolver";
import { resolveBookingRuntimeData } from "../services/booking/bookingRuntimeResolver";
import {
  resolveListingFiltersRuntimeData,
  resolveListingSearchRuntimeState,
} from "../services/search/listingRuntimeService";

export { buildPublicDocumentShell, escapeHtmlAttribute } from "../site/publicDocumentShell";

export const ensureRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const hasNestedTemplateSectionError = (blocks: WidgetBlock[], error: string): boolean =>
  blocks.some((block) => {
    const data = ensureRecord(block.data);
    const resolved = ensureRecord(data.resolved);
    if (block.type === "template-section" && resolved.error === error) {
      return true;
    }

    const resolvedBlocks = Array.isArray(resolved.blocks) ? (resolved.blocks as WidgetBlock[]) : [];
    if (hasNestedTemplateSectionError(resolvedBlocks, error)) return true;

    const children = Array.isArray(block.children) ? block.children : [];
    if (hasNestedTemplateSectionError(children, error)) return true;

    const slots = ensureRecord(block.slots);
    return Object.values(slots).some((slotBlocks) =>
      Array.isArray(slotBlocks)
        ? hasNestedTemplateSectionError(slotBlocks as WidgetBlock[], error)
        : false
    );
  });

const appointmentFormSupportsRuntimeCaptchaHydration = (() => {
  const properties = ensureRecord((appointmentFormSchema as { properties?: unknown }).properties);
  const resolvedSchema = ensureRecord(
    (properties.resolved as { properties?: unknown } | undefined)?.properties
  );
  return Object.prototype.hasOwnProperty.call(resolvedSchema, "captcha");
})();

type RuntimeHydrationCache = {
  booking?: Awaited<ReturnType<typeof resolveBookingRuntimeData>>;
  commerce?: CommerceRuntimeCache;
};

type RuntimeHydrationOptions = {
  preview: boolean;
  contentRoutes: ContentRouteSetting[];
  templateStack?: string[];
  runtimeSearchParams?: URLSearchParams;
  runtimeCache: RuntimeHydrationCache;
  /**
   * Detail-page bindings can resolve a runtime projection before generic block
   * hydration. Those exact blocks must not be fetched a second time and
   * overwritten with their package-time placeholder source.
   */
  prehydratedBlockIds?: ReadonlySet<string>;
};

const hydrateRuntimeBlock = async (
  block: WidgetBlock,
  options: RuntimeHydrationOptions
): Promise<WidgetBlock> => {
  let nextBlock: WidgetBlock = block;

  if (block.type === "content-list" && !options.prehydratedBlockIds?.has(block.id)) {
    const normalizedData = normalizeContentListData(ensureRecord(block.data) as ContentListData);
    const resolved = await resolveContentListRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      blockId: block.id,
    });
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "posts-feed") {
    const normalizedData = normalizePostsFeedData(ensureRecord(block.data) as PostsFeedData);
    const resolved = await resolvePostsFeedRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      blockId: block.id,
    });
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "listing-filters") {
    const normalizedData = normalizeListingFiltersData(
      ensureRecord(block.data) as ListingFiltersData
    );
    const resolved = await resolveListingFiltersRuntimeData({
      listingQueryId: normalizedData.listingQueryId,
      facets: normalizedData.facets,
      preview: options.preview,
      runtimeSearchParams: options.runtimeSearchParams,
    });

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          listingQueryId: resolved.listingQueryId,
          metrics: resolved.metrics,
          searchQuery: resolved.searchQuery,
          rejectedTokens: resolved.rejectedTokens,
          ...(resolved.error ? { error: resolved.error } : {}),
        },
      },
    };
  }
  if (block.type === "search-box") {
    const normalizedData = normalizeSearchBoxData(ensureRecord(block.data) as SearchBoxData);
    const listingQueryId =
      normalizedData.mode === "listing" ? (normalizedData.listingQueryId?.trim() ?? "") : "";
    const runtimeState = listingQueryId
      ? resolveListingSearchRuntimeState(listingQueryId, options.runtimeSearchParams)
      : { rejectedTokens: [] as string[] };

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          ...(normalizedData.resolved ?? {}),
          ...(listingQueryId ? { query: runtimeState.searchQuery } : {}),
          rejectedTokens: runtimeState.rejectedTokens,
        },
      },
    };
  }
  if (block.type === "entry-teaser") {
    const normalizedData = normalizeEntryTeaserData(ensureRecord(block.data) as EntryTeaserData);
    const resolved = await resolveEntryTeaserRuntimeData(normalizedData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
    });
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "product-gallery") {
    const commerceCache = options.runtimeCache.commerce ?? (new Map() as CommerceRuntimeCache);
    options.runtimeCache.commerce = commerceCache;
    const resolvedData = await hydrateProductGalleryRuntimeData(
      ensureRecord(block.data) as ProductGalleryData,
      {
        preview: options.preview,
        cache: commerceCache,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "product-compare") {
    const commerceCache = options.runtimeCache.commerce ?? (new Map() as CommerceRuntimeCache);
    options.runtimeCache.commerce = commerceCache;
    const resolvedData = await hydrateProductCompareRuntimeData(
      ensureRecord(block.data) as ProductCompareData,
      {
        preview: options.preview,
        cache: commerceCache,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "product-table") {
    const commerceCache = options.runtimeCache.commerce ?? (new Map() as CommerceRuntimeCache);
    options.runtimeCache.commerce = commerceCache;
    const resolvedData = await hydrateProductTableRuntimeData(
      ensureRecord(block.data) as ProductTableData,
      {
        preview: options.preview,
        cache: commerceCache,
        runtimeSearchParams: options.runtimeSearchParams,
        blockId: block.id,
      }
    );
    nextBlock = {
      ...block,
      data: resolvedData,
    };
  }
  if (block.type === "form-embed") {
    const normalizedData = normalizeFormEmbedData(ensureRecord(block.data) as FormEmbedData);
    const resolved = normalizedData.formId
      ? await resolveFormRuntimeData(normalizedData.formId, {
          preview: options.preview,
        })
      : { error: "form_missing" };
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved,
      },
    };
  }
  if (block.type === "contact") {
    const normalizedData = normalizeContactData(ensureRecord(block.data) as ContactData);
    const submission = normalizedData.form?.submission;
    const formId = submission?.mode === "forms-runtime" ? (submission.formId ?? "").trim() : "";
    const resolvedData = formId
      ? await resolveFormRuntimeData(formId, {
          preview: options.preview,
        })
      : undefined;
    const resolved = resolvedData
      ? {
          formId: resolvedData.formId,
          formName: resolvedData.formName,
          description: resolvedData.description,
          status: resolvedData.status,
          successMessage: resolvedData.successMessage,
          successRedirectUrl: resolvedData.successRedirectUrl,
          submissionAccess: resolvedData.submissionAccess,
          submissionNonce: resolvedData.submissionNonce ?? null,
          botProtection: resolvedData.botProtection ?? null,
          fields: resolvedData.fields,
          ...(resolvedData.error ? { error: resolvedData.error } : {}),
        }
      : undefined;
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        ...(resolved ? { resolved } : {}),
      },
    };
  }
  if (block.type === "newsletter") {
    const normalizedData = normalizeNewsletterData(ensureRecord(block.data) as NewsletterData);
    const formId =
      normalizedData.submission?.mode === "forms-runtime"
        ? (normalizedData.submission.formId ?? "").trim()
        : "";
    const resolvedData = formId
      ? await resolveFormRuntimeData(formId, {
          preview: options.preview,
        })
      : undefined;
    const resolved = resolvedData
      ? {
          formId: resolvedData.formId,
          formName: resolvedData.formName,
          description: resolvedData.description,
          status: resolvedData.status,
          successMessage: resolvedData.successMessage,
          successRedirectUrl: resolvedData.successRedirectUrl,
          submissionAccess: resolvedData.submissionAccess,
          submissionNonce: resolvedData.submissionNonce ?? null,
          botProtection: resolvedData.botProtection ?? null,
          fields: resolvedData.fields,
          ...(resolvedData.error ? { error: resolvedData.error } : {}),
        }
      : undefined;
    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        ...(resolved ? { resolved } : {}),
      },
    };
  }
  if (block.type === "booking-calendar") {
    const normalizedData = normalizeBookingCalendarData(
      ensureRecord(block.data) as BookingCalendarData
    );
    const slotPolicy = {
      ...(normalizedData.minDate ? { minDate: normalizedData.minDate } : {}),
      ...(normalizedData.maxDate ? { maxDate: normalizedData.maxDate } : {}),
    };
    const shouldReuseBookingCache = !slotPolicy.minDate && !slotPolicy.maxDate;
    const resolved =
      shouldReuseBookingCache && options.runtimeCache.booking
        ? options.runtimeCache.booking
        : await resolveBookingRuntimeData({
            preview: options.preview,
            ...(shouldReuseBookingCache ? {} : { slotPolicy }),
          });
    if (shouldReuseBookingCache) {
      options.runtimeCache.booking = resolved;
    }

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          services: resolved.services,
          resources: resolved.resources,
          slotsToken: resolved.slotsToken,
          ...(resolved.error ? { error: resolved.error } : {}),
        },
      },
    };
  }
  if (block.type === "appointment-form") {
    const normalizedData = normalizeAppointmentFormData(
      ensureRecord(block.data) as AppointmentFormData
    );
    const resolved =
      options.runtimeCache.booking ??
      (await resolveBookingRuntimeData({ preview: options.preview }));
    options.runtimeCache.booking = resolved;

    nextBlock = {
      ...block,
      data: {
        ...normalizedData,
        resolved: {
          submissionNonce: resolved.submissionNonce,
          ...(appointmentFormSupportsRuntimeCaptchaHydration ? { captcha: resolved.captcha } : {}),
          ...(resolved.error ? { error: resolved.error } : {}),
        },
      },
    };
  }
  if (block.type === "navigation") {
    const data = ensureRecord(block.data);
    const resolved = await resolveNavigationRuntimeData(data);
    nextBlock = {
      ...block,
      data: {
        ...data,
        items: resolved.items,
        linksSource: resolved.linksSource,
      },
    };
  }
  if (block.type === "template-section") {
    const data = ensureRecord(block.data);
    const rawTemplateId = typeof data.templateId === "string" ? data.templateId : "";
    const resolution = await resolveTemplateSectionRuntimeData(rawTemplateId, {
      preview: options.preview,
      templateStack: options.templateStack ?? [],
    });
    const templateId = resolution.templateId ?? "";
    const nextStack = templateId
      ? [...(options.templateStack ?? []), templateId]
      : options.templateStack;
    const resolvedBlocks = resolution.blocks.length
      ? await hydrateRuntimeBlocks(resolution.blocks, {
          ...options,
          templateStack: nextStack,
        })
      : [];
    const resolvedError =
      resolution.error ??
      (hasNestedTemplateSectionError(resolvedBlocks, "template_loop")
        ? "template_loop"
        : undefined);

    nextBlock = {
      ...block,
      data: {
        ...data,
        templateId,
        ...(resolution.templateName ? { templateName: resolution.templateName } : {}),
        resolved: {
          blocks: resolvedBlocks,
          ...(resolvedError ? { error: resolvedError } : {}),
        },
      },
    };
  }

  const sourceSlots = nextBlock.slots;
  if (sourceSlots && typeof sourceSlots === "object") {
    const slotEntries = await Promise.all(
      Object.entries(sourceSlots).map(async ([slotId, slotBlocks]) => [
        slotId,
        await hydrateRuntimeBlocks(slotBlocks, options),
      ])
    );
    nextBlock = {
      ...nextBlock,
      slots: Object.fromEntries(slotEntries),
    };
  }

  if (Array.isArray(nextBlock.children) && nextBlock.children.length > 0) {
    nextBlock = {
      ...nextBlock,
      children: await hydrateRuntimeBlocks(nextBlock.children, options),
    };
  }

  return nextBlock;
};

export const hydrateRuntimeBlocks = async (
  blocks: WidgetBlock[],
  options: RuntimeHydrationOptions
) => Promise.all(blocks.map((block) => hydrateRuntimeBlock(block, options)));
