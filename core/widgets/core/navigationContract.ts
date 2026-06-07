export const navigationVariantIds = ["simple", "with-cta", "split"] as const;

export type NavigationVariantId = (typeof navigationVariantIds)[number];

export const navigationMobileModeIds = ["expanded", "drawer", "minimal"] as const;

export type NavigationMobileMode = (typeof navigationMobileModeIds)[number];
