import type { DesignTokens } from "../../services/theme/tokenTypes";

export function toCssVariables(tokens: DesignTokens) {
  const entries = [
    `--color-primary:${tokens.colors.primary}`,
    `--color-secondary:${tokens.colors.secondary}`,
    `--color-accent:${tokens.colors.accent}`,
    `--color-bg:${tokens.neutrals.bg}`,
    `--color-surface:${tokens.neutrals.surface}`,
    `--color-text:${tokens.neutrals.text}`,
    `--space-xs:${tokens.spacing.xs}`,
    `--space-sm:${tokens.spacing.sm}`,
    `--space-md:${tokens.spacing.md}`,
    `--space-lg:${tokens.spacing.lg}`,
    `--space-xl:${tokens.spacing.xl}`,
    `--space-2xl:${tokens.spacing["2xl"]}`,
    `--radius-sm:${tokens.radius.sm}`,
    `--radius-md:${tokens.radius.md}`,
    `--radius-lg:${tokens.radius.lg}`,
    `--radius-xl:${tokens.radius.xl}`,
    `--font-sans:${tokens.typography.sans}`,
    `--font-display:${tokens.typography.display}`,
    `--text-sm:${tokens.typography.sm}`,
    `--text-md:${tokens.typography.md}`,
    `--text-lg:${tokens.typography.lg}`,
    `--text-xl:${tokens.typography.xl}`,
    `--text-2xl:${tokens.typography["2xl"]}`,
  ];

  return `:root{${entries.join(";")};}`;
}
