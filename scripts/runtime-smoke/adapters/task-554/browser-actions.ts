import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";

export const TASK554_SCENARIO_IDS = Object.freeze([
  "writer-metadata-save-preserves-schedule",
  "writer-status-publish-denied",
  "writer-schedule-denied",
  "publisher-schedule",
  "publisher-publish",
  "publisher-unpublish",
  "publisher-archive",
] as const);

export type Task554ScenarioId = (typeof TASK554_SCENARIO_IDS)[number];
export type Task554ActorKind = "writer" | "publisher";
export type Task554VariantId =
  "light-1440x900" | "dark-1440x900" | "light-390x844" | "dark-390x844";
export type Task554PostStatus = "draft" | "published" | "scheduled" | "archived";

export interface Task554Variant {
  readonly id: Task554VariantId;
  readonly colorScheme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: 1440 | 390; readonly height: 900 | 844 }>;
}

export interface Task554ScenarioDescriptor {
  readonly id: Task554ScenarioId;
  readonly actor: Task554ActorKind;
  readonly baseline: Readonly<{
    readonly status: Task554PostStatus;
    readonly scheduledAt: string | null;
    readonly seoDescription: string;
  }>;
  readonly metadata: PlainJsonObject;
  readonly expectedPatchKeys: readonly string[];
  readonly expectedStatus: Task554PostStatus;
  readonly expectedScheduledAt: string | null;
  readonly expectedResponseStatus: 200 | 403;
  readonly expectedDom: Readonly<{
    readonly status: Task554PostStatus;
    readonly scheduledAt: string | null;
    readonly scheduleDisabled: boolean;
    readonly seoDescription: string;
  }>;
  readonly canonicalVariant: "light-1440x900";
}

export interface Task554FixtureSpec {
  readonly scenarioId: Task554ScenarioId;
  readonly variantId: Task554VariantId;
  readonly baseline: Task554ScenarioDescriptor["baseline"];
}

export interface Task554BrowserFixture {
  readonly scenarioId: Task554ScenarioId;
  readonly variantId: Task554VariantId;
  readonly postId: string;
}

export interface Task554BrowserReceipt {
  readonly scenarioId: string;
  readonly postId: string;
  readonly responseStatus: number;
  readonly requestMethod: string;
  readonly requestKeys: readonly string[];
  readonly postMutationCount: number;
  readonly metadataPatchCount: number;
  readonly unexpectedPostMutationCount: number;
  readonly requestValuesValid: boolean;
  readonly statusControlMatches: boolean;
  readonly statusBadgeMatches: boolean;
  readonly scheduleValueMatches: boolean;
  readonly scheduleDisabledMatches: boolean;
  readonly seoValueMatches: boolean;
  readonly cacheEventKinds: readonly string[];
  readonly unexpectedPostCacheEventCount: number;
  readonly panelVisible: boolean;
  readonly saveButtonWidth: number;
  readonly saveButtonHeight: number;
  readonly colorScheme: string;
  readonly permissionDenied: boolean;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

export const TASK554_VARIANTS = Object.freeze([
  Object.freeze({
    id: "light-1440x900",
    colorScheme: "light",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "dark-1440x900",
    colorScheme: "dark",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "light-390x844",
    colorScheme: "light",
    viewport: Object.freeze({ width: 390, height: 844 }),
  }),
  Object.freeze({
    id: "dark-390x844",
    colorScheme: "dark",
    viewport: Object.freeze({ width: 390, height: 844 }),
  }),
] as const satisfies readonly Task554Variant[]);

const SCHEDULE = "2035-01-02T03:04:05.000Z";
const NEXT_SCHEDULE = "2036-02-03T04:05:06.000Z";

export const TASK554_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "writer-metadata-save-preserves-schedule",
    actor: "writer",
    baseline: Object.freeze({
      status: "scheduled",
      scheduledAt: SCHEDULE,
      seoDescription: "scheduled baseline",
    }),
    metadata: Object.freeze({ seo: Object.freeze({ description: "TASK-554 writer SEO receipt" }) }),
    expectedPatchKeys: Object.freeze(["seo"]),
    expectedStatus: "scheduled",
    expectedScheduledAt: SCHEDULE,
    expectedResponseStatus: 200,
    expectedDom: Object.freeze({
      status: "scheduled",
      scheduledAt: SCHEDULE,
      scheduleDisabled: false,
      seoDescription: "TASK-554 writer SEO receipt",
    }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "writer-status-publish-denied",
    actor: "writer",
    baseline: Object.freeze({
      status: "draft",
      scheduledAt: null,
      seoDescription: "writer publish baseline",
    }),
    metadata: Object.freeze({ status: "published", scheduledAt: null }),
    expectedPatchKeys: Object.freeze(["scheduledAt", "status"]),
    expectedStatus: "draft",
    expectedScheduledAt: null,
    expectedResponseStatus: 403,
    expectedDom: Object.freeze({
      status: "published",
      scheduledAt: null,
      scheduleDisabled: true,
      seoDescription: "writer publish baseline",
    }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "writer-schedule-denied",
    actor: "writer",
    baseline: Object.freeze({
      status: "draft",
      scheduledAt: null,
      seoDescription: "writer schedule baseline",
    }),
    metadata: Object.freeze({ status: "scheduled", scheduledAt: NEXT_SCHEDULE }),
    expectedPatchKeys: Object.freeze(["scheduledAt", "status"]),
    expectedStatus: "draft",
    expectedScheduledAt: null,
    expectedResponseStatus: 403,
    expectedDom: Object.freeze({
      status: "scheduled",
      scheduledAt: NEXT_SCHEDULE,
      scheduleDisabled: false,
      seoDescription: "writer schedule baseline",
    }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "publisher-schedule",
    actor: "publisher",
    baseline: Object.freeze({
      status: "draft",
      scheduledAt: null,
      seoDescription: "publisher schedule baseline",
    }),
    metadata: Object.freeze({ status: "scheduled", scheduledAt: NEXT_SCHEDULE }),
    expectedPatchKeys: Object.freeze(["scheduledAt", "status"]),
    expectedStatus: "scheduled",
    expectedScheduledAt: NEXT_SCHEDULE,
    expectedResponseStatus: 200,
    expectedDom: Object.freeze({
      status: "scheduled",
      scheduledAt: NEXT_SCHEDULE,
      scheduleDisabled: false,
      seoDescription: "publisher schedule baseline",
    }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "publisher-publish",
    actor: "publisher",
    baseline: Object.freeze({
      status: "draft",
      scheduledAt: null,
      seoDescription: "publisher publish baseline",
    }),
    metadata: Object.freeze({ status: "published", scheduledAt: null }),
    expectedPatchKeys: Object.freeze(["scheduledAt", "status"]),
    expectedStatus: "published",
    expectedScheduledAt: null,
    expectedResponseStatus: 200,
    expectedDom: Object.freeze({
      status: "published",
      scheduledAt: null,
      scheduleDisabled: true,
      seoDescription: "publisher publish baseline",
    }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "publisher-unpublish",
    actor: "publisher",
    baseline: Object.freeze({
      status: "published",
      scheduledAt: null,
      seoDescription: "publisher unpublish baseline",
    }),
    metadata: Object.freeze({ status: "draft", scheduledAt: null }),
    expectedPatchKeys: Object.freeze(["scheduledAt", "status"]),
    expectedStatus: "draft",
    expectedScheduledAt: null,
    expectedResponseStatus: 200,
    expectedDom: Object.freeze({
      status: "draft",
      scheduledAt: null,
      scheduleDisabled: true,
      seoDescription: "publisher unpublish baseline",
    }),
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "publisher-archive",
    actor: "publisher",
    baseline: Object.freeze({
      status: "draft",
      scheduledAt: null,
      seoDescription: "publisher archive baseline",
    }),
    metadata: Object.freeze({ status: "archived", scheduledAt: null }),
    expectedPatchKeys: Object.freeze(["scheduledAt", "status"]),
    expectedStatus: "archived",
    expectedScheduledAt: null,
    expectedResponseStatus: 200,
    expectedDom: Object.freeze({
      status: "archived",
      scheduledAt: null,
      scheduleDisabled: true,
      seoDescription: "publisher archive baseline",
    }),
    canonicalVariant: "light-1440x900",
  }),
] as const satisfies readonly Task554ScenarioDescriptor[]);

const byScenario = new Map(TASK554_SCENARIOS.map((descriptor) => [descriptor.id, descriptor]));

export function task554ScenarioDescriptor(id: string): Task554ScenarioDescriptor {
  const descriptor = byScenario.get(id as Task554ScenarioId);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 scenario is not registered");
  }
  return descriptor;
}

export function task554VariantsFor(
  profile: "fast" | "certification",
  scenarioId: Task554ScenarioId
): readonly Task554Variant[] {
  if (profile === "certification") return TASK554_VARIANTS;
  if (profile !== "fast") {
    throw new SmokeError("smoke_argument_invalid", "TASK-554 profile is unsupported");
  }
  const ordinal = TASK554_SCENARIO_IDS.indexOf(scenarioId);
  if (ordinal < 0)
    throw new SmokeError("smoke_output_invalid", "TASK-554 scenario is not registered");
  return Object.freeze([TASK554_VARIANTS[ordinal % TASK554_VARIANTS.length]!]);
}

export function buildTask554FixtureSpecs(
  profile: "fast" | "certification"
): readonly Task554FixtureSpec[] {
  return Object.freeze(
    TASK554_SCENARIOS.flatMap((descriptor) =>
      task554VariantsFor(profile, descriptor.id).map((variant) =>
        Object.freeze({
          scenarioId: descriptor.id,
          variantId: variant.id,
          baseline: descriptor.baseline,
        })
      )
    )
  );
}

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

export function materializeTask554BrowserAction(input: {
  readonly descriptor: Task554ScenarioDescriptor;
  readonly fixture: Task554BrowserFixture;
  readonly variant: Task554Variant;
  readonly screenshotPath: string | null;
}): string {
  if (
    input.fixture.scenarioId !== input.descriptor.id ||
    input.fixture.variantId !== input.variant.id ||
    !/^[0-9a-f-]{36}$/iu.test(input.fixture.postId) ||
    (input.screenshotPath !== null &&
      (!input.screenshotPath.endsWith(".png") || input.screenshotPath.includes("..")))
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 browser action materialization drifted");
  }
  const config = encoded({
    scenarioId: input.descriptor.id,
    postId: input.fixture.postId,
    variant: input.variant,
    metadata: input.descriptor.metadata,
    expectedPatchKeys: [...input.descriptor.expectedPatchKeys].sort(),
    expectedDom: input.descriptor.expectedDom,
    expectedResponseStatus: input.descriptor.expectedResponseStatus,
    screenshotPath: input.screenshotPath,
  });
  return `async (page) => {
    const cfg = ${config};
    const consoleErrors = [];
    const pageErrors = [];
    let postMutationCount = 0;
    let metadataPatchCount = 0;
    let unexpectedPostMutationCount = 0;
    let requestKeys = [];
    let requestValuesValid = false;
    const cacheEventKinds = [];
    let unexpectedPostCacheEventCount = 0;
    const metadataPath = "/admin/api/posts/" + cfg.postId + "/metadata";
    const count = (value) => Math.min(value + 1, 2);
    const expectedCacheEventKinds =
      cfg.expectedResponseStatus === 200 ? ["posts:list:update", "posts:detail:update"] : [];
    let cacheWitnessTimer = null;
    let resolveCacheWitness = null;
    let rejectCacheWitness = null;
    let cacheWitness = null;
    let cacheChannel = null;
    const armCacheWitness = () => {
      if (expectedCacheEventKinds.length === 0) return;
      cacheWitness = new Promise((resolve, reject) => {
        resolveCacheWitness = resolve;
        rejectCacheWitness = reject;
        cacheWitnessTimer = setTimeout(
          () => reject(new Error("task554_post_cache_timeout")),
          15000
        );
      });
      void cacheWitness.catch(() => undefined);
    };
    const sameKeys = (value, expected) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const actual = Object.keys(value).sort();
      return JSON.stringify(actual) === JSON.stringify(expected);
    };
    const valuesMatch = (body) => {
      if (!sameKeys(body, cfg.expectedPatchKeys)) return false;
      if (Object.hasOwn(cfg.metadata, "seo")) {
        return (
          body.seo !== null &&
          typeof body.seo === "object" &&
          !Array.isArray(body.seo) &&
          Object.keys(body.seo).length === 1 &&
          Object.keys(body.seo)[0] === "description" &&
          body.seo.description === cfg.metadata.seo.description
        );
      }
      return body.status === cfg.metadata.status && body.scheduledAt === cfg.metadata.scheduledAt;
    };
    const onConsole = (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 512)); };
    const onPageError = (error) => pageErrors.push(String(error?.message ?? "pageerror").slice(0, 512));
    const onCacheMessage = (event) => {
      const value = event.data;
      if (value === null || typeof value !== "object") return;
      const key = value.key;
      const action = value.action;
      if (typeof key !== "string" || !key.startsWith("posts:")) return;
      const kind =
        action === "update" && key === "posts:list"
          ? "posts:list:update"
          : action === "update" && key === "posts:detail:" + cfg.postId
            ? "posts:detail:update"
            : null;
      if (kind === null) {
        unexpectedPostCacheEventCount = count(unexpectedPostCacheEventCount);
        rejectCacheWitness?.(new Error("task554_post_cache_unexpected"));
        return;
      }
      if (cacheEventKinds.length < 3) cacheEventKinds.push(kind);
      if (JSON.stringify(cacheEventKinds) === JSON.stringify(expectedCacheEventKinds)) {
        clearTimeout(cacheWitnessTimer);
        resolveCacheWitness?.();
      } else if (cacheEventKinds.length >= expectedCacheEventKinds.length) {
        rejectCacheWitness?.(new Error("task554_post_cache_order"));
      }
    };
    const onRequest = (request) => {
      let pathname: string | null = null;
      try {
        pathname = new URL(request.url()).pathname;
      } catch {
        return; // non-parseable URLs (about:, blob:, data:, malformed) are not Post API calls
      }
      const method = request.method();
      const postMutation =
        !["GET", "HEAD", "OPTIONS"].includes(method) &&
        (pathname === "/admin/api/posts" || pathname.startsWith("/admin/api/posts/"));
      if (!postMutation) return;
      postMutationCount = count(postMutationCount);
      if (method !== "PATCH" || pathname !== metadataPath) {
        unexpectedPostMutationCount = count(unexpectedPostMutationCount);
        return;
      }
      metadataPatchCount = count(metadataPatchCount);
      try {
        const body = request.postDataJSON();
        requestKeys =
          body !== null && typeof body === "object" && !Array.isArray(body)
            ? Object.keys(body).sort()
            : [];
        requestValuesValid = valuesMatch(body);
      } catch {
        requestValuesValid = false;
      }
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("request", onRequest);
    try {
      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      await page.goto("http://127.0.0.1:5173/admin/posts/" + cfg.postId + "?editor=classic", { waitUntil: "domcontentloaded", timeout: 30000 });
      if (cfg.variant.viewport.width === 390) {
        const details = page.getByRole("button", { name: "Details", exact: true });
        await details.waitFor({ state: "visible", timeout: 15000 });
        if (await details.count() !== 1) throw new Error("task554_details_control");
        await details.click();
      }
      const panel = page.locator('[data-entry-metadata-panel="true"]:visible');
      await panel.waitFor({ state: "visible", timeout: 30000 });
      if (await panel.count() !== 1) throw new Error("task554_visible_metadata_panel");
      const save = panel.getByRole("button", { name: "Save metadata", exact: true });
      await save.waitFor({ state: "visible", timeout: 15000 });
      if (Object.hasOwn(cfg.metadata, "status")) {
        const statusLabel = {
          archived: "Archived",
          draft: "Draft",
          published: "Published",
          scheduled: "Scheduled",
        }[String(cfg.metadata.status)];
        if (statusLabel === undefined) throw new Error("task554_status_label");
        const statusField = panel.getByText("Status", { exact: true }).locator("..");
        const statusTrigger = statusField.getByRole("combobox");
        if (await statusTrigger.count() !== 1) throw new Error("task554_status_control");
        await statusTrigger.click();
        await page.getByRole("option", { name: statusLabel, exact: true }).click();
      }
      if (Object.hasOwn(cfg.metadata, "scheduledAt")) {
        const scheduleField = panel.getByText("Schedule date", { exact: true }).locator("..");
        const schedule = scheduleField.getByRole("textbox");
        if (await schedule.count() !== 1) throw new Error("task554_schedule_control");
        if (cfg.metadata.status === "scheduled") {
          await schedule.waitFor({ state: "visible", timeout: 15000 });
          if (await schedule.isDisabled()) throw new Error("task554_schedule_disabled");
          await schedule.fill(String(cfg.metadata.scheduledAt));
        } else if (!(await schedule.isDisabled())) {
          throw new Error("task554_schedule_enabled");
        }
      }
      if (Object.hasOwn(cfg.metadata, "seo")) {
        const seoField = panel.getByText("Meta description", { exact: true }).locator("..");
        const seo = seoField.getByRole("textbox");
        if (await seo.count() !== 1) throw new Error("task554_seo_control");
        await seo.fill(String(cfg.metadata.seo.description));
      }
      cacheChannel = new BroadcastChannel("coderso.admin.cache");
      cacheChannel.addEventListener("message", onCacheMessage);
      armCacheWitness();
      const responsePromise = page.waitForResponse((response) => {
        const request = response.request();
        let responsePathname: string | null = null;
        try {
          responsePathname = new URL(response.url()).pathname;
        } catch {
          return false;
        }
        return request.method() === "PATCH" && responsePathname === metadataPath;
      }, { timeout: 15000 });
      await save.click();
      const response = await responsePromise;
      const request = response.request();
      if (
        postMutationCount !== 1 ||
        metadataPatchCount !== 1 ||
        unexpectedPostMutationCount !== 0 ||
        !requestValuesValid ||
        JSON.stringify(requestKeys) !== JSON.stringify(cfg.expectedPatchKeys)
      ) throw new Error("task554_metadata_mutation_witness");
      await page.waitForFunction(
        (expected) => {
          const visible = Array.from(document.querySelectorAll('[data-entry-metadata-panel="true"]')).filter(
            (node) => {
              const style = getComputedStyle(node);
              return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
            }
          );
          if (visible.length !== 1) return false;
          const panel = visible[0];
          const statusLabel = { archived: "Archived", draft: "Draft", published: "Published", scheduled: "Scheduled" }[expected.status];
          const labels = Array.from(panel.querySelectorAll("label"));
          const statusHost = labels.find((label) => label.textContent?.trim() === "Status")?.parentElement;
          const scheduleHost = labels.find((label) => label.textContent?.trim() === "Schedule date")?.parentElement;
          const seoHost = labels.find((label) => label.textContent?.trim() === "Meta description")?.parentElement;
          const status = statusHost?.querySelector('[role="combobox"]');
          const schedule = scheduleHost?.querySelector("input");
          const seo = seoHost?.querySelector("textarea");
          const badgeCount = Array.from(panel.querySelectorAll('[data-slot="badge"]')).filter(
            (badge) => badge.textContent?.trim() === statusLabel
          ).length;
          return (
            status?.textContent?.trim() === statusLabel &&
            badgeCount === 1 &&
            schedule?.value === (expected.scheduledAt ?? "") &&
            schedule.disabled === expected.scheduleDisabled &&
            seo?.value === expected.seoDescription
          );
        },
        cfg.expectedDom,
        { timeout: 15000 }
      );
      if (cfg.expectedResponseStatus === 403) {
        await page.waitForFunction(
          () => /permission|forbidden|not authorized/i.test(document.body.innerText),
          undefined,
          { timeout: 15000 }
        );
      }
      const visibleProof = await panel.evaluate((node, expected) => {
        const statusLabel = { archived: "Archived", draft: "Draft", published: "Published", scheduled: "Scheduled" }[expected.status];
        const labels = Array.from(node.querySelectorAll("label"));
        const statusHost = labels.find((label) => label.textContent?.trim() === "Status")?.parentElement;
        const scheduleHost = labels.find((label) => label.textContent?.trim() === "Schedule date")?.parentElement;
        const seoHost = labels.find((label) => label.textContent?.trim() === "Meta description")?.parentElement;
        const status = statusHost?.querySelector('[role="combobox"]');
        const schedule = scheduleHost?.querySelector("input");
        const seo = seoHost?.querySelector("textarea");
        const badgeCount = Array.from(node.querySelectorAll('[data-slot="badge"]')).filter(
          (badge) => badge.textContent?.trim() === statusLabel
        ).length;
        return {
          statusControlMatches: status?.textContent?.trim() === statusLabel,
          statusBadgeMatches: badgeCount === 1,
          scheduleValueMatches: schedule?.value === (expected.scheduledAt ?? ""),
          scheduleDisabledMatches: schedule?.disabled === expected.scheduleDisabled,
          seoValueMatches: seo?.value === expected.seoDescription,
        };
      }, cfg.expectedDom);
      await cacheWitness;
      if (
        JSON.stringify(cacheEventKinds) !== JSON.stringify(expectedCacheEventKinds) ||
        unexpectedPostCacheEventCount !== 0
      ) throw new Error("task554_post_cache_witness");
      const box = await save.boundingBox();
      const bodyText = (await page.locator("body").innerText()).slice(0, 32768);
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      return {
        scenarioId: cfg.scenarioId,
        postId: cfg.postId,
        responseStatus: response.status(),
        requestMethod: request.method(),
        requestKeys,
        postMutationCount,
        metadataPatchCount,
        unexpectedPostMutationCount,
        requestValuesValid,
        ...visibleProof,
        cacheEventKinds,
        unexpectedPostCacheEventCount,
        panelVisible: await panel.isVisible(),
        saveButtonWidth: Math.round(box?.width ?? 0),
        saveButtonHeight: Math.round(box?.height ?? 0),
        colorScheme: await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
        permissionDenied: /permission|forbidden|not authorized/i.test(bodyText),
        consoleErrors,
        pageErrors,
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("request", onRequest);
      cacheChannel?.removeEventListener("message", onCacheMessage);
      cacheChannel?.close();
      if (cacheWitnessTimer !== null) clearTimeout(cacheWitnessTimer);
    }
  }`;
}

export function assertTask554BrowserReceipt(
  value: unknown,
  descriptor: Task554ScenarioDescriptor,
  fixture: Task554BrowserFixture,
  variant: Task554Variant
): asserts value is Task554BrowserReceipt {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      "cacheEventKinds,colorScheme,consoleErrors,metadataPatchCount,pageErrors,panelVisible,permissionDenied,postId,postMutationCount,requestKeys,requestMethod,requestValuesValid,responseStatus,saveButtonHeight,saveButtonWidth,scenarioId,scheduleDisabledMatches,scheduleValueMatches,seoValueMatches,statusBadgeMatches,statusControlMatches,unexpectedPostCacheEventCount,unexpectedPostMutationCount" ||
    (value as Task554BrowserReceipt).scenarioId !== descriptor.id ||
    (value as Task554BrowserReceipt).postId !== fixture.postId ||
    (value as Task554BrowserReceipt).responseStatus !== descriptor.expectedResponseStatus ||
    (value as Task554BrowserReceipt).requestMethod !== "PATCH" ||
    JSON.stringify((value as Task554BrowserReceipt).requestKeys) !==
      JSON.stringify([...descriptor.expectedPatchKeys].sort()) ||
    (value as Task554BrowserReceipt).postMutationCount !== 1 ||
    (value as Task554BrowserReceipt).metadataPatchCount !== 1 ||
    (value as Task554BrowserReceipt).unexpectedPostMutationCount !== 0 ||
    (value as Task554BrowserReceipt).requestValuesValid !== true ||
    (value as Task554BrowserReceipt).statusControlMatches !== true ||
    (value as Task554BrowserReceipt).statusBadgeMatches !== true ||
    (value as Task554BrowserReceipt).scheduleValueMatches !== true ||
    (value as Task554BrowserReceipt).scheduleDisabledMatches !== true ||
    (value as Task554BrowserReceipt).seoValueMatches !== true ||
    !Array.isArray((value as Task554BrowserReceipt).cacheEventKinds) ||
    JSON.stringify((value as Task554BrowserReceipt).cacheEventKinds) !==
      JSON.stringify(
        descriptor.expectedResponseStatus === 200
          ? ["posts:list:update", "posts:detail:update"]
          : []
      ) ||
    (value as Task554BrowserReceipt).unexpectedPostCacheEventCount !== 0 ||
    (value as Task554BrowserReceipt).panelVisible !== true ||
    (value as Task554BrowserReceipt).saveButtonWidth <= 0 ||
    (value as Task554BrowserReceipt).saveButtonHeight <= 0 ||
    (value as Task554BrowserReceipt).colorScheme !== variant.colorScheme ||
    (value as Task554BrowserReceipt).permissionDenied !==
      (descriptor.expectedResponseStatus === 403) ||
    !Array.isArray((value as Task554BrowserReceipt).consoleErrors) ||
    !Array.isArray((value as Task554BrowserReceipt).pageErrors) ||
    (value as Task554BrowserReceipt).consoleErrors.length !== 0 ||
    (value as Task554BrowserReceipt).pageErrors.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 browser receipt is invalid");
  }
}
