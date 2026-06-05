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
        primary: '#C8861A',
        secondary: '#8C5A13',
        background: {
          start: '#010440',
          end: '#020654',
        },
        text: '#F0EDE8',
        card: '#020654',
        success: '#2DD4A0',
        info: '#6B85C4',
        destructive: '#E05C6A',
        warning: '#D4A853',
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        display: ["DM Serif Display", "serif"],
        poppins: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
