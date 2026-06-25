export const customScreenOverrideErrorCodes = [
  "custom_screen_override_invalid",
  "custom_screen_override_not_found",
  "custom_screen_override_conflict",
] as const;

export const screenEntryPresentationOverridePropPaths = [
  "image",
  "mediaAssetId",
  "textSize",
  "textEmphasis",
  "tone",
] as const;

export const screenEntryPresentationTextSizes = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;

export const screenEntryPresentationTextEmphasisValues = [
  "normal",
  "medium",
  "semibold",
  "bold",
] as const;

export const screenEntryPresentationToneValues = [
  "default",
  "muted",
  "strong",
  "neutral",
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export type ScreenEntryPresentationOverridePropPath =
  (typeof screenEntryPresentationOverridePropPaths)[number];
export type ScreenEntryPresentationTextSize = (typeof screenEntryPresentationTextSizes)[number];
export type ScreenEntryPresentationTextEmphasis =
  (typeof screenEntryPresentationTextEmphasisValues)[number];
export type ScreenEntryPresentationTone = (typeof screenEntryPresentationToneValues)[number];
export type ScreenEntryPresentationOverrideValue =
  | string
  | ScreenEntryPresentationTextSize
  | ScreenEntryPresentationTextEmphasis
  | ScreenEntryPresentationTone;

export type ScreenEntryPresentationOverrideDraft = {
  blockId: string;
  propPath: ScreenEntryPresentationOverridePropPath;
  value: ScreenEntryPresentationOverrideValue;
};

export type ScreenEntryPresentationOverrideRecord = ScreenEntryPresentationOverrideDraft & {
  screenId: string;
  entryId: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ScreenEntryPresentationOverrideReplacePayload = {
  overrides: ScreenEntryPresentationOverrideDraft[];
};

export const screenEntryPresentationOverrideSchema = {
  type: "object",
  required: ["blockId", "propPath", "value"],
  properties: {
    blockId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    propPath: { enum: screenEntryPresentationOverridePropPaths },
    value: { type: "string", minLength: 1, maxLength: 160 },
  },
  additionalProperties: false,
} as const;

export const screenEntryPresentationOverrideReplaceSchema = {
  type: "object",
  required: ["overrides"],
  properties: {
    overrides: {
      type: "array",
      maxItems: 200,
      items: screenEntryPresentationOverrideSchema,
    },
  },
  additionalProperties: false,
} as const;
