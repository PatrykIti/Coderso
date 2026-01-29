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
  state: {
    success: string;
    warning: string;
    danger: string;
  };
};

export const DEFAULT_ADMIN_THEME_TOKENS: AdminThemeTokens = {
  base: {
    bg: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    border: "#e2e8f0",
  },
  buttons: {
    primary: {
      bg: "#1d4ed8",
      text: "#ffffff",
      hoverBg: "#1e40af",
      hoverText: "#ffffff",
    },
    secondary: {
      bg: "#0f766e",
      text: "#ffffff",
      hoverBg: "#115e59",
      hoverText: "#ffffff",
    },
    outline: {
      border: "#e2e8f0",
      text: "#0f172a",
      hoverBg: "#f1f5f9",
      hoverText: "#0f172a",
    },
    ghost: {
      hoverBg: "#f1f5f9",
      hoverText: "#0f172a",
    },
  },
  inputs: {
    bg: "#ffffff",
    border: "#e2e8f0",
    text: "#0f172a",
    placeholder: "#94a3b8",
    focusRing: "#1d4ed8",
  },
  sidebar: {
    bg: "#ffffff",
    text: "#64748b",
    activeBg: "#e0f2fe",
    activeText: "#1d4ed8",
    hoverBg: "#f1f5f9",
  },
  topbar: {
    bg: "#ffffff",
    text: "#64748b",
    border: "#e2e8f0",
  },
  card: {
    bg: "#ffffff",
    border: "#e2e8f0",
  },
  state: {
    success: "#16a34a",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
};
