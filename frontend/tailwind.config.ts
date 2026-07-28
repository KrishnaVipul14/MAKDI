import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'makdi-primary': 'var(--makdi-primary)',
        'makdi-primary-hover': 'var(--makdi-primary-hover)',
        'makdi-bg-light': 'var(--makdi-bg-light)',
        'makdi-white': 'var(--makdi-white)',
        'makdi-text': 'var(--makdi-text)',
        'makdi-border': 'var(--makdi-border)',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
