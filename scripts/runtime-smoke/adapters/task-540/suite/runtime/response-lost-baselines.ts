import type { BaselineBatchItem } from "../../../../database/batch-contract";
import type { PlainJsonObject } from "../../../../workers/contracts";
import type { WorkerPool } from "../../../../workers/pool";
import { buildTask540BaselineDispatches } from "../../cleanup-batches";
import { requireTask540OperationAlias } from "../../operations/aliases";
import { TASK540_PRODUCTION_HANDLER_ARTIFACT } from "../../production-handlers";
import type { Task540BaselineBatchOutput } from "../../worker-operations";
import type { Task540NativePlan } from "../composition/contracts";
import { fixtureObject, runtimeInvariant, runtimeObject, runtimeString } from "./native-utils";

interface BaselineAuthority {
  readonly actionId: string;
  readonly operationId: string;
  readonly profileId: "database" | "user-identity-proof";
  readonly input: PlainJsonObject;
}

function row(
  plan: Task540NativePlan,
  actionId: string,
  suffix: string,
  input: PlainJsonObject
): BaselineAuthority {
  const operationId = `response-lost/preflight/${suffix}`;
  const alias = requireTask540OperationAlias(operationId);
  runtimeInvariant(
    alias.profileId === "database" || alias.profileId === "user-identity-proof",
    "TASK-540 baseline profile drifted"
  );
  runtimeInvariant(
    plan.actionManifest.some((action) => action.id === actionId),
    "TASK-540 baseline action is absent"
  );
  return Object.freeze({ actionId, operationId, profileId: alias.profileId, input });
}

export function buildTask540ResponseLostBaselineItems(
  plan: Task540NativePlan
): readonly BaselineBatchItem[] {
  const fixture = plan.fixtureBlueprint;
  const types = runtimeObject(fixture.contentTypes, "TASK-540 baseline content types");
  const entries = runtimeObject(fixture.relatedEntries, "TASK-540 baseline entries");
  const users = runtimeObject(fixture.users, "TASK-540 baseline users");
  const editable = runtimeObject(types.editable, "TASK-540 editable type");
  const relatedA = runtimeObject(types.relatedA, "TASK-540 related-A type");
  const relatedB = runtimeObject(types.relatedB, "TASK-540 related-B type");
  const relatedFailure = runtimeObject(types.relatedFailure, "TASK-540 related-failure type");
  const entryRows = [
    ["set-022-related-a1-create", "entry-related-a1", relatedA, entries.a1],
    ["set-024-related-a2-create", "entry-related-a2", relatedA, entries.a2],
    ["set-026-related-b1-create", "entry-related-b1", relatedB, entries.b1],
    ["set-028-related-b2-create", "entry-related-b2", relatedB, entries.b2],
    [
      "set-029a-related-failure1-create",
      "entry-related-failure1",
      relatedFailure,
      entries.failure1,
    ],
    ["set-033-entry-create", "entry-editable", editable, fixture.entry],
  ] as const;
  const authorities: BaselineAuthority[] = [
    row(plan, "set-012-user-a-create", "user-a", {
      email: runtimeString(
        runtimeObject(users.a, "TASK-540 user A").email,
        "TASK-540 user A email"
      ),
    }),
    row(plan, "set-014-user-b-create", "user-b", {
      email: runtimeString(
        runtimeObject(users.b, "TASK-540 user B").email,
        "TASK-540 user B email"
      ),
    }),
  ];
  for (const [actionId, suffix, type] of [
    ["set-016-editable-type-create", "content-type-editable", editable],
    ["set-018-related-a-type-create", "content-type-related-a", relatedA],
    ["set-020-related-b-type-create", "content-type-related-b", relatedB],
    ["set-021a-related-failure-type-create", "content-type-related-failure", relatedFailure],
  ] as const) {
    authorities.push(
      row(plan, actionId, suffix, {
        slug: runtimeString(type.slug, "TASK-540 baseline content-type slug"),
      })
    );
  }
  for (const [actionId, suffix, typeValue, entryValue] of entryRows) {
    const type = runtimeObject(typeValue, "TASK-540 baseline entry type");
    const entry = runtimeObject(entryValue, "TASK-540 baseline entry");
    authorities.push(
      row(plan, actionId, suffix, {
        entrySlug: runtimeString(entry.slug, "TASK-540 baseline entry slug"),
        typeSlug: runtimeString(type.slug, "TASK-540 baseline entry type slug"),
      })
    );
  }
  const media = fixtureObject(fixture, ["media"], "TASK-540 baseline media");
  const upload = runtimeObject(media.uploadFixture, "TASK-540 baseline media fixture");
  authorities.push(
    row(plan, "set-030-media-upload", "media", {
      mimeType: runtimeString(media.mimeType, "TASK-540 baseline media MIME"),
      originalName: runtimeString(media.originalName, "TASK-540 baseline media name"),
      size: upload.decodedSizeBytes as number,
    })
  );
  for (const [actionId, suffix, key] of [
    ["set-035-screen-create", "screen-main", "screen"],
    ["set-037-retry-screen-create", "screen-retry", "retryScreen"],
  ] as const) {
    const screen = fixtureObject(fixture, [key], "TASK-540 baseline Screen");
    authorities.push(
      row(plan, actionId, suffix, {
        contentTypeSlug: runtimeString(editable.slug, "TASK-540 baseline Screen type slug"),
        name: runtimeString(screen.name, "TASK-540 baseline Screen name"),
      })
    );
  }
  const screen = fixtureObject(fixture, ["screen"], "TASK-540 baseline override Screen");
  const blocks = runtimeObject(screen.blockIds, "TASK-540 baseline Screen blocks");
  const editableEntry = fixtureObject(fixture, ["entry"], "TASK-540 baseline editable entry");
  authorities.push(
    row(plan, "set-039-override-create", "override", {
      blockId: runtimeString(blocks.raceImage, "TASK-540 baseline override block"),
      contentTypeSlug: runtimeString(editable.slug, "TASK-540 baseline override type"),
      entrySlug: runtimeString(editableEntry.slug, "TASK-540 baseline override entry"),
      propPath: "mediaAssetId",
      screenName: runtimeString(screen.name, "TASK-540 baseline override Screen"),
    })
  );
  for (const [actionId, suffix, userKey] of [
    ["set-041-preference-a", "setting-user-a", "a"],
    ["set-043-preference-b", "setting-user-b", "b"],
  ] as const) {
    const user = runtimeObject(users[userKey], "TASK-540 baseline setting user");
    authorities.push(
      row(plan, actionId, suffix, {
        email: runtimeString(user.email, "TASK-540 baseline setting email"),
      })
    );
  }
  runtimeInvariant(authorities.length === 18, "TASK-540 baseline cardinality drifted");
  return Object.freeze(
    authorities.map(({ actionId, operationId, profileId, input }) =>
      Object.freeze({
        logicalId: `baseline/${actionId}`,
        operationId,
        profileId,
        input: Object.freeze({ ...input }),
      })
    )
  );
}

export async function captureTask540ResponseLostBaselines(
  pool: WorkerPool,
  plan: Task540NativePlan
): Promise<readonly string[]> {
  const items = buildTask540ResponseLostBaselineItems(plan);
  const dispatches = buildTask540BaselineDispatches(items, TASK540_PRODUCTION_HANDLER_ARTIFACT);
  runtimeInvariant(dispatches.length === 2, "TASK-540 baseline batch partition drifted");
  const outputs: Task540BaselineBatchOutput[] = [];
  for (const dispatch of dispatches) {
    outputs.push(
      (await pool.dispatch(dispatch.descriptor, dispatch.input)) as Task540BaselineBatchOutput
    );
  }
  const results = outputs.flatMap(({ results }) => results);
  runtimeInvariant(results.length === 18, "TASK-540 baseline result cardinality drifted");
  const expected = new Set(items.map(({ logicalId }) => logicalId));
  for (const result of results) {
    const output = runtimeObject(result.output, "TASK-540 baseline result");
    runtimeInvariant(
      expected.delete(result.logicalId) &&
        Array.isArray(output.candidates) &&
        output.candidates.length === 0 &&
        output.overflow === false,
      "TASK-540 response-lost baseline is not empty"
    );
  }
  runtimeInvariant(expected.size === 0, "TASK-540 baseline result is absent");
  return Object.freeze(items.map(({ logicalId }) => logicalId));
}
