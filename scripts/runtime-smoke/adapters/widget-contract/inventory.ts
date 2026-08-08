import { readFile } from "node:fs/promises";
import { assertExactKeys, isPlainObject, SmokeError } from "../../contracts";
import type {
  CssCheck,
  EditorMode,
  ParsedArgs,
  SmokeInventory,
  WidgetSmokeCase,
} from "./contracts";
import { isRecord } from "./contracts";

export const defaultInventoryPath = "_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json";
export const defaultOutputJsonPath = "_docs/PLAYWRIGHT/widget-contract-smoke-results.json";
export const defaultOutputMarkdownPath = "_docs/PLAYWRIGHT/widget-contract-smoke-results.md";
const defaultModes: EditorMode[] = ["visual", "advanced"];
const screenOnlyWidgets = new Set([
  "screen-record-header",
  "screen-field-value",
  "screen-field-group",
  "screen-two-column",
]);

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing_value:${flag}`);
  }
  return value;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    session: "widget-contract-smoke",
    adminUrl: "http://localhost:5173/admin",
    frontUrl: "http://localhost:3000",
    inventoryPath: defaultInventoryPath,
    outputJsonPath: defaultOutputJsonPath,
    outputMarkdownPath: defaultOutputMarkdownPath,
    dryRun: false,
    skipAdmin: false,
    skipFront: false,
    strict: false,
    keepOpen: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session") parsed.session = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--session=")) parsed.session = arg.slice("--session=".length);
    else if (arg === "--admin") parsed.adminUrl = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--admin=")) parsed.adminUrl = arg.slice("--admin=".length);
    else if (arg === "--front") parsed.frontUrl = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--front=")) parsed.frontUrl = arg.slice("--front=".length);
    else if (arg === "--inventory") parsed.inventoryPath = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--inventory=")) {
      parsed.inventoryPath = arg.slice("--inventory=".length);
    } else if (arg === "--output-json") parsed.outputJsonPath = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--output-json=")) {
      parsed.outputJsonPath = arg.slice("--output-json=".length);
    } else if (arg === "--output-md") {
      parsed.outputMarkdownPath = readFlagValue(argv, index++, arg);
    } else if (arg.startsWith("--output-md=")) {
      parsed.outputMarkdownPath = arg.slice("--output-md=".length);
    } else if (arg === "--widget") parsed.widgetType = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--widget=")) parsed.widgetType = arg.slice("--widget=".length);
    else if (arg === "--limit") parsed.limit = Number(readFlagValue(argv, index++, arg));
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--skip-admin") parsed.skipAdmin = true;
    else if (arg === "--skip-front") parsed.skipFront = true;
    else if (arg === "--strict") parsed.strict = true;
    else if (arg === "--keep-open") parsed.keepOpen = true;
    else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (parsed.limit !== undefined && (!Number.isInteger(parsed.limit) || parsed.limit <= 0)) {
    throw new Error("invalid_limit");
  }

  return parsed;
}
function isEditorMode(value: unknown): value is EditorMode {
  return value === "wizard" || value === "visual" || value === "advanced";
}

export async function readInventory(path: string): Promise<SmokeInventory> {
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!isRecord(value)) throw new Error("inventory_invalid");
  const widgets = Array.isArray(value.widgets) ? value.widgets : [];
  const excluded = Array.isArray(value.excludedScreenOnlyWidgets)
    ? value.excludedScreenOnlyWidgets.filter((item): item is string => typeof item === "string")
    : [];

  return {
    version: 1,
    expectedWidgetCount:
      typeof value.expectedWidgetCount === "number" ? value.expectedWidgetCount : widgets.length,
    excludedScreenOnlyWidgets: excluded,
    widgets: widgets.map((item) => {
      if (!isRecord(item)) throw new Error("inventory_widget_invalid");
      const requiredModes = Array.isArray(item.requiredModes)
        ? item.requiredModes.filter(isEditorMode)
        : defaultModes;
      return {
        widgetType: String(item.widgetType ?? "").trim(),
        title: String(item.title ?? item.widgetType ?? "").trim(),
        adminInsertLabel: String(
          item.adminInsertLabel ?? item.title ?? item.widgetType ?? ""
        ).trim(),
        adminFixtureSlug: String(item.adminFixtureSlug ?? "").trim(),
        publicPath:
          typeof item.publicPath === "string"
            ? item.publicPath.trim()
            : item.publicPath === null
              ? null
              : undefined,
        publicFixtureStatus: item.publicFixtureStatus as WidgetSmokeCase["publicFixtureStatus"],
        requiredModes: requiredModes.length > 0 ? requiredModes : defaultModes,
        cssChecks: Array.isArray(item.cssChecks)
          ? item.cssChecks.filter(
              (entry): entry is CssCheck =>
                entry === "body-overflow" || entry === "card-overflow" || entry === "empty-fixture"
            )
          : undefined,
        priority: item.priority as WidgetSmokeCase["priority"],
        notes: typeof item.notes === "string" ? item.notes : undefined,
        allowedDuplicateWritablePaths: Array.isArray(item.allowedDuplicateWritablePaths)
          ? item.allowedDuplicateWritablePaths
              .filter((entry): entry is Record<string, unknown> => isRecord(entry))
              .map((entry) => ({
                path: String(entry.path ?? "").trim(),
                reason: String(entry.reason ?? "").trim(),
                expiresWithTask: String(entry.expiresWithTask ?? "").trim(),
              }))
              .filter((entry) => entry.path && entry.reason && entry.expiresWithTask)
          : undefined,
      };
    }),
  };
}

export function validateInventory(inventory: SmokeInventory) {
  const seen = new Set<string>();
  for (const widget of inventory.widgets) {
    if (!widget.widgetType) throw new Error("inventory_widget_type_missing");
    if (seen.has(widget.widgetType))
      throw new Error(`inventory_widget_duplicate:${widget.widgetType}`);
    if (screenOnlyWidgets.has(widget.widgetType)) {
      throw new Error(`inventory_screen_only_included:${widget.widgetType}`);
    }
    if (!widget.adminFixtureSlug) {
      throw new Error(`inventory_admin_fixture_slug_missing:${widget.widgetType}`);
    }
    seen.add(widget.widgetType);
  }
  if (inventory.widgets.length !== inventory.expectedWidgetCount) {
    throw new Error(
      `inventory_widget_count_mismatch:${inventory.widgets.length}:${inventory.expectedWidgetCount}`
    );
  }
}

export function selectCases(inventory: SmokeInventory, args: ParsedArgs): WidgetSmokeCase[] {
  let cases = inventory.widgets;
  if (args.widgetType) {
    cases = cases.filter((item) => item.widgetType === args.widgetType);
    if (cases.length === 0) throw new Error(`widget_not_found:${args.widgetType}`);
  }
  if (args.limit !== undefined) {
    cases = cases.slice(0, args.limit);
  }
  return cases;
}
const GALLERY_WIDGET_TYPE = "gallery-mosaic";
const GALLERY_PUBLIC_PATH = "/gallery-mosaic-test-0516";

export interface WidgetContractInventoryOverlay {
  readonly version: 1;
  readonly expectedWidgetCount: 1;
  readonly excludedScreenOnlyWidgets: readonly string[];
  readonly widgets: readonly [
    {
      readonly widgetType: "gallery-mosaic";
      readonly title: string;
      readonly adminInsertLabel: string;
      readonly adminFixtureSlug: string;
      readonly publicPath: string;
      readonly publicFixtureStatus?: "published" | "draft-only" | "missing" | "shared-page";
      readonly requiredModes: readonly EditorMode[];
      readonly cssChecks?: readonly CssCheck[];
      readonly priority: "P0";
      readonly notes?: string;
      readonly allowedDuplicateWritablePaths?: readonly {
        readonly path: string;
        readonly reason: string;
        readonly expiresWithTask: string;
      }[];
    },
  ];
}

function invalid(message: string, cause?: unknown): never {
  throw new SmokeError(
    "smoke_output_invalid",
    message,
    cause === undefined ? undefined : { cause }
  );
}

function boundedString(value: unknown, label: string, maximum = 512): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.includes("\0")
  ) {
    return invalid(`${label} is invalid`);
  }
  return value;
}

function stringArray(
  value: unknown,
  label: string,
  allowed?: ReadonlySet<string>,
  maximum = 32
): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) invalid(`${label} is invalid`);
  const output = value.map((item) => boundedString(item, label, 128));
  if (
    new Set(output).size !== output.length ||
    (allowed !== undefined && output.some((item) => !allowed.has(item)))
  ) {
    invalid(`${label} is invalid`);
  }
  return Object.freeze(output);
}

function optionalString(value: unknown, label: string, maximum = 512): string | undefined {
  return value === undefined ? undefined : boundedString(value, label, maximum);
}

function optionalDuplicatePaths(
  value: unknown
): WidgetContractInventoryOverlay["widgets"][0]["allowedDuplicateWritablePaths"] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 32)
    invalid("widget duplicate-path allowlist is invalid");
  return Object.freeze(
    value.map((entry) => {
      if (!isPlainObject(entry)) invalid("widget duplicate-path entry is invalid");
      assertExactKeys(entry, ["path", "reason", "expiresWithTask"], "widget duplicate-path entry");
      return Object.freeze({
        path: boundedString(entry.path, "widget duplicate path", 256),
        reason: boundedString(entry.reason, "widget duplicate reason", 512),
        expiresWithTask: boundedString(entry.expiresWithTask, "widget duplicate expiry", 128),
      });
    })
  );
}

export function buildWidgetContractInventoryOverlay(
  canonicalInventory: unknown
): WidgetContractInventoryOverlay {
  if (!isPlainObject(canonicalInventory)) invalid("widget inventory is invalid");
  if (canonicalInventory.version !== 1 || !Array.isArray(canonicalInventory.widgets)) {
    invalid("widget inventory version or widgets are invalid");
  }
  if (canonicalInventory.widgets.length === 0 || canonicalInventory.widgets.length > 256) {
    invalid("widget inventory cardinality is invalid");
  }
  const galleryCandidates = canonicalInventory.widgets.filter(
    (entry) => isPlainObject(entry) && entry.widgetType === GALLERY_WIDGET_TYPE
  );
  if (galleryCandidates.length !== 1 || !isPlainObject(galleryCandidates[0])) {
    invalid("gallery-mosaic inventory entry is absent or duplicated");
  }
  const gallery = galleryCandidates[0];
  const modeValues = new Set<string>(["wizard", "visual", "advanced"]);
  const checkValues = new Set<string>(["body-overflow", "card-overflow", "empty-fixture"]);
  const requiredModes = stringArray(
    gallery.requiredModes,
    "gallery required modes",
    modeValues
  ).map((mode) => mode as EditorMode);
  if (!requiredModes.includes("visual") || !requiredModes.includes("advanced")) {
    invalid("gallery required modes drifted");
  }
  const publicPath = boundedString(gallery.publicPath, "gallery public path", 256);
  if (publicPath !== GALLERY_PUBLIC_PATH) invalid("gallery public path drifted");
  const publicFixtureStatus = gallery.publicFixtureStatus;
  if (
    publicFixtureStatus !== undefined &&
    !new Set(["published", "draft-only", "missing", "shared-page"]).has(
      publicFixtureStatus as string
    )
  ) {
    invalid("gallery public fixture status is invalid");
  }
  const cssChecks =
    gallery.cssChecks === undefined
      ? undefined
      : stringArray(gallery.cssChecks, "gallery CSS checks", checkValues).map(
          (check) => check as CssCheck
        );
  const excluded = stringArray(
    canonicalInventory.excludedScreenOnlyWidgets ?? [],
    "excluded screen-only widgets",
    undefined,
    64
  );
  const widget = Object.freeze({
    widgetType: GALLERY_WIDGET_TYPE,
    title: boundedString(gallery.title, "gallery title"),
    adminInsertLabel: boundedString(gallery.adminInsertLabel, "gallery insert label"),
    adminFixtureSlug: boundedString(gallery.adminFixtureSlug, "gallery fixture slug", 256),
    publicPath,
    ...(publicFixtureStatus === undefined ? {} : { publicFixtureStatus }),
    requiredModes: Object.freeze(requiredModes),
    ...(cssChecks === undefined ? {} : { cssChecks: Object.freeze(cssChecks) }),
    priority: "P0" as const,
    ...(gallery.notes === undefined
      ? {}
      : { notes: optionalString(gallery.notes, "gallery notes", 2_048) }),
    ...(gallery.allowedDuplicateWritablePaths === undefined
      ? {}
      : {
          allowedDuplicateWritablePaths: optionalDuplicatePaths(
            gallery.allowedDuplicateWritablePaths
          ),
        }),
  });
  return Object.freeze({
    version: 1,
    expectedWidgetCount: 1,
    excludedScreenOnlyWidgets: excluded,
    widgets: Object.freeze([widget]),
  }) as WidgetContractInventoryOverlay;
}
