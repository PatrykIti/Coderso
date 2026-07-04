import {
  normalizeScreenDocumentV1,
  type ScreenBlockV1,
} from "../../customScreens/customScreenSchemas";

export type BlueprintAdminSurfaceColumn = "left" | "right";
export type BlueprintAdminSurfaceFieldTone = "default" | "strong" | "muted";

export type BlueprintAdminSurfaceField = {
  key: string;
  label: string;
  helper: string;
  field: string;
  tone?: BlueprintAdminSurfaceFieldTone;
  placeholderValue?: string | number | boolean;
};

export type BlueprintAdminSurfaceGroup = {
  key: string;
  title: string;
  description: string;
  column: BlueprintAdminSurfaceColumn;
  fields: BlueprintAdminSurfaceField[];
};

export type BlueprintAdminSurfaceCompositionInput = {
  key: string;
  contentSchema?: Record<string, unknown> | null;
  allowedFields?: string[];
  header: {
    eyebrow: string;
    subtitle: string;
    description: string;
    badge: string;
  };
  columns: {
    leftTitle: string;
    rightTitle?: string;
  };
  groups: BlueprintAdminSurfaceGroup[];
};

export type BlueprintAdminSurfaceComposition = {
  blocks: ScreenBlockV1[];
  bindings: [];
};

type NormalizedAdminSurfaceGroup = BlueprintAdminSurfaceGroup & {
  fields: BlueprintAdminSurfaceField[];
};

const stableKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeFieldPathPattern = /^[a-zA-Z0-9_.-]+$/;
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const fail = (code = "assistant_blueprint_admin_surface_invalid"): never => {
  throw new Error(code);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assertStableKey = (value: string) => {
  if (!stableKeyPattern.test(value)) fail();
  return value;
};

const extractSchemaFields = (schema: Record<string, unknown> | null | undefined) => {
  const properties = isRecord(schema?.properties) ? schema.properties : null;
  return properties ? Object.keys(properties) : [];
};

const normalizeFieldPath = (value: string) => {
  const field = value.trim();
  if (!field || !safeFieldPathPattern.test(field))
    fail("assistant_blueprint_admin_surface_field_invalid");
  if (field.split(".").some((segment) => !segment || unsafePathSegments.has(segment))) {
    fail("assistant_blueprint_admin_surface_field_invalid");
  }
  if (secretLikePattern.test(field)) {
    fail("assistant_blueprint_admin_surface_secret_field");
  }
  return field;
};

const assertKnownField = (field: string, knownFields: Set<string>) => {
  if (knownFields.size === 0) return;
  const root = field.startsWith("data.")
    ? field.slice("data.".length).split(".")[0]
    : field.split(".")[0];
  if (!root || !knownFields.has(root)) {
    fail("assistant_blueprint_admin_surface_field_missing");
  }
};

const createBlock = (
  id: string,
  type: string,
  data: Record<string, unknown>,
  options?: {
    variant?: string;
    slots?: Record<string, ScreenBlockV1[]>;
  }
): ScreenBlockV1 => ({
  id: assertStableKey(id),
  type,
  ...(options?.variant ? { variant: options.variant } : {}),
  data,
  ...(options?.slots ? { slots: options.slots } : {}),
});

const mergeGroups = (
  groups: BlueprintAdminSurfaceGroup[],
  knownFields: Set<string>
): Record<BlueprintAdminSurfaceColumn, NormalizedAdminSurfaceGroup[]> => {
  const byColumn: Record<BlueprintAdminSurfaceColumn, Map<string, NormalizedAdminSurfaceGroup>> = {
    left: new Map(),
    right: new Map(),
  };

  for (const group of groups) {
    const key = assertStableKey(group.key);
    const current =
      byColumn[group.column].get(key) ??
      ({
        ...group,
        key,
        fields: [],
      } satisfies NormalizedAdminSurfaceGroup);

    const fieldsByKey = new Map(current.fields.map((field) => [field.key, field]));
    for (const field of group.fields) {
      const fieldKey = assertStableKey(field.key);
      const normalizedField = normalizeFieldPath(field.field);
      assertKnownField(normalizedField, knownFields);
      const existingField = fieldsByKey.get(fieldKey);
      const tone = field.tone ?? "default";
      if (existingField) {
        if (
          existingField.field !== normalizedField ||
          existingField.label !== field.label ||
          existingField.helper !== field.helper ||
          (existingField.tone ?? "default") !== tone ||
          existingField.placeholderValue !== field.placeholderValue
        ) {
          fail("assistant_blueprint_admin_surface_duplicate_field");
        }
        continue;
      }
      current.fields.push({
        ...field,
        key: fieldKey,
        field: normalizedField,
        tone,
      });
      fieldsByKey.set(fieldKey, current.fields[current.fields.length - 1]!);
    }

    byColumn[group.column].set(key, current);
  }

  return {
    left: Array.from(byColumn.left.values()),
    right: Array.from(byColumn.right.values()),
  };
};

const buildFieldBlock = (input: { surfaceKey: string; field: BlueprintAdminSurfaceField }) =>
  createBlock(`${input.surfaceKey}-${input.field.key}`, "field", {
    label: input.field.label,
    value: input.field.placeholderValue ?? "0",
    helper: input.field.helper,
    tone: input.field.tone ?? "default",
  });

const buildGroupBlock = (input: { surfaceKey: string; group: NormalizedAdminSurfaceGroup }) =>
  createBlock(
    `${input.surfaceKey}-${input.group.key}-group`,
    "field-group",
    {
      title: input.group.title,
      description: input.group.description,
    },
    {
      slots: {
        content: input.group.fields.map((field) =>
          buildFieldBlock({
            surfaceKey: input.surfaceKey,
            field,
          })
        ),
      },
    }
  );

export const composeAdminSurface = (
  input: BlueprintAdminSurfaceCompositionInput
): BlueprintAdminSurfaceComposition => {
  const key = assertStableKey(input.key);
  const knownFields = new Set([
    ...extractSchemaFields(input.contentSchema),
    ...(input.allowedFields ?? []),
  ]);
  const groups = mergeGroups(input.groups, knownFields);
  const leftBlocks = groups.left.map((group) => buildGroupBlock({ surfaceKey: key, group }));
  const rightBlocks = groups.right.map((group) => buildGroupBlock({ surfaceKey: key, group }));
  const blocks = [
    createBlock(`${key}-header`, "record-header", {
      eyebrow: input.header.eyebrow,
      title: "Record overview",
      subtitle: input.header.subtitle,
      description: input.header.description,
      badge: input.header.badge,
      align: "start",
    }),
    ...(rightBlocks.length > 0
      ? [
          createBlock(
            `${key}-columns`,
            "columns",
            {
              leftTitle: input.columns.leftTitle,
              rightTitle: input.columns.rightTitle ?? "Secondary",
              gap: "md",
            },
            {
              variant: "aside",
              slots: {
                left: leftBlocks,
                right: rightBlocks,
              },
            }
          ),
        ]
      : leftBlocks),
  ];

  normalizeScreenDocumentV1({
    schemaVersion: 1,
    sections: [
      {
        id: "section-default",
        type: "section",
        data: { title: "Details" },
        blocks,
      },
    ],
  });

  return {
    blocks,
    bindings: [],
  };
};
