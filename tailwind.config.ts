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
        primary: '#A67C3A',
        secondary: '#C49B52',
        background: {
          start: '#010326',
          end: '#020540',
        },
        text: '#EAE6DF',
        card: '#020540',
        success: '#27B08B',
        info: '#5E7FC4',
        destructive: '#D95F6E',
        warning: '#C49B52',
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
