import { expect, test } from "bun:test";
import { isDeepStrictEqual } from "node:util";

import {
  mutateDetailPageDocumentLifecycleAtomic,
  prepareDetailPageDocumentLifecycleNativeTargets,
} from "../../../core/services/content/detailPageDocumentLifecycleMutation";
import {
  captureEntryLifecycleNativeSnapshot,
  mutateEntryLifecycleAtomic,
} from "../../../core/services/content/entryLifecycleMutationService";
import { mutateListingQueryAtomic } from "../../../core/services/content/listingQueriesService";
import {
  captureContentTypeNativeSnapshot,
  mutateContentTypeAtomic,
} from "../../../core/services/content/typeService";
import { saveScreenEntryPresentationOverrides } from "../../../core/services/customScreens/screenEntryPresentationOverrides";
import { updateCustomScreen } from "../../../core/services/customScreens/customScreenService";
import {
  captureFormAggregateNativeSnapshot,
  mutateFormAggregateAtomic,
} from "../../../core/services/forms/formAggregateService";
import { createFormActionRun } from "../../../core/services/forms/formActionsService";
import { submitForm } from "../../../core/services/forms/submissionService";
import { replaceMenuItems } from "../../../core/services/menus/menuService";
import {
  capturePageLifecycleNativeSnapshot,
  mutatePageLifecycleAtomic,
} from "../../../core/services/pages/pageService";
import { setSetting } from "../../../core/services/settings/settingsService";
import {
  replaceEntryTaxonomies,
  setTaxonomyConfig,
} from "../../../core/services/content/taxonomyService";
import { setThemeRoutes } from "../../../core/services/themes/themeProfileService";
import { readCounts, requireLockedRow, runRace } from "./fullSiteNativeForeignKeyRacesDbSupport";
import type {
  CountQuery,
  LockProof,
  RaceContext,
  RaceDescriptor,
  ReservedSql,
  SqlClient,
  Uuid,
} from "./fullSiteNativeForeignKeyRacesDbSupport";

type RootFamily = "page" | "form" | "content-type" | "entry";

type EdgeDescriptor = Readonly<{
  label: string;
  root: RootFamily;
  setup?: RaceDescriptor["setup"];
  lockAndWriteReference: RaceDescriptor["lockAndWriteReference"];
  runReferenceWriter: RaceDescriptor["runReferenceWriter"];
  writerError: string;
  readReferences(client: SqlClient, context: RaceContext): readonly CountQuery[];
}>;

const ACTOR_TIMESTAMP = "2026-08-07T00:00:00.000Z";
const CONTENT_SCHEMA = JSON.stringify({
  type: "object",
  additionalProperties: false,
  properties: {},
});
const PAGE_DOCUMENT = JSON.stringify({ sections: [] });

const insertPage = async (client: SqlClient, context: RaceContext): Promise<void> => {
  await client`
    insert into pages (id, slug, title, status, current_data)
    values (${context.rootId}::uuid, ${context.rootSlug}, ${`Page ${context.scope}`}, 'draft', ${PAGE_DOCUMENT}::jsonb)
  `;
};

const insertForm = async (client: SqlClient, context: RaceContext): Promise<void> => {
  await client`
    insert into forms (id, name, slug, status, submission_access, settings)
    values (${context.rootId}::uuid, ${`Form ${context.scope}`}, ${context.rootSlug}, 'draft', 'public', '{}'::jsonb)
  `;
};

const insertContentType = async (
  client: SqlClient,
  id: Uuid,
  slug: string,
  scope: string
): Promise<void> => {
  await client`
    insert into content_types (id, name, slug, schema, status, config)
    values (${id}::uuid, ${`Type ${scope} ${id}`}, ${slug}, ${CONTENT_SCHEMA}::jsonb, 'draft', '{}'::jsonb)
  `;
};

const insertEntry = async (
  client: SqlClient,
  id: Uuid,
  typeId: Uuid,
  context: RaceContext
): Promise<void> => {
  await client`
    insert into content_entries (id, type_id, slug, title, status, visibility, tags, data)
    values (${id}::uuid, ${typeId}::uuid, ${`entry-${context.scope}-${id}`}, ${`Entry ${context.scope}`}, 'draft', 'public', '[]'::jsonb, '{}'::jsonb)
  `;
};

const insertActionRun = async (
  tx: ReservedSql,
  context: RaceContext,
  actionId: Uuid | null
): Promise<void> => {
  await tx`
    insert into form_action_runs (
      id, form_id, action_id, action_type, action_label, status,
      action_condition, action_config, submission_payload
    ) values (
      ${context.referenceId}::uuid, ${context.rootId}::uuid, ${actionId}::uuid,
      'success_message', 'Race action', 'success',
      '{"operator":"always"}'::jsonb, '{"message":"Saved"}'::jsonb, '{}'::jsonb
    )
  `;
};

const lockPageKeyShare = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(await tx`select id from pages where id = ${context.rootId}::uuid for key share`);
};

const lockAndDeletePage = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(await tx`select id from pages where id = ${context.rootId}::uuid for update`);
  await tx`delete from pages where id = ${context.rootId}::uuid`;
};

const lockFormKeyShare = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(await tx`select id from forms where id = ${context.rootId}::uuid for key share`);
};

const lockAndDeleteForm = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(await tx`select id from forms where id = ${context.rootId}::uuid for update`);
  await tx`delete from forms where id = ${context.rootId}::uuid`;
};

const lockContentTypeKeyShare = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(
    await tx`select id from content_types where id = ${context.rootId}::uuid for key share`
  );
};

const lockAndDeleteContentType = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(
    await tx`select id from content_types where id = ${context.rootId}::uuid for update`
  );
  await tx`delete from content_types where id = ${context.rootId}::uuid`;
};

const lockEntryKeyShare = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(
    await tx`select id from content_entries where id = ${context.rootId}::uuid for key share`
  );
};

const lockAndDeleteEntry = async (tx: ReservedSql, context: RaceContext): Promise<void> => {
  requireLockedRow(
    await tx`select id from content_entries where id = ${context.rootId}::uuid for update`
  );
  await tx`delete from content_entries where id = ${context.rootId}::uuid`;
};

const runPageDelete = async (context: RaceContext): Promise<unknown> => {
  const snapshot = await capturePageLifecycleNativeSnapshot(context.rootId);
  if (!snapshot) throw new Error("native_fk_race_fixture_missing");
  return mutatePageLifecycleAtomic({
    operation: "delete",
    id: context.rootId,
    expectedCurrent: snapshot,
    actorId: context.actorId,
  });
};

const runFormDelete = async (context: RaceContext): Promise<unknown> => {
  const snapshot = await captureFormAggregateNativeSnapshot(context.rootId);
  if (!snapshot) throw new Error("native_fk_race_fixture_missing");
  return mutateFormAggregateAtomic({
    operation: "delete",
    id: context.rootId,
    expectedCurrent: snapshot,
    actorId: context.actorId,
  });
};

const runContentTypeDelete = async (context: RaceContext): Promise<unknown> => {
  const snapshot = await captureContentTypeNativeSnapshot(context.rootId);
  if (!snapshot) throw new Error("native_fk_race_fixture_missing");
  return mutateContentTypeAtomic({
    operation: "delete",
    id: context.rootId,
    expectedCurrent: snapshot,
    actorId: context.actorId,
  });
};

const runEntryDelete = async (context: RaceContext): Promise<unknown> => {
  const snapshot = await captureEntryLifecycleNativeSnapshot(context.rootId);
  if (!snapshot) throw new Error("native_fk_race_fixture_missing");
  return mutateEntryLifecycleAtomic({
    operation: "delete",
    id: context.rootId,
    expectedCurrent: snapshot,
    actorId: context.actorId,
  });
};

const runActionRemoval = async (context: RaceContext): Promise<unknown> => {
  const snapshot = await captureFormAggregateNativeSnapshot(context.rootId);
  if (!snapshot) throw new Error("native_fk_race_fixture_missing");
  return mutateFormAggregateAtomic({
    operation: "replace",
    id: context.rootId,
    expectedCurrent: snapshot,
    desired: { ...snapshot.desired, actions: [] },
    actorId: context.actorId,
  });
};

const runContentTypeRename = async (context: RaceContext): Promise<unknown> => {
  const snapshot = await captureContentTypeNativeSnapshot(context.rootId);
  if (!snapshot) throw new Error("native_fk_race_fixture_missing");
  return mutateContentTypeAtomic({
    operation: "replace",
    id: context.rootId,
    expectedCurrent: snapshot,
    desired: { ...snapshot.desired, slug: context.nextSlug },
    actorId: context.actorId,
  });
};

type RootContract = Readonly<
  Pick<RaceDescriptor, "waiterTable" | "setup" | "lockAndDeleteOrRename" | "runGuardedMutation"> & {
    lockReference: RaceDescriptor["lockAndWriteReference"];
    readRoot(client: SqlClient, context: RaceContext): CountQuery;
  }
>;

const rootContract = (
  waiterTable: string,
  setup: RaceDescriptor["setup"],
  lockReference: RaceDescriptor["lockAndWriteReference"],
  lockAndDeleteOrRename: RaceDescriptor["lockAndDeleteOrRename"],
  runGuardedMutation: RaceDescriptor["runGuardedMutation"],
  readRoot: RootContract["readRoot"]
): RootContract => ({
  waiterTable,
  setup,
  lockReference,
  lockAndDeleteOrRename,
  runGuardedMutation,
  readRoot,
});

const rootContracts = {
  page: rootContract(
    "pages",
    insertPage,
    lockPageKeyShare,
    lockAndDeletePage,
    runPageDelete,
    (client, context) =>
      client`select count(*)::int as count from pages where id = ${context.rootId}::uuid`
  ),
  form: rootContract(
    "forms",
    insertForm,
    lockFormKeyShare,
    lockAndDeleteForm,
    runFormDelete,
    (client, context) =>
      client`select count(*)::int as count from forms where id = ${context.rootId}::uuid`
  ),
  "content-type": rootContract(
    "content_types",
    (client, context) => insertContentType(client, context.rootId, context.rootSlug, context.scope),
    lockContentTypeKeyShare,
    lockAndDeleteContentType,
    runContentTypeDelete,
    (client, context) =>
      client`select count(*)::int as count from content_types where id = ${context.rootId}::uuid`
  ),
  entry: rootContract(
    "content_entries",
    async (client, context) => {
      await insertContentType(client, context.ownerId, context.rootSlug, context.scope);
      await insertEntry(client, context.rootId, context.ownerId, context);
    },
    lockEntryKeyShare,
    lockAndDeleteEntry,
    runEntryDelete,
    (client, context) =>
      client`select count(*)::int as count from content_entries where id = ${context.rootId}::uuid`
  ),
} satisfies Record<RootFamily, RootContract>;

const defineEdge = (edge: EdgeDescriptor, guardedError?: string): RaceDescriptor => {
  const root = rootContracts[edge.root];
  return {
    label: edge.label,
    waiterTable: root.waiterTable,
    setup: edge.setup ?? root.setup,
    lockAndWriteReference: async (tx, context) => {
      await root.lockReference(tx, context);
      await edge.lockAndWriteReference(tx, context);
    },
    lockAndDeleteOrRename: root.lockAndDeleteOrRename,
    runGuardedMutation: root.runGuardedMutation,
    runReferenceWriter: edge.runReferenceWriter,
    guardedError: guardedError ?? "site_package_state_changed",
    writerError: edge.writerError,
    readState: (client, context) =>
      readCounts(root.readRoot(client, context), ...edge.readReferences(client, context)),
    writerFirstState: [1, 1],
    deleteFirstState: [0, 0],
  };
};

const actionRunInput = (context: RaceContext, actionId: Uuid | null) => ({
  formId: context.rootId,
  actionId,
  actionType: "success_message" as const,
  actionLabel: "Race action",
  status: "success" as const,
  actionCondition: { operator: "always" as const },
  actionConfig: { message: "Saved" },
  submissionPayload: {},
});

const entryDesired = (context: RaceContext) => ({
  contentTypeId: context.rootId,
  authorId: null,
  title: `Entry ${context.scope}`,
  slug: `entry-${context.scope}`,
  status: "draft" as const,
  visibility: "public" as const,
  tags: [],
  data: {},
  publishedAt: null,
  scheduledAt: null,
  revisions: [],
});

const listingDesired = (context: RaceContext) => ({
  name: `Listing ${context.scope}`,
  description: null,
  query: {
    source: "entries" as const,
    sourceConfig: { contentTypeId: context.rootId, includeDrafts: false },
    filters: [],
    sort: [{ field: "id", dir: "asc" as const }],
    pagination: { limit: 10, offset: 0 },
    fields: ["id", "title"],
  },
});

const detailDesired = (context: RaceContext) =>
  prepareDetailPageDocumentLifecycleNativeTargets({
    id: context.referenceId,
    desired: {
      name: `Detail ${context.scope}`,
      contentTypeId: context.rootId,
      contentTypeSlug: context.rootSlug,
      status: "draft",
      titlePattern: "{{ title }}",
      settings: { template: "detail", layout: {} },
      blocks: [],
    },
    actorId: context.actorId,
    expectedCurrent: null,
    revisionId: context.revisionId,
    publicationTimestamp: ACTOR_TIMESTAMP,
  }).complete.desired;

const OVERRIDE_DEFINITION =
  '{"schemaVersion":4,"listView":{"columns":[],"filters":[],"defaultSort":{"field":"updatedAt","direction":"desc"},"bulkActions":{"delete":true,"publish":true,"unpublish":true}},"editorView":{"document":{"schemaVersion":1,"sections":[{"id":"section-1","type":"section","data":{"title":"Details"},"blocks":[{"id":"direct-image","type":"image","data":{"label":"Cover","src":"/static/cover.jpg"}}]}]},"bindings":[],"saveMode":"entry","interactionMode":"inline"}}';

const descriptors: readonly RaceDescriptor[] = [
  defineEdge({
    label: "menu-items-page",
    root: "page",
    setup: async (client, context) => {
      await insertPage(client, context);
      await client`insert into menus (id, name, status) values (${context.ownerId}::uuid, ${`Menu ${context.scope}`}, 'draft')`;
    },
    lockAndWriteReference: (tx, context) =>
      tx`insert into menu_items (id, menu_id, label, page_id, order_index, settings) values (${context.referenceId}::uuid, ${context.ownerId}::uuid, 'Page', ${context.rootId}::uuid, 0, '{}'::jsonb)`,
    runReferenceWriter: (context) =>
      replaceMenuItems(context.ownerId, [
        { id: context.referenceId, label: "Page", pageId: context.rootId },
      ]),
    writerError: "menu_item_page_missing",
    readReferences: (client, context) => [
      client`select count(*)::int as count from menu_items where id = ${context.referenceId}::uuid and page_id = ${context.rootId}::uuid`,
    ],
  }),
  defineEdge({
    label: "theme-routes-page",
    root: "page",
    setup: async (client, context) => {
      await insertPage(client, context);
      await client`insert into theme_profiles (id, name, theme_name, tokens, is_active) values (${context.ownerId}::uuid, ${`Theme ${context.scope}`}, 'default', '{}'::jsonb, false)`;
    },
    lockAndWriteReference: (tx, context) =>
      tx`insert into theme_routes (id, profile_id, path, page_id) values (${context.referenceId}::uuid, ${context.ownerId}::uuid, ${`/${context.scope}`}, ${context.rootId}::uuid)`,
    runReferenceWriter: (context) =>
      setThemeRoutes(context.ownerId, [{ path: `/${context.scope}`, pageId: context.rootId }]),
    writerError: "theme_route_invalid",
    readReferences: (client, context) => [
      client`select count(*)::int as count from theme_routes where profile_id = ${context.ownerId}::uuid and page_id = ${context.rootId}::uuid`,
    ],
  }),
  defineEdge({
    label: "form-submissions-form",
    root: "form",
    lockAndWriteReference: (tx, context) =>
      tx`insert into form_submissions (id, form_id, payload, status) values (${context.referenceId}::uuid, ${context.rootId}::uuid, '{}'::jsonb, 'new')`,
    runReferenceWriter: (context) => submitForm(context.rootId, {}),
    writerError: "form_not_found",
    readReferences: (client, context) => [
      client`select count(*)::int as count from form_submissions where form_id = ${context.rootId}::uuid`,
    ],
  }),
  defineEdge({
    label: "form-action-runs-form",
    root: "form",
    lockAndWriteReference: (tx, context) => insertActionRun(tx, context, null),
    runReferenceWriter: (context) => createFormActionRun(actionRunInput(context, null)),
    writerError: "form_not_found",
    readReferences: (client, context) => [
      client`select count(*)::int as count from form_action_runs where form_id = ${context.rootId}::uuid`,
    ],
  }),
  {
    label: "form-action-runs-removed-action",
    waiterTable: "forms",
    setup: async (client, context) => {
      await insertForm(client, context);
      await client`
        insert into form_actions (
          id, form_id, type, label, enabled, continue_on_error,
          condition, config, order_index
        ) values (
          ${context.actionId}::uuid, ${context.rootId}::uuid,
          'success_message', 'Success', true, true,
          '{"operator":"always"}'::jsonb, '{"message":"Saved"}'::jsonb, 0
        )
      `;
    },
    lockAndWriteReference: async (tx, context) => {
      await lockFormKeyShare(tx, context);
      await insertActionRun(tx, context, context.actionId);
    },
    lockAndDeleteOrRename: async (tx, context) => {
      requireLockedRow(
        await tx`select id from forms where id = ${context.rootId}::uuid for update`
      );
      await tx`delete from form_actions where id = ${context.actionId}::uuid`;
    },
    runGuardedMutation: runActionRemoval,
    runReferenceWriter: (context) => createFormActionRun(actionRunInput(context, context.actionId)),
    guardedError: "site_package_state_changed",
    writerError: "form_action_not_found",
    readState: (client, context) =>
      readCounts(
        client`select count(*)::int as count from forms where id = ${context.rootId}::uuid`,
        client`select count(*)::int as count from form_actions where id = ${context.actionId}::uuid`,
        client`select count(*)::int as count from form_action_runs where form_id = ${context.rootId}::uuid`
      ),
    writerFirstState: [1, 1, 1],
    deleteFirstState: [1, 0, 0],
  },
  defineEdge(
    {
      label: "content-entries-content-type",
      root: "content-type",
      lockAndWriteReference: (tx, context) =>
        tx`insert into content_entries (id, type_id, slug, title, status, visibility, tags, data) values (${context.referenceId}::uuid, ${context.rootId}::uuid, ${`entry-${context.scope}`}, 'Entry', 'draft', 'public', '[]'::jsonb, '{}'::jsonb)`,
      runReferenceWriter: (context) =>
        mutateEntryLifecycleAtomic({
          operation: "create",
          id: context.referenceId,
          desired: entryDesired(context),
          actorId: context.actorId,
        }),
      writerError: "content_type_not_found",
      readReferences: (client, context) => [
        client`select count(*)::int as count from content_entries where id = ${context.referenceId}::uuid and type_id = ${context.rootId}::uuid`,
      ],
    },
    "content_type_has_entries"
  ),
  defineEdge(
    {
      label: "custom-screens-content-type",
      root: "content-type",
      setup: async (client, context) => {
        await insertContentType(client, context.rootId, context.rootSlug, context.scope);
        await insertContentType(
          client,
          context.ownerId,
          `aux-${context.scope}`,
          `${context.scope}-aux`
        );
        await client`insert into custom_screens (id, name, content_type_id, status, schema_version, definition) values (${context.referenceId}::uuid, 'Screen', ${context.ownerId}::uuid, 'draft', 4, '{}'::jsonb)`;
      },
      lockAndWriteReference: (tx, context) =>
        tx`update custom_screens set content_type_id = ${context.rootId}::uuid where id = ${context.referenceId}::uuid`,
      runReferenceWriter: (context) =>
        updateCustomScreen(context.referenceId, { contentTypeId: context.rootId }),
      writerError: "custom_screen_invalid",
      readReferences: (client, context) => [
        client`select count(*)::int as count from custom_screens where id = ${context.referenceId}::uuid and content_type_id = ${context.rootId}::uuid`,
      ],
    },
    "content_type_has_custom_screens"
  ),
  defineEdge(
    {
      label: "taxonomies-content-type",
      root: "content-type",
      lockAndWriteReference: (tx, context) =>
        tx`insert into content_taxonomies (id, type_id, name, slug, kind) values (${context.referenceId}::uuid, ${context.rootId}::uuid, 'Tags', 'tags', 'tag')`,
      runReferenceWriter: (context) => setTaxonomyConfig(context.rootId, { tags: true }),
      writerError: "taxonomy_not_found",
      readReferences: (client, context) => [
        client`select count(*)::int as count from content_taxonomies where type_id = ${context.rootId}::uuid`,
      ],
    },
    "content_type_has_taxonomies"
  ),
  defineEdge(
    {
      label: "detail-pages-content-type",
      root: "content-type",
      lockAndWriteReference: (tx, context) =>
        tx`insert into detail_page_documents (id, name, content_type_id, status, current_document) values (${context.referenceId}::uuid, 'Detail', ${context.rootId}::uuid, 'draft', '{}'::jsonb)`,
      runReferenceWriter: (context) =>
        mutateDetailPageDocumentLifecycleAtomic({
          operation: "create",
          id: context.referenceId,
          desired: detailDesired(context),
          actorId: context.actorId,
        }),
      writerError: "detail_page_invalid",
      readReferences: (client, context) => [
        client`select count(*)::int as count from detail_page_documents where id = ${context.referenceId}::uuid and content_type_id = ${context.rootId}::uuid`,
      ],
    },
    "content_type_has_detail_pages"
  ),
  defineEdge(
    {
      label: "listing-queries-content-type",
      root: "content-type",
      lockAndWriteReference: async (tx, context) => {
        await tx`
          insert into listing_queries (id, name, query)
          values (${context.referenceId}::uuid, 'Listing', ${tx.json(listingDesired(context).query)})
        `;
        const [fixture] = await tx<{ count: number }[]>`
          select count(*)::int as count from listing_queries
          where id = ${context.referenceId}::uuid
            and query->'sourceConfig'->>'contentTypeId' = ${context.rootId}
        `;
        if (fixture?.count !== 1) {
          throw new Error("native_fk_race_listing_fixture_invalid");
        }
      },
      runReferenceWriter: (context) =>
        mutateListingQueryAtomic({
          operation: "create",
          id: context.referenceId,
          desired: listingDesired(context),
          actorId: context.actorId,
        }),
      writerError: "listing_query_invalid_source_config",
      readReferences: (client, context) => [
        client`select count(*)::int as count from listing_queries where id = ${context.referenceId}::uuid and query->'sourceConfig'->>'contentTypeId' = ${context.rootId}`,
      ],
    },
    "content_type_has_listings"
  ),
  defineEdge({
    label: "presentation-overrides-entry",
    root: "entry",
    setup: async (client, context) => {
      await rootContracts.entry.setup(client, context);
      await client`insert into custom_screens (id, name, content_type_id, status, schema_version, definition) values (${context.auxiliaryId}::uuid, 'Screen', ${context.ownerId}::uuid, 'draft', 4, ${OVERRIDE_DEFINITION}::jsonb)`;
    },
    lockAndWriteReference: (tx, context) =>
      tx`insert into custom_screen_entry_presentation_overrides (screen_id, entry_id, block_id, prop_path, value) values (${context.auxiliaryId}::uuid, ${context.rootId}::uuid, 'direct-image', 'mediaAssetId', ${JSON.stringify(context.referenceId)}::jsonb)`,
    runReferenceWriter: (context) =>
      saveScreenEntryPresentationOverrides({
        screenId: context.auxiliaryId,
        entryId: context.rootId,
        actorId: context.actorId,
        overrides: [
          {
            blockId: "direct-image",
            propPath: "mediaAssetId",
            value: context.referenceId,
          },
        ],
      }),
    writerError: "custom_screen_override_not_found",
    readReferences: (client, context) => [
      client`select count(*)::int as count from custom_screen_entry_presentation_overrides where screen_id = ${context.auxiliaryId}::uuid and entry_id = ${context.rootId}::uuid`,
    ],
  }),
  defineEdge({
    label: "taxonomy-assignments-entry",
    root: "entry",
    setup: async (client, context) => {
      await rootContracts.entry.setup(client, context);
      await client`insert into content_taxonomies (id, type_id, name, slug, kind) values (${context.auxiliaryId}::uuid, ${context.ownerId}::uuid, 'Tags', 'tags', 'tag')`;
      await client`insert into content_terms (id, taxonomy_id, name, slug) values (${context.termId}::uuid, ${context.auxiliaryId}::uuid, 'Race', 'race')`;
    },
    lockAndWriteReference: (tx, context) =>
      tx`insert into content_term_assignments (entry_id, term_id) values (${context.rootId}::uuid, ${context.termId}::uuid)`,
    runReferenceWriter: (context) =>
      replaceEntryTaxonomies(context.rootId, context.ownerId, { tagIds: [context.termId] }),
    writerError: "taxonomy_not_found",
    readReferences: (client, context) => [
      client`select count(*)::int as count from content_term_assignments where entry_id = ${context.rootId}::uuid and term_id = ${context.termId}::uuid`,
    ],
  }),
  {
    label: "site-content-routes-content-type-rename",
    waiterTable: "content_types",
    setup: async (client, context) => {
      await insertContentType(client, context.rootId, context.rootSlug, context.scope);
      const [prior] = await client<{ value: unknown; updated_at: Date }[]>`
        select value, updated_at from settings where key = 'site.contentRoutes'
      `;
      context.priorRoutes = prior
        ? { present: true, value: prior.value, updatedAt: prior.updated_at }
        : { present: false };
    },
    lockAndWriteReference: async (tx, context) => {
      await lockContentTypeKeyShare(tx, context);
      const routes = [
        {
          type: context.rootSlug,
          listPath: `/catalog-${context.scope}`,
          detailPath: `/catalog-${context.scope}/:slug`,
          enabled: true,
        },
      ];
      await tx`
        insert into settings (key, value, updated_at)
        values ('site.contentRoutes', ${tx.json(routes)}, now())
        on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
      `;
    },
    lockAndDeleteOrRename: async (tx, context) => {
      requireLockedRow(
        await tx`select id from content_types where id = ${context.rootId}::uuid for update`
      );
      await tx`update content_types set slug = ${context.nextSlug}, updated_at = now() where id = ${context.rootId}::uuid`;
    },
    runGuardedMutation: runContentTypeRename,
    runReferenceWriter: (context) =>
      setSetting("site.contentRoutes", [
        {
          type: context.rootSlug,
          listPath: `/catalog-${context.scope}`,
          detailPath: `/catalog-${context.scope}/:slug`,
          enabled: true,
        },
      ]),
    guardedError: "content_type_has_content_routes",
    writerError: "settings_value_invalid",
    readState: async (client, context) => {
      const [root] = await client<{ slug: string }[]>`
        select slug from content_types where id = ${context.rootId}::uuid
      `;
      const [route] = await client<{ value: unknown }[]>`
        select value from settings where key = 'site.contentRoutes'
      `;
      if (root?.slug === context.rootSlug) {
        const value = Array.isArray(route?.value) ? route.value : [];
        const matches = value.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            Reflect.get(item, "type") === context.rootSlug
        ).length;
        return [1, matches];
      }
      const priorMatches = context.priorRoutes?.present
        ? Number(isDeepStrictEqual(route?.value, context.priorRoutes.value))
        : Number(route === undefined);
      return [Number(root?.slug === context.nextSlug), priorMatches];
    },
    writerFirstState: [1, 1],
    deleteFirstState: [1, 1],
  },
] as const;

test("native reverse and pseudo-FK races fail closed in both transaction orders", async () => {
  const proofs: LockProof[] = [];
  for (const descriptor of descriptors) {
    proofs.push(await runRace(descriptor, "writer-first"));
    proofs.push(await runRace(descriptor, "delete-first"));
  }
  expect(proofs).toHaveLength(descriptors.length * 2);
  expect(proofs.every((proof) => proof.holderPid > 0 && proof.waiterPid > 0)).toBe(true);
}, 360_000);
