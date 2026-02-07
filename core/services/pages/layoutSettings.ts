import {
  containerTokens,
  spacingTokens,
  type ContainerToken,
  type SpacingToken,
} from "../../widgets/types";

const pageMaxWidthTokens = ["4xl", "5xl", "6xl", "7xl"] as const;

export type PageMaxWidthToken = (typeof pageMaxWidthTokens)[number];

export type PageSectionLayoutDefaults = {
  container: ContainerToken;
  padding: { top: SpacingToken; bottom: SpacingToken };
  margin: { top: SpacingToken; bottom: SpacingToken };
};

export type PageLayoutSettings = {
  wrapper: {
    container: ContainerToken;
    maxWidth?: PageMaxWidthToken;
    padding: { top: SpacingToken; bottom: SpacingToken };
    background: { color: string; image?: string | null };
  };
  sections: {
    gap: SpacingToken;
    defaults: PageSectionLayoutDefaults;
  };
  typographyPreset?: string;
  applyDefaultsToNewBlocks: boolean;
};

const defaultSectionLayoutDefaults: PageSectionLayoutDefaults = {
  container: "default",
  padding: { top: "xl", bottom: "xl" },
  margin: { top: "none", bottom: "none" },
};

const defaultPageLayoutSettings: PageLayoutSettings = {
  wrapper: {
    container: "full",
    padding: { top: "none", bottom: "none" },
    background: { color: "transparent", image: null },
  },
  sections: {
    gap: "none",
    defaults: defaultSectionLayoutDefaults,
  },
  applyDefaultsToNewBlocks: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeContainerToken = (
  value: unknown,
  fallback: ContainerToken
): ContainerToken =>
  typeof value === "string" && containerTokens.includes(value as ContainerToken)
    ? (value as ContainerToken)
    : fallback;

const normalizeSpacingToken = (
  value: unknown,
  fallback: SpacingToken
): SpacingToken =>
  typeof value === "string" && spacingTokens.includes(value as SpacingToken)
    ? (value as SpacingToken)
    : fallback;

const normalizePageMaxWidthToken = (
  value: unknown
): PageMaxWidthToken | undefined =>
  typeof value === "string" && pageMaxWidthTokens.includes(value as PageMaxWidthToken)
    ? (value as PageMaxWidthToken)
    : undefined;

const normalizeSectionLayoutDefaults = (
  value: unknown
): PageSectionLayoutDefaults => {
  const input = isRecord(value) ? value : {};
  const padding = isRecord(input.padding) ? input.padding : {};
  const margin = isRecord(input.margin) ? input.margin : {};
  return {
    container: normalizeContainerToken(
      input.container,
      defaultSectionLayoutDefaults.container
    ),
    padding: {
      top: normalizeSpacingToken(
        padding.top,
        defaultSectionLayoutDefaults.padding.top
      ),
      bottom: normalizeSpacingToken(
        padding.bottom,
        defaultSectionLayoutDefaults.padding.bottom
      ),
    },
    margin: {
      top: normalizeSpacingToken(margin.top, defaultSectionLayoutDefaults.margin.top),
      bottom: normalizeSpacingToken(
        margin.bottom,
        defaultSectionLayoutDefaults.margin.bottom
      ),
    },
  };
};

export function normalizePageLayoutSettings(input: unknown): PageLayoutSettings {
  const value = isRecord(input) ? input : {};
  const wrapper = isRecord(value.wrapper) ? value.wrapper : {};
  const wrapperPadding = isRecord(wrapper.padding) ? wrapper.padding : {};
  const wrapperBackground = isRecord(wrapper.background) ? wrapper.background : {};
  const sections = isRecord(value.sections) ? value.sections : {};

  const typographyPreset =
    typeof value.typographyPreset === "string" && value.typographyPreset.trim().length > 0
      ? value.typographyPreset.trim()
      : undefined;

  const maxWidth = normalizePageMaxWidthToken(wrapper.maxWidth);

  return {
    wrapper: {
      container: normalizeContainerToken(
        wrapper.container,
        defaultPageLayoutSettings.wrapper.container
      ),
      ...(maxWidth ? { maxWidth } : {}),
      padding: {
        top: normalizeSpacingToken(
          wrapperPadding.top,
          defaultPageLayoutSettings.wrapper.padding.top
        ),
        bottom: normalizeSpacingToken(
          wrapperPadding.bottom,
          defaultPageLayoutSettings.wrapper.padding.bottom
        ),
      },
      background: {
        color:
          typeof wrapperBackground.color === "string" &&
          wrapperBackground.color.trim().length > 0
            ? wrapperBackground.color
            : defaultPageLayoutSettings.wrapper.background.color,
        image:
          typeof wrapperBackground.image === "string"
            ? wrapperBackground.image
            : wrapperBackground.image === null
              ? null
              : defaultPageLayoutSettings.wrapper.background.image,
      },
    },
    sections: {
      gap: normalizeSpacingToken(
        sections.gap,
        defaultPageLayoutSettings.sections.gap
      ),
      defaults: normalizeSectionLayoutDefaults(sections.defaults),
    },
    ...(typographyPreset ? { typographyPreset } : {}),
    applyDefaultsToNewBlocks:
      typeof value.applyDefaultsToNewBlocks === "boolean"
        ? value.applyDefaultsToNewBlocks
        : defaultPageLayoutSettings.applyDefaultsToNewBlocks,
  };
}

export function normalizePageDataLayout(data: Record<string, unknown>) {
  const settings = isRecord(data.settings) ? data.settings : {};
  return {
    ...data,
    settings: {
      ...settings,
      layout: normalizePageLayoutSettings(settings.layout),
    },
  };
}

export function getPageLayoutSettingsFromData(
  data?: Record<string, unknown> | null
): PageLayoutSettings {
  if (!isRecord(data)) return normalizePageLayoutSettings(undefined);
  const settings = isRecord(data.settings) ? data.settings : {};
  return normalizePageLayoutSettings(settings.layout);
}

export const pageLayoutTokens = {
  maxWidth: pageMaxWidthTokens,
};
