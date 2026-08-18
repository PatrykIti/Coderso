// Action-executor handler registry (TASK-569-01). Registry body is byte-identical to the legacy monolith.

import type { AssistantActionPreviewChange, AssistantPlannedAction } from "./actionPlanTypes";
import { createAssistantActionRegistry, getAssistantActionHandler } from "./actionRegistry";
import type { ActionExecutorDeps, AssistantActionHandler } from "./actionExecutorTypes";
import {
  buildContentRoutePreview,
  buildContentTypePreview,
  buildContentTypeFieldAddPreview,
  buildContentTypeDeletePreview,
  executeContentRouteAction,
  executeContentTypeAction,
  executeContentTypeFieldAddAction,
  executeContentTypeDeleteAction,
} from "./actionExecutorContent";
import {
  buildCustomScreenPreview,
  buildCustomScreenDeletePreview,
  buildCustomScreenUpdatePreview,
  buildCustomScreenSectionAddPreview,
  buildCustomScreenBlockAddPreview,
  buildCustomScreenBlockPatchPreview,
  buildCustomScreenBlockMovePreview,
  buildCustomScreenBlockRemovePreview,
  buildCustomScreenBindingSetPreview,
  buildCustomScreenListViewPatchPreview,
  executeCustomScreenAction,
  executeCustomScreenDeleteAction,
  executeCustomScreenUpdateAction,
  executeCustomScreenSectionAddAction,
  executeCustomScreenBlockAddAction,
  executeCustomScreenBlockPatchAction,
  executeCustomScreenBlockMoveAction,
  executeCustomScreenBlockRemoveAction,
  executeCustomScreenBindingSetAction,
  executeCustomScreenListViewPatchAction,
} from "./actionExecutorScreens";
import {
  buildListingQueryPreview,
  buildListingQueryDeletePreview,
  buildListingQueryFiltersPatchPreview,
  buildListingQueryUpdatePreview,
  buildListingTemplatePreview,
  buildListingTemplateDeletePreview,
  buildListingTemplateCardPatchPreview,
  buildListingTemplateUpdatePreview,
  executeListingQueryAction,
  executeListingQueryDeleteAction,
  executeListingQueryFiltersPatchAction,
  executeListingQueryUpdateAction,
  executeListingTemplateAction,
  executeListingTemplateDeleteAction,
  executeListingTemplateCardPatchAction,
  executeListingTemplateUpdateAction,
} from "./actionExecutorListings";
import {
  buildFormAutomationPreview,
  buildFormPreview,
  buildFormDeletePreview,
  buildFormArchivePreview,
  buildFormUpdatePreview,
  buildEntryUpsertDraftPreview,
  buildEntrySampleCreatePreview,
  buildEntryDeletePreview,
  buildEntryUpdatePreview,
  executeFormAutomationAction,
  executeFormAction,
  executeFormDeleteAction,
  executeFormArchiveAction,
  executeFormUpdateAction,
  executeEntryUpsertDraftAction,
  executeEntrySampleCreateAction,
  executeEntryDeleteAction,
  executeEntryUpdateAction,
} from "./actionExecutorForms";
import {
  buildMenuUpsertPreview,
  buildMenuItemPreview,
  buildMenuItemDeletePreview,
  buildMenuItemUpdatePreview,
  buildSeoDocumentPreview,
  buildSeoDocumentDeletePreview,
  buildSeoDocumentUpdatePreview,
  executeMenuUpsertAction,
  executeMenuItemAction,
  executeMenuItemDeleteAction,
  executeMenuItemUpdateAction,
  executeSeoDocumentAction,
  executeSeoDocumentDeleteAction,
  executeSeoDocumentUpdateAction,
} from "./actionExecutorMenusSeo";
import {
  buildMediaReferencePreview,
  buildDetailPagePreview,
  executeMediaReferenceAction,
  executeDetailPageAction,
} from "./actionExecutorMediaPages";
import {
  buildPagePreview,
  buildPageUpdatePreview,
  buildPageDeletePreview,
  executePageAction,
  executePageUpdateAction,
  executePageDeleteAction,
} from "./actionExecutorPages";
import {
  buildWidgetTemplateDeletePreview,
  buildWidgetTemplateUpdatePreview,
  buildWidgetTemplateBlockPatchPreview,
  buildSiteKitRecommendPreview,
  buildSiteKitInstallPreview,
  buildSiteKitValidatePreview,
  executeWidgetTemplateDeleteAction,
  executeWidgetTemplateUpdateAction,
  executeWidgetTemplateBlockPatchAction,
  executeSiteKitRecommendAction,
  executeSiteKitInstallAction,
  executeSiteKitValidateAction,
} from "./actionExecutorWidgetsSiteKit";

const unexpectedAction = (): never => {
  throw new Error("assistant_action_unsupported");
};

export const actionHandlers = createAssistantActionRegistry<AssistantActionHandler>({
  "setting.content-route.upsert": {
    preview: (action, ctx) =>
      action.type === "setting.content-route.upsert"
        ? buildContentRoutePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "setting.content-route.upsert"
        ? executeContentRouteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "content-type.upsert": {
    preview: (action, ctx) =>
      action.type === "content-type.upsert"
        ? buildContentTypePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "content-type.upsert"
        ? executeContentTypeAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "content-type.field.add": {
    preview: (action, ctx) =>
      action.type === "content-type.field.add"
        ? buildContentTypeFieldAddPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "content-type.field.add"
        ? executeContentTypeFieldAddAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "content-type.delete": {
    preview: (action, ctx) =>
      action.type === "content-type.delete"
        ? buildContentTypeDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "content-type.delete"
        ? executeContentTypeDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.upsert": {
    preview: (action, ctx) =>
      action.type === "custom-screen.upsert"
        ? buildCustomScreenPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.upsert"
        ? executeCustomScreenAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.delete": {
    preview: (action, ctx) =>
      action.type === "custom-screen.delete"
        ? buildCustomScreenDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.delete"
        ? executeCustomScreenDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.update": {
    preview: (action, ctx) =>
      action.type === "custom-screen.update"
        ? buildCustomScreenUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.update"
        ? executeCustomScreenUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.section.add": {
    preview: (action, ctx) =>
      action.type === "custom-screen.section.add"
        ? buildCustomScreenSectionAddPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.section.add"
        ? executeCustomScreenSectionAddAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.block.add": {
    preview: (action, ctx) =>
      action.type === "custom-screen.block.add"
        ? buildCustomScreenBlockAddPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.block.add"
        ? executeCustomScreenBlockAddAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.block.patch": {
    preview: (action, ctx) =>
      action.type === "custom-screen.block.patch"
        ? buildCustomScreenBlockPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.block.patch"
        ? executeCustomScreenBlockPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.block.move": {
    preview: (action, ctx) =>
      action.type === "custom-screen.block.move"
        ? buildCustomScreenBlockMovePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.block.move"
        ? executeCustomScreenBlockMoveAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.block.remove": {
    preview: (action, ctx) =>
      action.type === "custom-screen.block.remove"
        ? buildCustomScreenBlockRemovePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.block.remove"
        ? executeCustomScreenBlockRemoveAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.binding.set": {
    preview: (action, ctx) =>
      action.type === "custom-screen.binding.set"
        ? buildCustomScreenBindingSetPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.binding.set"
        ? executeCustomScreenBindingSetAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.list-view.patch": {
    preview: (action, ctx) =>
      action.type === "custom-screen.list-view.patch"
        ? buildCustomScreenListViewPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.list-view.patch"
        ? executeCustomScreenListViewPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.upsert": {
    preview: (action, ctx) =>
      action.type === "listing-query.upsert"
        ? buildListingQueryPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.upsert"
        ? executeListingQueryAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.delete": {
    preview: (action, ctx) =>
      action.type === "listing-query.delete"
        ? buildListingQueryDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.delete"
        ? executeListingQueryDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.update": {
    preview: (action, ctx) =>
      action.type === "listing-query.update"
        ? buildListingQueryUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.update"
        ? executeListingQueryUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.filters.patch": {
    preview: (action, ctx) =>
      action.type === "listing-query.filters.patch"
        ? buildListingQueryFiltersPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.filters.patch"
        ? executeListingQueryFiltersPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.upsert": {
    preview: (action, ctx) =>
      action.type === "listing-template.upsert"
        ? buildListingTemplatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.upsert"
        ? executeListingTemplateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.delete": {
    preview: (action, ctx) =>
      action.type === "listing-template.delete"
        ? buildListingTemplateDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.delete"
        ? executeListingTemplateDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.update": {
    preview: (action, ctx) =>
      action.type === "listing-template.update"
        ? buildListingTemplateUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.update"
        ? executeListingTemplateUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.card.patch": {
    preview: (action, ctx) =>
      action.type === "listing-template.card.patch"
        ? buildListingTemplateCardPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.card.patch"
        ? executeListingTemplateCardPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.automation.upsert": {
    preview: (action, ctx) =>
      action.type === "form.automation.upsert"
        ? buildFormAutomationPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.automation.upsert"
        ? executeFormAutomationAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.upsert": {
    preview: (action, ctx) =>
      action.type === "form.upsert" ? buildFormPreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.upsert"
        ? executeFormAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.delete": {
    preview: (action, ctx) =>
      action.type === "form.delete" ? buildFormDeletePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.delete"
        ? executeFormDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.archive": {
    preview: (action, ctx) =>
      action.type === "form.archive"
        ? buildFormArchivePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.archive"
        ? executeFormArchiveAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.update": {
    preview: (action, ctx) =>
      action.type === "form.update" ? buildFormUpdatePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.update"
        ? executeFormUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "entry.upsert-draft": {
    preview: (action, ctx) =>
      action.type === "entry.upsert-draft"
        ? buildEntryUpsertDraftPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.upsert-draft"
        ? executeEntryUpsertDraftAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "entry.sample.create": {
    preview: (action, ctx) =>
      action.type === "entry.sample.create"
        ? buildEntrySampleCreatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.sample.create"
        ? executeEntrySampleCreateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "entry.delete": {
    preview: (action, ctx) =>
      action.type === "entry.delete"
        ? buildEntryDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.delete"
        ? executeEntryDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "entry.update": {
    preview: (action, ctx) =>
      action.type === "entry.update"
        ? buildEntryUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.update"
        ? executeEntryUpdateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "menu.upsert": {
    preview: (action, ctx) =>
      action.type === "menu.upsert" ? buildMenuUpsertPreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.upsert"
        ? executeMenuUpsertAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "menu.item.upsert": {
    preview: (action, ctx) =>
      action.type === "menu.item.upsert"
        ? buildMenuItemPreview(action, ctx.deps, ctx)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.upsert"
        ? executeMenuItemAction(action, preview, ctx.deps, ctx)
        : unexpectedAction(),
  },
  "menu.item.delete": {
    preview: (action, ctx) =>
      action.type === "menu.item.delete"
        ? buildMenuItemDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.delete"
        ? executeMenuItemDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "menu.item.update": {
    preview: (action, ctx) =>
      action.type === "menu.item.update"
        ? buildMenuItemUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.update"
        ? executeMenuItemUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "seo.document.upsert": {
    preview: (action, ctx) =>
      action.type === "seo.document.upsert"
        ? buildSeoDocumentPreview(action, ctx.deps, ctx)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.upsert"
        ? executeSeoDocumentAction(action, preview, ctx.deps, ctx)
        : unexpectedAction(),
  },
  "seo.document.delete": {
    preview: (action, ctx) =>
      action.type === "seo.document.delete"
        ? buildSeoDocumentDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.delete"
        ? executeSeoDocumentDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "seo.document.update": {
    preview: (action, ctx) =>
      action.type === "seo.document.update"
        ? buildSeoDocumentUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.update"
        ? executeSeoDocumentUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "media.reference.attach": {
    preview: (action, ctx) =>
      action.type === "media.reference.attach"
        ? buildMediaReferencePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "media.reference.attach"
        ? executeMediaReferenceAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "page.upsert": {
    preview: (action, ctx) =>
      action.type === "page.upsert" ? buildPagePreview(action, ctx) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.upsert"
        ? executePageAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "detail-page.upsert": {
    preview: (action, ctx) =>
      action.type === "detail-page.upsert"
        ? buildDetailPagePreview(action, ctx)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "detail-page.upsert"
        ? executeDetailPageAction(action, preview, ctx)
        : unexpectedAction(),
  },
  "page.update": {
    preview: (action, ctx) =>
      action.type === "page.update" ? buildPageUpdatePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.update"
        ? executePageUpdateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "page.delete": {
    preview: (action, ctx) =>
      action.type === "page.delete" ? buildPageDeletePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.delete"
        ? executePageDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "widget-template.delete": {
    preview: (action, ctx) =>
      action.type === "widget-template.delete"
        ? buildWidgetTemplateDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "widget-template.delete"
        ? executeWidgetTemplateDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "widget-template.update": {
    preview: (action, ctx) =>
      action.type === "widget-template.update"
        ? buildWidgetTemplateUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "widget-template.update"
        ? executeWidgetTemplateUpdateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "widget-template.block.patch": {
    preview: (action, ctx) =>
      action.type === "widget-template.block.patch"
        ? buildWidgetTemplateBlockPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "widget-template.block.patch"
        ? executeWidgetTemplateBlockPatchAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "site-kit.recommend": {
    preview: (action, ctx) =>
      action.type === "site-kit.recommend"
        ? buildSiteKitRecommendPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "site-kit.recommend"
        ? executeSiteKitRecommendAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "site-kit.install": {
    preview: (action, ctx) =>
      action.type === "site-kit.install"
        ? buildSiteKitInstallPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "site-kit.install"
        ? executeSiteKitInstallAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "site-kit.validate": {
    preview: (action) =>
      action.type === "site-kit.validate"
        ? buildSiteKitValidatePreview(action)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "site-kit.validate"
        ? executeSiteKitValidateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
});

export const buildPreviewForAction = async (
  action: AssistantPlannedAction,
  deps: ActionExecutorDeps,
  planActions: AssistantPlannedAction[] = [],
  actionIndex = 0
): Promise<AssistantActionPreviewChange> =>
  getAssistantActionHandler(actionHandlers, action.type).preview(action, {
    deps,
    actorId: "",
    planActions,
    actionIndex,
  });

export const hasBlockingPreviewConflicts = (changes: AssistantActionPreviewChange[]) =>
  changes.some((change) => change.conflicts.some((conflict) => conflict.severity === "error"));
