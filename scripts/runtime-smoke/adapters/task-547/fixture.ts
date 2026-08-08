import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { and, eq, inArray, or, sql } from "drizzle-orm";

import { isPlainObject, resolveInsideRoot, SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import type { WorkerOperationRegistry } from "../../workers/operation-registry";
import { WorkerPool, type WorkerProfileSpec } from "../../workers/pool";
import type { FullSiteNativeSnapshot } from "../../../../core/services/kits/fullSiteInstall/adapterTypes";
import type { FullSiteInstallResourceKind } from "../../../../core/services/kits/fullSiteInstallTypes";
import type { FormAggregateNativeSnapshot } from "../../../../core/services/forms/formAggregateService";
import type { FullSiteRawSettingState } from "../../../../core/services/settings/fullSiteSettingsAtomicService";
import type {
  Task547CheckpointInput,
  Task547CheckpointOutput,
  Task547CleanupOutput,
  Task547InstallInput,
  Task547InstallOutput,
  Task547ProofOutput,
  Task547ResetOutput,
  Task547RollbackOutput,
  Task547WorkerHandlers,
} from "./worker-operations";

export const TASK547_MUTABLE_RESOURCE_SLOTS = Object.freeze([
  "form",
  "home-page",
  "projects-page",
  "contact-page",
] as const);

export type Task547MutableResourceSlot = (typeof TASK547_MUTABLE_RESOURCE_SLOTS)[number];

export const TASK547_MUTATION_SLOTS: Readonly<
  Record<string, readonly Task547MutableResourceSlot[]>
> = Object.freeze({
  "form-design-author-light": Object.freeze(["form"] as const),
  "form-design-author-dark": Object.freeze(["form"] as const),
  "form-design-reset-mobile": Object.freeze(["form"] as const),
  "form-design-save-reload": Object.freeze(["form"] as const),
  "page-editor-switcher-author-light": Object.freeze(["home-page"] as const),
  "page-editor-switcher-tablet-reset": Object.freeze(["home-page"] as const),
  "page-editor-collection-cta-dark": Object.freeze(["projects-page"] as const),
  "page-editor-form-presentation-save-reload": Object.freeze(["contact-page"] as const),
  "page-editor-publish-front-parity": Object.freeze(["contact-page"] as const),
});

type Task547SubmissionMarkerKey = keyof Task547InstallOutput["markers"];

export const TASK547_SUBMISSION_MARKER_KEYS: Readonly<
  Record<string, readonly Task547SubmissionMarkerKey[]>
> = Object.freeze({
  "contact-form": Object.freeze(["publicContact", "internalSession", "internalApiKey"] as const),
  "form-design-publish-front": Object.freeze(["formDesign"] as const),
  "page-editor-publish-front-parity": Object.freeze(["pageEditor"] as const),
});

interface MutableSnapshotState {
  readonly kind: "form" | "page";
  readonly id: string;
  readonly installed: FullSiteNativeSnapshot;
  expectedCurrent: FullSiteNativeSnapshot;
}

interface Task547WorkerState {
  nonce: string;
  actorId: string;
  sourceRunId: string;
  publicFormId: string;
  internalFormId: string;
  apiKeyId: string;
  apiKeySecret: string;
  markers: Task547InstallOutput["markers"];
  priorSettings: readonly FullSiteRawSettingState[];
  installedSettings: readonly FullSiteRawSettingState[];
  mutable: Readonly<Record<Task547MutableResourceSlot, MutableSnapshotState>>;
  internalFormSnapshot: FormAggregateNativeSnapshot;
  installedItems: readonly InstalledLedgerItem[];
  attachedSubmissionIds: Set<string>;
  cleanupOutput: Task547CleanupOutput | null;
  resetOutput: Task547ResetOutput | null;
  rollbackOutput: Task547RollbackOutput | null;
  officialRollbackCalls: number;
}

interface InstalledLedgerItem {
  readonly kind: FullSiteInstallResourceKind;
  readonly key: string;
  readonly operation: string;
  readonly beforeSnapshot: FullSiteNativeSnapshot | null;
  readonly afterSnapshot: FullSiteNativeSnapshot;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class Task547ProductionHandlers implements Task547WorkerHandlers {
  #state: Task547WorkerState | null = null;

  async install(input: Task547InstallInput): Promise<Task547InstallOutput> {
    if (this.#state !== null) throw new Error("task_547_fixture_already_installed");
    const email = process.env.CODERSO_PLAYWRIGHT_EMAIL ?? process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "";
    const [userModule, packageModule, executeModule, ledgerModule, resolverModule, settingsModule] =
      await Promise.all([
        import("../../../../core/services/auth/userService"),
        import("../../../projekty-domow/package"),
        import("../../../../core/services/kits/fullSiteInstall/execute"),
        import("../../../../core/services/kits/legacyInstallRunPersistence"),
        import("../../../../core/services/kits/fullSiteInstall/currentResourceResolver"),
        import("../../../../core/services/settings/fullSiteSettingsAtomicService"),
      ]);
    const actor = await userModule.getUserByEmail(email);
    if (!actor || !UUID.test(actor.id)) throw new Error("task_547_actor_unavailable");
    const pkg = packageModule.buildFormaDomPackage();
    const settingKeys = pkg.resources.settings.map(({ key }) => key).sort();
    const priorSettings = await settingsModule.captureFullSiteSettingsBatchRaw(settingKeys);
    let applied: Awaited<ReturnType<typeof executeModule.applyFullSitePackage>> | null = null;
    let internalSnapshot: FormAggregateNativeSnapshot | null = null;
    let apiKeyId: string | null = null;
    try {
      applied = await executeModule.applyFullSitePackage(
        {
          package: pkg,
          actorId: actor.id,
          allowSettingTakeover: true,
        },
        {
          ledger: ledgerModule.defaultLegacyInstallLedger,
          resolveCurrentResource: resolverModule.createFullSiteCurrentResourceResolver(
            pkg.key,
            ledgerModule.defaultLegacyInstallLedger
          ),
        }
      );
      const installedSettings = await settingsModule.captureFullSiteSettingsBatchRaw(settingKeys);
      const ids = new Map(applied.resources.map(({ identity, id }) => [identity, id]));
      const requireResource = (identity: string): string => {
        const id = ids.get(identity);
        if (typeof id !== "string" || !UUID.test(id)) {
          throw new Error("task_547_install_resource_missing");
        }
        return id;
      };
      const publicFormId = requireResource("form:project-brief");
      const homePageId = requireResource("page:home");
      const projectsPageId = requireResource("page:projekty");
      const contactPageId = requireResource("page:kontakt");
      const adaptersModule =
        await import("../../../../core/services/kits/fullSiteInstall/adapters");
      const [formInstalled, homeInstalled, projectsInstalled, contactInstalled] = await Promise.all(
        [
          adaptersModule.FULL_SITE_RESOURCE_ADAPTERS.form.captureSnapshotById!(publicFormId),
          adaptersModule.FULL_SITE_RESOURCE_ADAPTERS.page.captureSnapshotById!(homePageId),
          adaptersModule.FULL_SITE_RESOURCE_ADAPTERS.page.captureSnapshotById!(projectsPageId),
          adaptersModule.FULL_SITE_RESOURCE_ADAPTERS.page.captureSnapshotById!(contactPageId),
        ]
      );
      const aggregateModule = await import("../../../../core/services/forms/formAggregateService");
      const internalFormId = randomUUID();
      const internalFieldId = randomUUID();
      const desired = aggregateModule.normalizeFormAggregateNativeDesired({
        name: `TASK-547 internal ${input.nonce}`,
        slug: `task-547-internal-${input.nonce}`,
        status: "published",
        description: null,
        successMessage: "Accepted",
        successRedirectUrl: null,
        submissionAccess: "internal",
        settings: {},
        fields: [
          {
            id: internalFieldId,
            type: "text",
            label: "Marker",
            name: "marker",
            required: true,
            orderIndex: 0,
            settings: {},
          },
        ],
        actions: [],
      });
      const created = await aggregateModule.mutateFormAggregateAtomic({
        operation: "create",
        id: internalFormId,
        desired,
        actorId: actor.id,
      });
      if (created.snapshot === null) throw new Error("task_547_internal_form_create_failed");
      internalSnapshot = created.snapshot;
      const apiKeyModule = await import("../../../../core/services/security/apiKeysService");
      const apiKey = await apiKeyModule.createApiKey({
        name: `TASK-547 ${input.nonce}`,
        scopes: ["forms.submit"],
      });
      apiKeyId = apiKey.apiKey.id;
      const markers = Object.freeze({
        publicContact: `wf547-public-contact-${input.nonce}`,
        internalSession: `wf547-internal-session-${input.nonce}`,
        internalApiKey: `wf547-internal-api-${input.nonce}`,
        formDesign: `wf547-form-design-${input.nonce}`,
        pageEditor: `wf547-page-editor-${input.nonce}`,
      });
      const rawItems = await ledgerModule.defaultLegacyInstallLedger.listItems(applied.runId);
      const installedItems = rawItems.flatMap((item): InstalledLedgerItem[] => {
        if (
          item.status !== "success" ||
          item.operation === "noop" ||
          item.kind === "setting" ||
          !isPlainObject(item.afterSnapshot) ||
          typeof item.afterSnapshot.id !== "string" ||
          !isPlainObject(item.afterSnapshot.desired)
        ) {
          return [];
        }
        const before =
          isPlainObject(item.beforeSnapshot) &&
          typeof item.beforeSnapshot.id === "string" &&
          isPlainObject(item.beforeSnapshot.desired)
            ? (cloneJson(item.beforeSnapshot) as FullSiteNativeSnapshot)
            : null;
        return [
          Object.freeze({
            kind: item.kind,
            key: item.key,
            operation: item.operation,
            beforeSnapshot: before,
            afterSnapshot: cloneJson(item.afterSnapshot) as FullSiteNativeSnapshot,
          }),
        ];
      });
      const mutable: Record<Task547MutableResourceSlot, MutableSnapshotState> = {
        form: {
          kind: "form",
          id: publicFormId,
          installed: cloneJson(formInstalled),
          expectedCurrent: cloneJson(formInstalled),
        },
        "home-page": {
          kind: "page",
          id: homePageId,
          installed: cloneJson(homeInstalled),
          expectedCurrent: cloneJson(homeInstalled),
        },
        "projects-page": {
          kind: "page",
          id: projectsPageId,
          installed: cloneJson(projectsInstalled),
          expectedCurrent: cloneJson(projectsInstalled),
        },
        "contact-page": {
          kind: "page",
          id: contactPageId,
          installed: cloneJson(contactInstalled),
          expectedCurrent: cloneJson(contactInstalled),
        },
      };
      this.#state = {
        nonce: input.nonce,
        actorId: actor.id,
        sourceRunId: applied.runId,
        publicFormId,
        internalFormId,
        apiKeyId,
        apiKeySecret: apiKey.secret,
        markers,
        priorSettings: cloneJson(priorSettings),
        installedSettings: cloneJson(installedSettings),
        mutable,
        internalFormSnapshot: cloneJson(internalSnapshot),
        installedItems: Object.freeze(installedItems),
        attachedSubmissionIds: new Set(),
        cleanupOutput: null,
        resetOutput: null,
        rollbackOutput: null,
        officialRollbackCalls: 0,
      };
      const lifecycle = Object.freeze({
        stagedThenPublished: Object.freeze(["page", "entry", "detail_page", "menu"]),
        directPublished: Object.freeze(["form"]),
        statusless: Object.freeze(["listing_template"]),
        enabledOnlyOnAction: true,
      });
      return Object.freeze({
        schemaVersion: 1,
        sourceRunId: applied.runId,
        actorId: actor.id,
        publicFormId,
        internalFormId,
        homePageId,
        projectsPageId,
        contactPageId,
        apiKeySecret: apiKey.secret,
        markers,
        installedDigest: digest({
          sourceRunId: applied.runId,
          settings: installedSettings,
          mutable: Object.values(mutable).map(({ kind, id, installed }) => ({
            kind,
            id,
            installed,
          })),
        }),
        lifecycle,
        statements: 1,
        rows: applied.resources.length + 2,
      });
    } catch (error) {
      try {
        await this.#emergencyInstallCleanup({
          actorId: actor.id,
          sourceRunId: applied?.runId ?? null,
          internalSnapshot,
          apiKeyId,
        });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "TASK-547 install and emergency cleanup failed"
        );
      }
      throw error;
    }
  }

  async checkpoint(input: Task547CheckpointInput): Promise<Task547CheckpointOutput> {
    const state = this.#requireState();
    const { db } = await import("../../../../core/db/client");
    const { formSubmissions } = await import("../../../../core/db/schema");
    const rows =
      input.submissionIds.length === 0
        ? []
        : await db
            .select({
              id: formSubmissions.id,
              formId: formSubmissions.formId,
              payload: formSubmissions.payload,
            })
            .from(formSubmissions)
            .where(inArray(formSubmissions.id, [...input.submissionIds]));
    const markerKeys = TASK547_SUBMISSION_MARKER_KEYS[input.scenarioId] ?? [];
    const expectedMarkers = markerKeys.map((key) => state.markers[key]);
    const observedMarkers = rows.map(({ payload }) => this.#payloadMarker(payload)).sort();
    const expectedFormIds = markerKeys.map((key) =>
      key === "internalSession" || key === "internalApiKey"
        ? state.internalFormId
        : state.publicFormId
    );
    if (
      rows.length !== input.submissionIds.length ||
      rows.some(({ id }) => !input.submissionIds.includes(id) || !UUID.test(id)) ||
      rows.some(({ formId }) => !expectedFormIds.includes(formId)) ||
      JSON.stringify(observedMarkers) !== JSON.stringify([...expectedMarkers].sort())
    ) {
      throw new Error("task_547_submission_checkpoint_mismatch");
    }
    for (const id of input.submissionIds) state.attachedSubmissionIds.add(id);
    const adapters = (await import("../../../../core/services/kits/fullSiteInstall/adapters"))
      .FULL_SITE_RESOURCE_ADAPTERS;
    for (const slot of input.resourceSlots) {
      const mutable = state.mutable[slot];
      const snapshot = await adapters[mutable.kind].captureSnapshotById!(mutable.id);
      mutable.expectedCurrent = cloneJson(snapshot);
    }
    return Object.freeze({
      schemaVersion: 1,
      scenarioId: input.scenarioId,
      attachedCount: input.submissionIds.length,
      attachedDigest: digest([...input.submissionIds].sort()),
      resourceDigest: digest(
        input.resourceSlots.map((slot) => ({ slot, expected: state.mutable[slot].expectedCurrent }))
      ),
      statements: Math.max(1, 1 + input.resourceSlots.length),
      rows: rows.length + input.resourceSlots.length,
    });
  }

  async cleanup(): Promise<Task547CleanupOutput> {
    const state = this.#requireState();
    if (state.cleanupOutput !== null) return state.cleanupOutput;
    const { db } = await import("../../../../core/db/client");
    const { apiKeys, formActionRuns, formSubmissions } = await import("../../../../core/db/schema");
    const markers = Object.values(state.markers);
    const markerPredicate = or(
      inArray(sql<string>`${formSubmissions.payload}->>'message'`, markers),
      inArray(sql<string>`${formSubmissions.payload}->>'marker'`, markers)
    );
    const mutation = await db.transaction(async (tx) => {
      const matching = await tx
        .select({
          id: formSubmissions.id,
          formId: formSubmissions.formId,
          payload: formSubmissions.payload,
        })
        .from(formSubmissions)
        .where(
          and(
            inArray(formSubmissions.formId, [state.publicFormId, state.internalFormId]),
            markerPredicate
          )
        )
        .for("update");
      const matchingIds = new Set(matching.map(({ id }) => id));
      if ([...state.attachedSubmissionIds].some((id) => !matchingIds.has(id))) {
        throw new Error("task_547_registered_submission_missing");
      }
      const ids = [...matchingIds].sort();
      const deletedRuns =
        ids.length === 0
          ? []
          : await tx
              .delete(formActionRuns)
              .where(inArray(formActionRuns.submissionId, ids))
              .returning({ id: formActionRuns.id });
      const deletedSubmissions =
        ids.length === 0
          ? []
          : await tx
              .delete(formSubmissions)
              .where(inArray(formSubmissions.id, ids))
              .returning({ id: formSubmissions.id });
      if (deletedSubmissions.length !== ids.length) {
        throw new Error("task_547_submission_cleanup_incomplete");
      }
      await tx.delete(apiKeys).where(eq(apiKeys.id, state.apiKeyId));
      return Object.freeze({ ids, deletedRuns, deletedSubmissions });
    });
    const aggregate = await import("../../../../core/services/forms/formAggregateService");
    await aggregate.mutateFormAggregateAtomic({
      operation: "delete",
      id: state.internalFormId,
      expectedCurrent: state.internalFormSnapshot,
      actorId: state.actorId,
    });
    const remaining = await db
      .select({ id: formSubmissions.id })
      .from(formSubmissions)
      .where(
        and(
          inArray(formSubmissions.formId, [state.publicFormId, state.internalFormId]),
          markerPredicate
        )
      );
    const [remainingKey, remainingInternalForm] = await Promise.all([
      db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.id, state.apiKeyId)),
      aggregate.captureFormAggregateNativeSnapshot(state.internalFormId),
    ]);
    if (remaining.length > 0 || remainingKey.length > 0 || remainingInternalForm !== null) {
      throw new Error("task_547_temp_artifact_cleanup_incomplete");
    }
    const output = Object.freeze({
      schemaVersion: 1,
      deletedSubmissions: mutation.deletedSubmissions.length,
      deletedActionRuns: mutation.deletedRuns.length,
      markerDigest: digest([...markers].sort()),
      idDigest: digest(mutation.ids),
      remainingSubmissionRows: [],
      remainingTempArtifacts: [],
      statements: 8,
      rows: mutation.deletedSubmissions.length + mutation.deletedRuns.length + 2,
    });
    state.cleanupOutput = output;
    return output;
  }

  async reset(): Promise<Task547ResetOutput> {
    const state = this.#requireState();
    if (state.resetOutput !== null) return state.resetOutput;
    const adapters = (await import("../../../../core/services/kits/fullSiteInstall/adapters"))
      .FULL_SITE_RESOURCE_ADAPTERS;
    const restored: string[] = [];
    for (const slot of TASK547_MUTABLE_RESOURCE_SLOTS) {
      const mutable = state.mutable[slot];
      if (!isDeepStrictEqual(mutable.expectedCurrent, mutable.installed)) {
        await adapters[mutable.kind].restoreSnapshotAtomic!({
          id: mutable.id,
          expectedCurrent: mutable.expectedCurrent,
          target: mutable.installed,
          actorId: state.actorId,
        });
        restored.push(slot);
      }
      const current = await adapters[mutable.kind].captureSnapshotById!(mutable.id);
      if (!isDeepStrictEqual(current, mutable.installed)) {
        throw new Error("task_547_reset_verification_failed");
      }
      mutable.expectedCurrent = cloneJson(mutable.installed);
    }
    const output = Object.freeze({
      schemaVersion: 1,
      restoredSlots: restored,
      stateDigest: digest(
        TASK547_MUTABLE_RESOURCE_SLOTS.map((slot) => ({
          slot,
          installed: state.mutable[slot].installed,
        }))
      ),
      statements: 4 + restored.length,
      rows: 4 + restored.length,
    });
    state.resetOutput = output;
    return output;
  }

  async rollback(): Promise<Task547RollbackOutput> {
    const state = this.#requireState();
    if (state.rollbackOutput !== null) return state.rollbackOutput;
    if (state.cleanupOutput === null || state.resetOutput === null) {
      throw new Error("task_547_rollback_order_invalid");
    }
    if (state.officialRollbackCalls !== 0) throw new Error("task_547_rollback_replayed");
    state.officialRollbackCalls += 1;
    const rollbackModule = await import("../../../../core/services/kits/fullSiteInstall/rollback");
    const ledgerModule = await import("../../../../core/services/kits/legacyInstallRunPersistence");
    const failures: unknown[] = [];
    try {
      await rollbackModule.rollbackFullSiteInstall({
        sourceRunId: state.sourceRunId,
        actorId: state.actorId,
        ledger: ledgerModule.defaultLegacyInstallLedger,
      });
    } catch (error) {
      failures.push(error);
      try {
        await this.#emergencyRollback(state);
      } catch (fallbackError) {
        failures.push(fallbackError);
      }
    }
    let priorSettingsRestored = false;
    let resourceAbsenceProved = false;
    try {
      priorSettingsRestored = await this.#settingsEqualPrior(state);
      if (!priorSettingsRestored) failures.push(new Error("task_547_settings_restore_mismatch"));
    } catch (error) {
      failures.push(error);
    }
    try {
      resourceAbsenceProved = await this.#resourceTargetsRestored(state);
      if (!resourceAbsenceProved) failures.push(new Error("task_547_resource_restore_mismatch"));
    } catch (error) {
      failures.push(error);
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, "TASK-547 rollback and verification failed");
    }
    const output = Object.freeze({
      schemaVersion: 1,
      officialRollbackCalls: 1,
      priorSettingsRestored: true,
      resourceAbsenceProved: true,
      rollbackDigest: digest({
        sourceRunId: state.sourceRunId,
        priorSettings: state.priorSettings,
        installedItems: state.installedItems.map(({ kind, key, operation }) => ({
          kind,
          key,
          operation,
        })),
      }),
      statements: Math.max(1, state.installedItems.length + 1),
      rows: state.installedItems.length,
    });
    state.rollbackOutput = output;
    return output;
  }

  async prove(): Promise<Task547ProofOutput> {
    const state = this.#requireState();
    const priorSettingsRestored = await this.#settingsEqualPrior(state);
    const resourceAbsenceProved = await this.#resourceTargetsRestored(state);
    const tempArtifacts = await this.#captureTempArtifacts(state);
    return Object.freeze({
      schemaVersion: 1,
      cleanupDone: state.cleanupOutput !== null,
      resetDone: state.resetOutput !== null,
      rollbackDone: state.rollbackOutput !== null && resourceAbsenceProved,
      officialRollbackCalls: state.officialRollbackCalls,
      remainingSubmissionRows: tempArtifacts.submissions,
      remainingTempArtifacts: tempArtifacts.artifacts,
      priorSettingsRestored,
      statements: Math.max(4, state.installedItems.length + 4),
      rows: tempArtifacts.submissions.length + tempArtifacts.artifacts.length,
    });
  }

  async close(): Promise<void> {
    if (this.#state !== null) {
      await this.cleanup();
      await this.reset();
      await this.rollback();
    }
    const { closeDatabase } = await import("../../../../core/db/client");
    await closeDatabase();
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#state === null ||
      (this.#state.cleanupOutput !== null &&
        this.#state.resetOutput !== null &&
        this.#state.rollbackOutput !== null &&
        this.#state.officialRollbackCalls === 1)
    );
  }

  #requireState(): Task547WorkerState {
    if (this.#state === null) throw new Error("task_547_fixture_not_installed");
    return this.#state;
  }

  async #captureTempArtifacts(state: Task547WorkerState): Promise<{
    readonly submissions: readonly Readonly<{ readonly kind: "submission" }>[];
    readonly artifacts: readonly Readonly<{
      readonly kind: "api-key" | "internal-form";
    }>[];
  }> {
    const { db } = await import("../../../../core/db/client");
    const { apiKeys, formSubmissions } = await import("../../../../core/db/schema");
    const markers = Object.values(state.markers);
    const [submissions, keys, aggregate] = await Promise.all([
      db
        .select({ id: formSubmissions.id })
        .from(formSubmissions)
        .where(
          and(
            inArray(formSubmissions.formId, [state.publicFormId, state.internalFormId]),
            or(
              inArray(sql<string>`${formSubmissions.payload}->>'message'`, markers),
              inArray(sql<string>`${formSubmissions.payload}->>'marker'`, markers)
            )
          )
        ),
      db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.id, state.apiKeyId)),
      import("../../../../core/services/forms/formAggregateService"),
    ]);
    const internal = await aggregate.captureFormAggregateNativeSnapshot(state.internalFormId);
    return Object.freeze({
      submissions: Object.freeze(
        submissions.map(() => Object.freeze({ kind: "submission" as const }))
      ),
      artifacts: Object.freeze([
        ...keys.map(() => Object.freeze({ kind: "api-key" as const })),
        ...(internal === null ? [] : [Object.freeze({ kind: "internal-form" as const })]),
      ]),
    });
  }

  #payloadMarker(payload: unknown): string {
    if (!isPlainObject(payload)) throw new Error("task_547_submission_payload_invalid");
    const marker = payload.message ?? payload.marker;
    if (typeof marker !== "string") throw new Error("task_547_submission_marker_missing");
    return marker;
  }

  async #settingsEqualPrior(state: Task547WorkerState): Promise<boolean> {
    const settings =
      await import("../../../../core/services/settings/fullSiteSettingsAtomicService");
    const current = await settings.captureFullSiteSettingsBatchRaw(
      state.priorSettings.map(({ key }) => key)
    );
    return isDeepStrictEqual(current, state.priorSettings);
  }

  async #resourceTargetsRestored(state: Task547WorkerState): Promise<boolean> {
    const resolverModule =
      await import("../../../../core/services/kits/fullSiteInstall/currentResourceResolver");
    const ledgerModule = await import("../../../../core/services/kits/legacyInstallRunPersistence");
    const resolveCurrent = resolverModule.createFullSiteCurrentResourceResolver(
      "formadom-studio",
      ledgerModule.defaultLegacyInstallLedger
    );
    for (const item of state.installedItems) {
      const current = await resolveCurrent(
        item.kind,
        { key: item.key, desired: cloneJson(item.afterSnapshot.desired) },
        item.afterSnapshot.id
      );
      if (item.operation === "create") {
        if (current !== null) return false;
      } else if (
        item.beforeSnapshot === null ||
        current?.id !== item.beforeSnapshot.id ||
        !isDeepStrictEqual(current.desired, item.beforeSnapshot.desired)
      ) {
        return false;
      }
    }
    return true;
  }

  async #emergencyRollback(state: Task547WorkerState): Promise<void> {
    const [settings, adaptersModule, resolverModule, ledgerModule] = await Promise.all([
      import("../../../../core/services/settings/fullSiteSettingsAtomicService"),
      import("../../../../core/services/kits/fullSiteInstall/adapters"),
      import("../../../../core/services/kits/fullSiteInstall/currentResourceResolver"),
      import("../../../../core/services/kits/legacyInstallRunPersistence"),
    ]);
    const currentSettings = await settings.captureFullSiteSettingsBatchRaw(
      state.priorSettings.map(({ key }) => key)
    );
    if (isDeepStrictEqual(currentSettings, state.installedSettings)) {
      await settings.restoreFullSiteSettingsBatchRawAtomic({
        expectedCurrent: state.installedSettings,
        target: state.priorSettings,
      });
    } else if (!isDeepStrictEqual(currentSettings, state.priorSettings)) {
      throw new Error("site_package_state_changed");
    }
    const resolveCurrent = resolverModule.createFullSiteCurrentResourceResolver(
      "formadom-studio",
      ledgerModule.defaultLegacyInstallLedger
    );
    for (const item of [...state.installedItems].reverse()) {
      const current = await resolveCurrent(
        item.kind,
        { key: item.key, desired: cloneJson(item.afterSnapshot.desired) },
        item.afterSnapshot.id
      );
      const adapter = adaptersModule.FULL_SITE_RESOURCE_ADAPTERS[item.kind];
      const alreadyRestored =
        item.operation === "create"
          ? current === null
          : item.beforeSnapshot !== null &&
            current?.id === item.beforeSnapshot.id &&
            isDeepStrictEqual(current.desired, item.beforeSnapshot.desired);
      if (alreadyRestored) continue;
      if (
        current?.id !== item.afterSnapshot.id ||
        !isDeepStrictEqual(current.desired, item.afterSnapshot.desired)
      ) {
        throw new Error("site_package_state_changed");
      }
      if (item.operation === "create") {
        await adapter.deleteSnapshotAtomic!({
          id: item.afterSnapshot.id,
          expectedCurrent: item.afterSnapshot,
          actorId: state.actorId,
        });
      } else {
        if (item.beforeSnapshot === null) throw new Error("site_package_state_changed");
        await adapter.restoreSnapshotAtomic!({
          id: item.afterSnapshot.id,
          expectedCurrent: item.afterSnapshot,
          target: item.beforeSnapshot,
          actorId: state.actorId,
        });
      }
    }
  }

  async #emergencyInstallCleanup(input: {
    readonly actorId: string;
    readonly sourceRunId: string | null;
    readonly internalSnapshot: FormAggregateNativeSnapshot | null;
    readonly apiKeyId: string | null;
  }): Promise<void> {
    const failures: unknown[] = [];
    if (input.apiKeyId !== null) {
      try {
        const { db } = await import("../../../../core/db/client");
        const { apiKeys } = await import("../../../../core/db/schema");
        await db.delete(apiKeys).where(eq(apiKeys.id, input.apiKeyId));
      } catch (error) {
        failures.push(error);
      }
    }
    if (input.internalSnapshot !== null) {
      try {
        const aggregate = await import("../../../../core/services/forms/formAggregateService");
        await aggregate.mutateFormAggregateAtomic({
          operation: "delete",
          id: input.internalSnapshot.id,
          expectedCurrent: input.internalSnapshot,
          actorId: input.actorId,
        });
      } catch (error) {
        failures.push(error);
      }
    }
    if (input.sourceRunId !== null) {
      try {
        const [rollback, ledger] = await Promise.all([
          import("../../../../core/services/kits/fullSiteInstall/rollback"),
          import("../../../../core/services/kits/legacyInstallRunPersistence"),
        ]);
        await rollback.rollbackFullSiteInstall({
          sourceRunId: input.sourceRunId,
          actorId: input.actorId,
          ledger: ledger.defaultLegacyInstallLedger,
        });
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) throw new AggregateError(failures, "TASK-547 install cleanup failed");
  }
}

const REQUIRED_WORKER_ENVIRONMENT = Object.freeze([
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
] as const);

const OPTIONAL_WORKER_ENVIRONMENT = Object.freeze([
  "AUTH_PASSWORD_PEPPER",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
] as const);

function environmentValue(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 worker environment is incomplete");
  }
  return value;
}

export function projectTask547WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {
    PATH: environmentValue(source, "PATH"),
    DB_POOL_MAX: "1",
  };
  for (const key of REQUIRED_WORKER_ENVIRONMENT) {
    output[key] = environmentValue(source, key);
  }
  for (const key of OPTIONAL_WORKER_ENVIRONMENT) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && !value.includes("\0")) {
      output[key] = value;
    }
  }
  const email =
    source.CODERSO_PLAYWRIGHT_EMAIL ?? source.PLAYWRIGHT_ADMIN_EMAIL ?? source.ADMIN_EMAIL;
  if (typeof email !== "string" || email.length === 0 || email.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 worker identity is incomplete");
  }
  output.CODERSO_PLAYWRIGHT_EMAIL = email;
  return Object.freeze(output);
}

function task547WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: "task-547-db",
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-547/worker-operations.ts",
        "TASK-547 worker entry"
      ),
      cwd: root,
      family: "task547-worker-db",
      requestTimeoutMs: 9 * 60_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask547WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask547WorkerPool(
  context: RuntimeSmokeContext,
  registry: WorkerOperationRegistry,
  source: NodeJS.ProcessEnv = process.env
): Promise<WorkerPool> {
  const pathValue = environmentValue(source, "PATH");
  return WorkerPool.create({
    root: context.root,
    executable: await resolveExecutableOnPath("bun", pathValue),
    supervisor: context.processes,
    registry,
    profiles: task547WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}

export async function installTask547FixtureInBatches(
  workers: WorkerPool,
  descriptor: WorkerOperationDescriptor,
  nonce: string
): Promise<Task547InstallOutput> {
  const output = await workers.dispatch(descriptor, Object.freeze({ nonce }));
  return output as Task547InstallOutput;
}
