import type {
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorMode,
  WidgetEditorSectionRole,
} from "./types";

export type WidgetEditorContractErrorCode =
  | "editor_contract_missing"
  | "editor_contract_version_invalid"
  | "editor_contract_sections_invalid"
  | "editor_contract_missing_mode"
  | "editor_contract_empty_section_id"
  | "editor_contract_title_derived_section_id"
  | "editor_contract_duplicate_section_id"
  | "editor_contract_unknown_mode"
  | "editor_contract_unknown_role"
  | "editor_contract_invalid_title"
  | "editor_contract_invalid_writable_paths"
  | "editor_contract_invalid_readonly_paths"
  | "editor_contract_invalid_path"
  | "editor_contract_duplicate_writable_path"
  | "editor_contract_duplicate_allowance_invalid"
  | "editor_contract_advanced_writable_diagnostic"
  | "editor_contract_wizard_style_owner";

export type WidgetEditorContractError = {
  code: WidgetEditorContractErrorCode;
  widgetType: string;
  message: string;
  sectionId?: string;
  mode?: string;
  path?: string;
};

export type WidgetEditorContractValidation = {
  widgetType: string;
  valid: boolean;
  errors: WidgetEditorContractError[];
};

export type WidgetEditorContractValidationOptions = {
  requireContract?: boolean;
};

type WidgetEditorContractTarget = Pick<WidgetDefinition, "type" | "editorContract">;

type SectionRef = {
  mode: WidgetEditorMode;
  sectionId: string;
  allowancePaths: Set<string>;
};

const editorModes: WidgetEditorMode[] = ["wizard", "visual", "advanced"];
const editorModeSet = new Set<string>(editorModes);
const sectionRoles = new Set<string>([
  "setup",
  "source",
  "content",
  "visual",
  "layout",
  "technical",
  "diagnostics",
  "summary",
] satisfies WidgetEditorSectionRole[]);
const pathPattern = /^[a-zA-Z0-9_.-]+$/;
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const wizardStyleSegments = new Set([
  "style",
  "styles",
  "layout",
  "color",
  "colors",
  "spacing",
  "radius",
  "typography",
  "shadow",
  "background",
  "padding",
  "margin",
  "surface",
  "border",
  "font",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function addError(
  widgetType: string,
  errors: WidgetEditorContractError[],
  error: Omit<WidgetEditorContractError, "widgetType">
) {
  errors.push({ widgetType, ...error });
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEditorMode(value: string): value is WidgetEditorMode {
  return editorModeSet.has(value);
}

function normalizeTitleId(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isSafePath(path: string): boolean {
  return (
    pathPattern.test(path) &&
    !path.split(".").some((segment) => !segment || unsafePathSegments.has(segment))
  );
}

function isWizardStylePath(path: string): boolean {
  const normalized = path.toLowerCase();
  if (
    normalized.startsWith("style.") ||
    normalized.startsWith("styles.") ||
    normalized.startsWith("layout.")
  ) {
    return true;
  }

  return normalized.split(/[._-]/).some((segment) => wizardStyleSegments.has(segment));
}

function readPathList(
  widgetType: string,
  value: unknown,
  fieldErrorCode:
    | "editor_contract_invalid_writable_paths"
    | "editor_contract_invalid_readonly_paths",
  errors: WidgetEditorContractError[],
  sectionId: string,
  mode: string
): string[] {
  if (!Array.isArray(value)) {
    addError(widgetType, errors, {
      code: fieldErrorCode,
      message: "Editor contract path list must be an array.",
      sectionId,
      mode,
    });
    return [];
  }

  const paths: string[] = [];
  for (const rawPath of value) {
    const path = toTrimmedString(rawPath);
    if (!path || !isSafePath(path)) {
      addError(widgetType, errors, {
        code: "editor_contract_invalid_path",
        message: "Editor contract paths must be safe dot paths.",
        sectionId,
        mode,
        path,
      });
      continue;
    }
    paths.push(path);
  }
  return paths;
}

function readAllowancePaths(
  widgetType: string,
  value: unknown,
  errors: WidgetEditorContractError[],
  sectionId: string,
  mode: string
): Set<string> {
  const paths = new Set<string>();
  if (value === undefined) {
    return paths;
  }
  if (!Array.isArray(value)) {
    addError(widgetType, errors, {
      code: "editor_contract_duplicate_allowance_invalid",
      message: "Duplicate writable path allowances must be an array.",
      sectionId,
      mode,
    });
    return paths;
  }

  for (const allowance of value) {
    if (!isRecord(allowance)) {
      addError(widgetType, errors, {
        code: "editor_contract_duplicate_allowance_invalid",
        message: "Duplicate writable path allowance must be an object.",
        sectionId,
        mode,
      });
      continue;
    }
    const path = toTrimmedString(allowance.path);
    const reason = toTrimmedString(allowance.reason);
    const expiresWithTask = toTrimmedString(allowance.expiresWithTask);
    if (!path || !isSafePath(path) || !reason || !expiresWithTask) {
      addError(widgetType, errors, {
        code: "editor_contract_duplicate_allowance_invalid",
        message: "Duplicate writable path allowance requires path, reason, and expiry task.",
        sectionId,
        mode,
        path,
      });
      continue;
    }
    paths.add(path);
  }

  return paths;
}

function assertNoDuplicateWriters(
  widgetType: string,
  pathWriters: Map<string, SectionRef[]>,
  errors: WidgetEditorContractError[]
) {
  for (const [path, refs] of pathWriters) {
    if (refs.length <= 1) {
      continue;
    }
    if (refs.every((ref) => ref.allowancePaths.has(path))) {
      continue;
    }
    addError(widgetType, errors, {
      code: "editor_contract_duplicate_writable_path",
      message: "Writable paths must have one owning editor section unless explicitly allowed.",
      sectionId: refs.map((ref) => ref.sectionId).join(","),
      path,
    });
  }
}

export function validateWidgetEditorContract(
  definition: WidgetEditorContractTarget,
  options: WidgetEditorContractValidationOptions = {}
): WidgetEditorContractValidation {
  const errors: WidgetEditorContractError[] = [];
  const widgetType = definition.type;
  const contract = definition.editorContract;

  if (contract === undefined) {
    if (options.requireContract === true) {
      addError(widgetType, errors, {
        code: "editor_contract_missing",
        message: "Widget editor contract is required.",
      });
    }
    return {
      widgetType: definition.type,
      valid: errors.length === 0,
      errors,
    };
  }

  if (!isRecord(contract) || contract.version !== 2) {
    addError(widgetType, errors, {
      code: "editor_contract_version_invalid",
      message: "Widget editor contract version must be 2.",
    });
  }

  const sections = isRecord(contract) ? contract.sections : undefined;
  if (!Array.isArray(sections)) {
    addError(widgetType, errors, {
      code: "editor_contract_sections_invalid",
      message: "Widget editor contract sections must be an array.",
    });
    return {
      widgetType: definition.type,
      valid: false,
      errors,
    };
  }

  const sectionIds = new Set<string>();
  const modesWithSections = new Set<WidgetEditorMode>();
  const pathWriters = new Map<string, SectionRef[]>();

  for (const rawSection of sections) {
    if (!isRecord(rawSection)) {
      addError(widgetType, errors, {
        code: "editor_contract_sections_invalid",
        message: "Widget editor contract section must be an object.",
      });
      continue;
    }

    const mode = toTrimmedString(rawSection.mode);
    const sectionId = toTrimmedString(rawSection.id);
    const title = toTrimmedString(rawSection.title);
    const role = toTrimmedString(rawSection.role);

    if (!mode) {
      addError(widgetType, errors, {
        code: "editor_contract_missing_mode",
        message: "Editor contract section must declare a mode.",
        sectionId,
      });
    } else if (!isEditorMode(mode)) {
      addError(widgetType, errors, {
        code: "editor_contract_unknown_mode",
        message: "Editor contract section declares an unknown mode.",
        sectionId,
        mode,
      });
    } else {
      modesWithSections.add(mode);
    }

    if (!sectionId) {
      addError(widgetType, errors, {
        code: "editor_contract_empty_section_id",
        message: "Editor contract section id must be stable and non-empty.",
        mode,
      });
    } else if (sectionIds.has(sectionId)) {
      addError(widgetType, errors, {
        code: "editor_contract_duplicate_section_id",
        message: "Editor contract section ids must be unique.",
        sectionId,
        mode,
      });
    } else {
      sectionIds.add(sectionId);
    }

    if (!title) {
      addError(widgetType, errors, {
        code: "editor_contract_invalid_title",
        message: "Editor contract section title must be non-empty.",
        sectionId,
        mode,
      });
    } else if (sectionId && normalizeTitleId(title) === sectionId) {
      addError(widgetType, errors, {
        code: "editor_contract_title_derived_section_id",
        message: "Editor contract section id must not be derived directly from the title.",
        sectionId,
        mode,
      });
    }

    if (!role || !sectionRoles.has(role)) {
      addError(widgetType, errors, {
        code: "editor_contract_unknown_role",
        message: "Editor contract section role must be known.",
        sectionId,
        mode,
      });
    }

    const writablePaths = readPathList(
      widgetType,
      rawSection.writablePaths,
      "editor_contract_invalid_writable_paths",
      errors,
      sectionId,
      mode
    );
    if (rawSection.readOnlyPaths !== undefined) {
      readPathList(
        widgetType,
        rawSection.readOnlyPaths,
        "editor_contract_invalid_readonly_paths",
        errors,
        sectionId,
        mode
      );
    }

    const allowancePaths = readAllowancePaths(
      widgetType,
      rawSection.allowedDuplicateWritablePaths,
      errors,
      sectionId,
      mode
    );
    const uniqueSectionWritablePaths = new Set<string>();
    for (const path of writablePaths) {
      if (uniqueSectionWritablePaths.has(path)) {
        addError(widgetType, errors, {
          code: "editor_contract_duplicate_writable_path",
          message: "Writable paths must not be duplicated inside one section.",
          sectionId,
          mode,
          path,
        });
        continue;
      }
      uniqueSectionWritablePaths.add(path);

      if (isEditorMode(mode)) {
        const refs = pathWriters.get(path) ?? [];
        refs.push({ mode, sectionId, allowancePaths });
        pathWriters.set(path, refs);
      }
    }

    if (mode === "advanced" && role === "diagnostics" && writablePaths.length > 0) {
      addError(widgetType, errors, {
        code: "editor_contract_advanced_writable_diagnostic",
        message: "Advanced diagnostics sections must be read-only.",
        sectionId,
        mode,
      });
    }

    if (mode === "wizard") {
      for (const path of writablePaths) {
        if (isWizardStylePath(path)) {
          addError(widgetType, errors, {
            code: "editor_contract_wizard_style_owner",
            message: "Wizard sections must not own visual style or layout paths.",
            sectionId,
            mode,
            path,
          });
        }
      }
    }
  }

  for (const mode of editorModes) {
    if (!modesWithSections.has(mode)) {
      addError(widgetType, errors, {
        code: "editor_contract_missing_mode",
        message: "Widget editor contract must include wizard, visual, and advanced sections.",
        mode,
      });
    }
  }

  assertNoDuplicateWriters(widgetType, pathWriters, errors);

  return {
    widgetType: definition.type,
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidWidgetEditorContract(
  definition: WidgetEditorContractTarget,
  options: WidgetEditorContractValidationOptions = {}
): WidgetEditorContractValidation {
  const validation = validateWidgetEditorContract(definition, options);
  if (!validation.valid) {
    const codes = validation.errors.map((error) => error.code).join(",");
    throw new Error(`widget_editor_contract_invalid:${definition.type}:${codes}`);
  }
  return validation;
}

export type { WidgetEditorContract };
