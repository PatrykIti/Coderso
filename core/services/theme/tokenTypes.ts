export type DesignTokens = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  neutrals: {
    bg: string;
    surface: string;
    border: string;
    text: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    sans: string;
    display: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
};

export type DesignTokenOverrides = {
  colors?: Partial<DesignTokens["colors"]>;
  neutrals?: Partial<DesignTokens["neutrals"]>;
  spacing?: Partial<DesignTokens["spacing"]>;
  radius?: Partial<DesignTokens["radius"]>;
  typography?: Partial<DesignTokens["typography"]>;
};

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: "#1d4ed8",
    secondary: "#0f766e",
    accent: "#f59e0b",
  },
  neutrals: {
    bg: "#ffffff",
    surface: "#f8fafc",
    border: "#e2e8f0",
    text: "#0f172a",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  typography: {
    sans: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    display: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  },
};
