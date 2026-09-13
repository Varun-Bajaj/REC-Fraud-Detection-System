import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#0b1326",
        foreground: "#dae2fd",

        // Stitch Design System Colors
        surface: "#0b1326",
        "surface-dim": "#0b1326",
        "surface-bright": "#31394d",
        "surface-container-lowest": "#060e20",
        "surface-container-low": "#131b2e",
        "surface-container": "#171f33",
        "surface-container-high": "#222a3d",
        "surface-container-highest": "#2d3449",
        "on-surface": "#dae2fd",
        "on-surface-variant": "#bacac1",
        "outline": "#85948c",
        "outline-variant": "#3b4a43",

        // Primary: Electric Mint
        "primary": {
          DEFAULT: "#45f1bf",
          container: "#00d4a4",
          fixed: "#55fdca",
          "fixed-dim": "#28e0af",
          foreground: "#003829",
        },
        "on-primary": "#003829",
        "on-primary-container": "#005641",

        // Secondary: Forest Sage
        "secondary": {
          DEFAULT: "#a5d0b9",
          container: "#29513f",
          fixed: "#c1ecd4",
          "fixed-dim": "#a5d0b9",
          foreground: "#0e3727",
        },
        "on-secondary": "#0e3727",
        "on-secondary-container": "#97c2ab",

        // Tertiary: Protocol Ice Blue
        "tertiary": {
          DEFAULT: "#c6d7ff",
          container: "#9abbff",
          fixed: "#d7e2ff",
          "fixed-dim": "#acc7ff",
          foreground: "#002f67",
        },
        "on-tertiary": "#002f67",
        "on-tertiary-container": "#004899",

        // Error / Alert
        "error": {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
          foreground: "#690005",
        },
        "on-error": "#690005",
        "on-error-container": "#ffdad6",

        // Botanical Leaves compatibility
        forest: {
          950: "#060e20",
          900: "#0b1326",
          800: "#131b2e",
          700: "#171f33",
        },
        leaf: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          500: "#45f1bf",
          600: "#28e0af",
          700: "#00d4a4",
          800: "#005641",
        },
        sprout: {
          300: "#55fdca",
          400: "#45f1bf",
          500: "#28e0af",
          600: "#00d4a4",
        },
        sage: {
          50: "#131b2e",
          100: "#171f33",
          200: "#222a3d",
          300: "#2d3449",
          600: "#85948c",
          800: "#bacac1",
        },
      },
      fontFamily: {
        headline: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        code: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
