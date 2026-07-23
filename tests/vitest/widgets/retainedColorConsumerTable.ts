const freezeRows = <const Rows extends readonly Readonly<Record<PropertyKey, unknown>>[]>(
  rows: Rows
): Rows => {
  for (const row of rows) Object.freeze(row);
  return Object.freeze(rows) as Rows;
};

export const RETAINED_COLOR_FIELDS = Object.freeze({
  section: freezeRows([
    { path: "heading.labelColor", control: "section.heading.labelColor", nested: false },
    { path: "heading.titleColor", control: "section.heading.titleColor", nested: false },
    {
      path: "heading.descriptionColor",
      control: "section.heading.descriptionColor",
      nested: false,
    },
    { path: "style.backgroundColor", control: "section.style.backgroundColor", nested: false },
    { path: "style.gradientFrom", control: "section.style.gradientFrom", nested: true },
    { path: "style.gradientTo", control: "section.style.gradientTo", nested: true },
    { path: "style.borderColor", control: "section.style.borderColor", nested: false },
    { path: "style.overlayColor", control: "section.style.overlayColor", nested: false },
  ] as const),
  tabs: freezeRows([
    { path: "style.surfaceColor", control: "tabs.visual.surface-color" },
    { path: "style.borderColor", control: "tabs.visual.border-color" },
    { path: "style.activeBackgroundColor", control: "tabs.visual.active-background-color" },
    { path: "style.activeTextColor", control: "tabs.visual.active-text-color" },
    { path: "style.inactiveTextColor", control: "tabs.visual.inactive-text-color" },
    { path: "style.panelBackgroundColor", control: "tabs.visual.panel-background-color" },
  ] as const),
  contact: freezeRows([
    { path: "style.background", control: "contact.style.background" },
    { path: "style.surfaceColor", control: "contact.style.surfaceColor" },
    { path: "style.borderColor", control: "contact.style.borderColor" },
    { path: "style.textColor", control: "contact.style.textColor" },
    { path: "style.mutedTextColor", control: "contact.style.mutedTextColor" },
    {
      path: "style.buttonBackgroundColor",
      control: "contact.style.buttonBackgroundColor",
    },
    { path: "style.buttonTextColor", control: "contact.style.buttonTextColor" },
    { path: "style.buttonBorderColor", control: "contact.style.buttonBorderColor" },
  ] as const),
  toggle: freezeRows([
    { path: "style.surfaceColor", control: "toggle-block.theme.surfaceColor" },
    { path: "style.borderColor", control: "toggle-block.theme.borderColor" },
    { path: "style.accentColor", control: "toggle-block.theme.accentColor" },
    {
      path: "style.accentContrastColor",
      control: "toggle-block.theme.accentContrastColor",
    },
  ] as const),
  divider: freezeRows([
    { path: "labelColor", control: "divider.visual.label.color", nested: false },
    { path: "color", control: "divider.visual.line.color", nested: true },
  ] as const),
  navigation: freezeRows([
    { path: "style.textColor", control: "navigation.visual.style.textColor" },
    { path: "style.logoColor", control: "navigation.visual.style.logoColor" },
    { path: "style.linkColor", control: "navigation.visual.style.linkColor" },
    { path: "style.linkHoverColor", control: "navigation.visual.style.linkHoverColor" },
    { path: "style.linkActiveColor", control: "navigation.visual.style.linkActiveColor" },
    { path: "style.surfaceColor", control: "navigation.visual.style.surfaceColor" },
    { path: "style.borderColor", control: "navigation.visual.style.borderColor" },
    { path: "style.ctaTextColor", control: "navigation.visual.style.ctaTextColor" },
    {
      path: "style.ctaBackgroundColor",
      control: "navigation.visual.style.ctaBackgroundColor",
    },
    { path: "style.ctaBorderColor", control: "navigation.visual.style.ctaBorderColor" },
  ] as const),
  footer: freezeRows([
    { path: "style.surfaceColor", control: "footer.style.surfaceColor" },
    { path: "style.borderColor", control: "footer.style.borderColor" },
    { path: "style.textColor", control: "footer.style.textColor" },
    { path: "style.headingColor", control: "footer.style.headingColor" },
    { path: "style.linkColor", control: "footer.style.linkColor" },
    { path: "style.linkHoverColor", control: "footer.style.linkHoverColor" },
    { path: "style.linkActiveColor", control: "footer.style.linkActiveColor" },
    { path: "style.socialColor", control: "footer.style.socialColor" },
    { path: "style.legalTextColor", control: "footer.style.legalTextColor" },
  ] as const),
} as const);
