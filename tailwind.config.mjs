import colors from "tailwindcss/colors";
import starlightPlugin from "@astrojs/starlight-tailwind";

// Color palette originally generated from this page:
// https://starlight.astro.build/guides/css-and-tailwind/
//
// Settings:
// - Accent: Hue = 70, Chroma = 0.227
// - Gray: Hue = 54, Chroma = 0.002
const accent = {
  200: "#e9c193",
  600: "#955e00",
  900: "#482b00",
  950: "#351e00",
};
const gray = {
  100: "#f8f6f4",
  200: "#f2ece9",
  300: "#c7c0bc",
  400: "#968980",
  500: "#61554e",
  700: "#41362f",
  800: "#2f241e",
  900: "#1c1714",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        accent,
        gray,
      },
    },
  },
  plugins: [starlightPlugin()],
};
