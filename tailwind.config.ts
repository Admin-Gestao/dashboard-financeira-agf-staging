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
        primary: '#D6A35D',
        secondary: '#8C6A3A',
        background: {
          start: '#050816',
          end: '#0B1026',
        },
        text: '#F3F6FC',
        card: '#11182E',
        success: '#43D18E',
        info: '#66AEFF',
        destructive: '#FF6F61',
        warning: '#E4BE63',
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
