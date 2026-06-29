export type AdminThemeTokens = {
  base: {
    bg: string;
    surface: string;
    text: string;
    border: string;
  };
  buttons: {
    primary: {
      bg: string;
      text: string;
      hoverBg: string;
      hoverText: string;
    };
    secondary: {
      bg: string;
      text: string;
      hoverBg: string;
      hoverText: string;
    };
    outline: {
      border: string;
      text: string;
      hoverBg: string;
      hoverText: string;
    };
    ghost: {
      hoverBg: string;
      hoverText: string;
    };
  };
  // NEW (TASK-479-05): soft/tinted primary surface (violet wash) used by the
  // "Soft & Friendly" prototype for selected/active chips and accents.
  primarySoft: {
    bg: string;
    text: string;
  };
  inputs: {
    bg: string;
    border: string;
    text: string;
    placeholder: string;
    focusRing: string;
  };
  sidebar: {
    bg: string;
    text: string;
    activeBg: string;
    activeText: string;
    hoverBg: string;
    // NEW (TASK-479-05): the prototype sidebar adds a muted label color, an
    // accent wash (+ its foreground) for active rows, and an explicit border.
    muted: string;
    accent: string;
    accentForeground: string;
    border: string;
  };
  topbar: {
    bg: string;
    text: string;
    border: string;
  };
  card: {
    bg: string;
    border: string;
  };
  typography: {
    sans: string;
    display: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    mutedText: string;
  };
  state: {
    success: string;
    warning: string;
    danger: string;
    // NEW (TASK-479-05): info status color + readable foregrounds for every
    // solid status surface, plus the soft/tinted status backgrounds the
    // prototype uses for badges and alerts.
    info: string;
    infoForeground: string;
    successForeground: string;
    warningForeground: string;
    dangerForeground: string;
    successSoft: string;
    warningSoft: string;
    infoSoft: string;
  };
  // NEW (TASK-479-05): soft elevation shadows for the rounded card aesthetic.
  effects: {
    shadowSoft: string;
    shadowCard: string;
    shadowPop: string;
  };
};

export const DEFAULT_ADMIN_THEME_TOKENS: AdminThemeTokens = {
  base: {
    bg: "#f6f5f2",
    surface: "#f3f1ed",
    text: "#1c1a17",
    border: "#eae7e0",
  },
  buttons: {
    primary: {
      bg: "#7c3aed",
      text: "#ffffff",
      hoverBg: "#6d28d9",
      hoverText: "#ffffff",
    },
    secondary: {
      bg: "#f1efeb",
      text: "#44403c",
      hoverBg: "#e7e3db",
      hoverText: "#1c1a17",
    },
    outline: {
      border: "#eae7e0",
      text: "#1c1a17",
      hoverBg: "#efece6",
      hoverText: "#1c1a17",
    },
    ghost: {
      hoverBg: "#efece6",
      hoverText: "#1c1a17",
    },
  },
  primarySoft: {
    bg: "#f1ecfe",
    text: "#6d28d9",
  },
  inputs: {
    bg: "#ffffff",
    border: "#e5e1d9",
    text: "#1c1a17",
    placeholder: "#a8a29a",
    focusRing: "#a78bfa",
  },
  sidebar: {
    bg: "#f1efea",
    text: "#57534e",
    activeBg: "#ece6fb",
    activeText: "#6d28d9",
    hoverBg: "#efece6",
    muted: "#a8a29a",
    accent: "#ece6fb",
    accentForeground: "#6d28d9",
    border: "#e7e3db",
  },
  topbar: {
    bg: "#f6f5f2",
    text: "#57534e",
    border: "#eae7e0",
  },
  card: {
    bg: "#ffffff",
    border: "#eae7e0",
  },
  typography: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: '"Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif',
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    mutedText: "#79716b",
  },
  state: {
    success: "#16a34a",
    warning: "#d97706",
    danger: "#e11d48",
    info: "#2563eb",
    infoForeground: "#ffffff",
    successForeground: "#ffffff",
    warningForeground: "#ffffff",
    dangerForeground: "#ffffff",
    successSoft: "#e7f6ec",
    warningSoft: "#fdf0db",
    infoSoft: "#e7eefe",
  },
  effects: {
    shadowSoft: "0 1px 2px rgba(28, 25, 23, 0.04), 0 4px 12px -6px rgba(28, 25, 23, 0.08)",
    shadowCard: "0 1px 3px rgba(28, 25, 23, 0.05), 0 12px 32px -16px rgba(28, 25, 23, 0.14)",
    shadowPop: "0 10px 34px -10px rgba(28, 25, 23, 0.24)",
  },
};

/**
 * Canonical DARK admin-theme palette (TASK-479-05, L01 dark column).
 *
 * The `AdminThemeTokens` TYPE stays single-mode: the per-template DB tokens are
 * the LIGHT set. Dark mode is emitted as a parallel `:root.dark{--admin-*}` block
 * from the injected style (see {@link import("../../ui/theme/tokenCss")
 * .toAdminThemeCssVariables} `selector` arg and the L01 dark-mode decision), so a
 * single shared dark palette recolors the real chrome for EVERY profile with no
 * data migration. The seed/theme.json wiring for these values is owned by L04;
 * this constant is the source the emitter and the AdminApp dual-block injection
 * (L06) consume.
 */
export const DEFAULT_ADMIN_THEME_TOKENS_DARK: AdminThemeTokens = {
  base: {
    bg: "#18171a",
    surface: "#232128",
    text: "#ededec",
    border: "#2d2b32",
  },
  buttons: {
    primary: {
      bg: "#8b5cf6",
      text: "#ffffff",
      hoverBg: "#7c3aed",
      hoverText: "#ffffff",
    },
    secondary: {
      bg: "#29272e",
      text: "#d8d4ce",
      hoverBg: "#34313a",
      hoverText: "#ededec",
    },
    outline: {
      border: "#2d2b32",
      text: "#ededec",
      hoverBg: "#2b2930",
      hoverText: "#ededec",
    },
    ghost: {
      hoverBg: "#2b2930",
      hoverText: "#ededec",
    },
  },
  primarySoft: {
    bg: "#2a2440",
    text: "#c4b5fd",
  },
  inputs: {
    bg: "#211f24",
    border: "#36333c",
    text: "#ededec",
    placeholder: "#756f68",
    focusRing: "#8b5cf6",
  },
  sidebar: {
    bg: "#1c1b1f",
    text: "#a8a29a",
    activeBg: "#2c2542",
    activeText: "#c4b5fd",
    hoverBg: "#2b2930",
    muted: "#756f68",
    accent: "#2c2542",
    accentForeground: "#c4b5fd",
    border: "#2a282f",
  },
  topbar: {
    bg: "#18171a",
    text: "#a8a29a",
    border: "#2d2b32",
  },
  card: {
    bg: "#211f24",
    border: "#2d2b32",
  },
  typography: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: '"Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif',
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    mutedText: "#a09a91",
  },
  state: {
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#fb7185",
    info: "#60a5fa",
    infoForeground: "#07203f",
    successForeground: "#06281c",
    warningForeground: "#2a1c05",
    dangerForeground: "#1c1a17",
    successSoft: "#18342a",
    warningSoft: "#36290f",
    infoSoft: "#16263f",
  },
  effects: {
    shadowSoft: "0 1px 2px rgba(28, 25, 23, 0.04), 0 4px 12px -6px rgba(28, 25, 23, 0.08)",
    shadowCard: "0 1px 3px rgba(28, 25, 23, 0.05), 0 12px 32px -16px rgba(28, 25, 23, 0.14)",
    shadowPop: "0 10px 34px -10px rgba(28, 25, 23, 0.24)",
  },
};
