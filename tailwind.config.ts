import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
      },
      colors: {
        gold: "#c8a040",
      },
    },
  },
  plugins: [],
  safelist: [
    "bar-int", "bar-disc", "bar-str", "bar-soc", "bar-cre",
    "text-int", "text-disc", "text-str", "text-soc", "text-cre",
    "bg-int", "bg-disc", "bg-str", "bg-soc", "bg-cre",
  ],
};

export default config;
