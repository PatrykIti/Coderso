// TASK-467 lazy widget editor smoke: scenario contracts and manifest policy.
//
// The suite drives the real admin Widget Library drawer (which mounts section
// widget editors through the TASK-467 WidgetEditorOutlet) against a
// worker-created admin identity, then asserts the lazy editor contract:
// visible Suspense fallback during a delayed chunk fetch, real retry after a
// chunk failure, computed-style and geometry proof in wizard/visual/advanced
// modes, dark mode, a mobile viewport, and a mode round-trip that preserves
// authored data.
import { createHash } from "node:crypto";
import { SmokeError } from "../../contracts";

export const TASK467_EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-467";

export const TASK467_ADMIN_ORIGIN =
  process.env.SMOKE_TASK467_ADMIN_ORIGIN ?? "http://localhost:5173";
export const TASK467_ADMIN_URL = `${TASK467_ADMIN_ORIGIN}/admin`;
export const TASK467_FRONT_ORIGIN = "http://localhost:3000";

export const TASK467_WIDGET_TYPE = "section";
export const TASK467_BLOCK_ID = "task467-section-block";
export const TASK467_BLOCK_CONTROL_ID = "section.style.backgroundColor";

export const TASK467_CHUNK_GLOB = "**/*SectionEditors*";
export const TASK467_FALLBACK_COLOR = "#16a34a";
export const TASK467_FALLBACK_COLOR_RGB = "rgb(22, 163, 74)";
export const TASK467_LOADING_MODE = "wizard";

export const TASK467_SCENARIO_IDS = [
  "wizard-lazy-fallback",
  "visual-computed-style",
  "advanced-mount",
  "dark-mode",
  "cross-device-mobile",
  "lazy-failure-retry",
  "mode-round-trip-preserves-data",
] as const;

export type Task467ScenarioId = (typeof TASK467_SCENARIO_IDS)[number];

export interface Task467ScenarioDescriptor {
  readonly id: Task467ScenarioId;
  readonly title: string;
  readonly variant: {
    readonly surface: "admin" | "public";
    readonly theme: "light" | "dark";
    readonly viewport: Readonly<{ width: number; height: number }>;
  };
}

export const TASK467_SCENARIOS: readonly Task467ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    id: "wizard-lazy-fallback",
    title: "Wizard editor shows a visible lazy fallback, then mounts",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "light" as const,
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  }),
  Object.freeze({
    id: "visual-computed-style",
    title: "Visual color control changes the surface preview computed style",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "light" as const,
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  }),
  Object.freeze({
    id: "advanced-mount",
    title: "Advanced editor mounts with writable controls and visible sections",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "light" as const,
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  }),
  Object.freeze({
    id: "dark-mode",
    title: "Editor shell follows dark mode with sections still visible",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "dark" as const,
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  }),
  Object.freeze({
    id: "cross-device-mobile",
    title: "Visual editor stays usable in a mobile viewport without overflow",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "light" as const,
      viewport: Object.freeze({ width: 390, height: 844 }),
    }),
  }),
  Object.freeze({
    id: "lazy-failure-retry",
    title: "Chunk failure shows the bounded error state and retry mounts the editor",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "light" as const,
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  }),
  Object.freeze({
    id: "mode-round-trip-preserves-data",
    title: "Visual color survives a lazy editor round trip through Advanced",
    variant: Object.freeze({
      surface: "admin" as const,
      theme: "light" as const,
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  }),
]);

export interface Task467BrowserReceipt {
  readonly scenarioId: Task467ScenarioId;
  readonly ok: boolean;
  readonly error?: string;
  // Common editor-surface proof.
  readonly modeRootCount: number;
  readonly modeRootBoxWidth: number;
  readonly modeRootBoxHeight: number;
  readonly sectionCount: number;
  readonly visibleSectionCount: number;
  readonly writableControlCount: number;
  readonly controlCount: number;
  // Wizard fallback proof.
  readonly loadingVisible: boolean;
  readonly loadingBoxWidth: number;
  readonly loadingBoxHeight: number;
  readonly loadingRole: string | null;
  // Retry/error proof.
  readonly errorVisible: boolean;
  readonly retryButtonVisible: boolean;
  readonly retryButtonName: string | null;
  // Visual computed-style proof.
  readonly previewColorBefore: string | null;
  readonly previewColorAfter: string | null;
  readonly colorInputValue: string | null;
  // Dark-mode proof.
  readonly lightModeRootBackground: string | null;
  readonly darkModeRootBackground: string | null;
  readonly darkVisibleSectionCount: number;
  // Mobile proof.
  readonly mobileRootBoxWidth: number;
  readonly mobileRootBoxHeight: number;
  readonly mobileOverflow: boolean;
  readonly mobileVisibleSectionCount: number;
  // Round-trip proof.
  readonly previewColorAfterRoundTrip: string | null;
  readonly consoleErrorDelta: number;
  readonly screenshotBase64: string;
}

export function task467EvidenceSession(session: string): string {
  return session
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "-")
    .replace(/^-+|^_+/u, "")
    .replace(/-+$|_+$/u, "")
    .slice(0, 48);
}

export function projectTask467EvidencePaths(
  session: string,
  scenarioIds: readonly Task467ScenarioId[]
): readonly string[] {
  const safeSession = task467EvidenceSession(session);
  return Object.freeze(
    scenarioIds.map((scenarioId, index) => {
      const name = scenarioId.replace(/_/gu, "-");
      return `${TASK467_EVIDENCE_ROOT}/${safeSession}/task467-${String(index + 1).padStart(2, "0")}-${name}.png`;
    })
  );
}

export function validateTask467ReceiptShape(
  value: unknown,
  scenarioId: Task467ScenarioId
): Task467BrowserReceipt {
  if (value === null || typeof value !== "object") {
    throw new SmokeError("smoke_output_invalid", "TASK-467 browser receipt is absent");
  }
  const record = value as Record<string, unknown>;
  const numberField = (name: string): number => {
    const current = record[name];
    if (typeof current !== "number" || !Number.isFinite(current)) return 0;
    return current;
  };
  const booleanField = (name: string): boolean => record[name] === true;
  const stringField = (name: string): string | null =>
    typeof record[name] === "string" && (record[name] as string).length > 0
      ? (record[name] as string)
      : null;
  const receipt: Task467BrowserReceipt = Object.freeze({
    scenarioId,
    ok: booleanField("ok"),
    error: stringField("error") ?? undefined,
    modeRootCount: numberField("modeRootCount"),
    modeRootBoxWidth: numberField("modeRootBoxWidth"),
    modeRootBoxHeight: numberField("modeRootBoxHeight"),
    sectionCount: numberField("sectionCount"),
    visibleSectionCount: numberField("visibleSectionCount"),
    writableControlCount: numberField("writableControlCount"),
    controlCount: numberField("controlCount"),
    loadingVisible: booleanField("loadingVisible"),
    loadingBoxWidth: numberField("loadingBoxWidth"),
    loadingBoxHeight: numberField("loadingBoxHeight"),
    loadingRole: stringField("loadingRole"),
    errorVisible: booleanField("errorVisible"),
    retryButtonVisible: booleanField("retryButtonVisible"),
    retryButtonName: stringField("retryButtonName"),
    previewColorBefore: stringField("previewColorBefore"),
    previewColorAfter: stringField("previewColorAfter"),
    colorInputValue: stringField("colorInputValue"),
    lightModeRootBackground: stringField("lightModeRootBackground"),
    darkModeRootBackground: stringField("darkModeRootBackground"),
    darkVisibleSectionCount: numberField("darkVisibleSectionCount"),
    mobileRootBoxWidth: numberField("mobileRootBoxWidth"),
    mobileRootBoxHeight: numberField("mobileRootBoxHeight"),
    mobileOverflow: booleanField("mobileOverflow"),
    mobileVisibleSectionCount: numberField("mobileVisibleSectionCount"),
    previewColorAfterRoundTrip: stringField("previewColorAfterRoundTrip"),
    consoleErrorDelta: numberField("consoleErrorDelta"),
    screenshotBase64: stringField("screenshotBase64") ?? "",
  });
  if (receipt.screenshotBase64.length === 0) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 screenshot payload is absent");
  }
  return receipt;
}

export function task467EvidenceDigest(manifest: unknown): string {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}
