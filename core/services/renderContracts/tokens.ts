export const containerTokens = ["default", "narrow", "full"] as const;
export const spacingTokens = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;

export type ContainerToken = (typeof containerTokens)[number];
export type SpacingToken = (typeof spacingTokens)[number];
export type InheritableContainerToken = ContainerToken | "inherit";
export type InheritableSpacingToken = SpacingToken | "inherit";
export type DeviceTarget = "desktop" | "tablet" | "mobile";
