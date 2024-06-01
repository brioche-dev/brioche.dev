import colors from "tailwindcss/colors";
import starlightPlugin from "@astrojs/starlight-tailwind";
import tailwindTypography from "@tailwindcss/typography";

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
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,svg}"],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        brioche: {
          css: {
            "--tw-prose-body": theme("colors.gray[800]"),
            "--tw-prose-headings": theme("colors.gray[900]"),
            "--tw-prose-lead": theme("colors.gray[700]"),
            "--tw-prose-links": theme("colors.gray[900]"),
            "--tw-prose-bold": theme("colors.gray[900]"),
            "--tw-prose-counters": theme("colors.gray[600]"),
            "--tw-prose-bullets": theme("colors.gray[400]"),
            "--tw-prose-hr": theme("colors.gray[300]"),
            "--tw-prose-quotes": theme("colors.gray[900]"),
            "--tw-prose-quote-borders": theme("colors.gray[300]"),
            "--tw-prose-captions": theme("colors.gray[700]"),
            "--tw-prose-code": theme("colors.gray[900]"),
            "--tw-prose-pre-code": theme("colors.gray[100]"),
            "--tw-prose-pre-bg": theme("colors.gray[900]"),
            "--tw-prose-th-borders": theme("colors.gray[300]"),
            "--tw-prose-td-borders": theme("colors.gray[200]"),
            "--tw-prose-invert-body": theme("colors.gray[200]"),
            "--tw-prose-invert-headings": theme("colors.white"),
            "--tw-prose-invert-lead": theme("colors.gray[300]"),
            "--tw-prose-invert-links": theme("colors.white"),
            "--tw-prose-invert-bold": theme("colors.white"),
            "--tw-prose-invert-counters": theme("colors.gray[400]"),
            "--tw-prose-invert-bullets": theme("colors.gray[600]"),
            "--tw-prose-invert-hr": theme("colors.gray[700]"),
            "--tw-prose-invert-quotes": theme("colors.gray[100]"),
            "--tw-prose-invert-quote-borders": theme("colors.gray[700]"),
            "--tw-prose-invert-captions": theme("colors.gray[400]"),
            "--tw-prose-invert-code": theme("colors.white"),
            "--tw-prose-invert-pre-code": theme("colors.gray[300]"),
            "--tw-prose-invert-th-borders": theme("colors.gray[600]"),
            "--tw-prose-invert-td-borders": theme("colors.gray[700]"),
          },
        },
        quoteless: {
          css: {
            "blockquote p:first-of-type::before": { content: "none" },
            "blockquote p:first-of-type::after": { content: "none" },
            blockquote: {
              fontWeight: "inherit",
              fontStyle: "inherit",
            },
            "blockquote p": {
              opacity: "75%",
            },
          },
        },
      }),
      colors: {
        accent,
        gray,
      },
    },
  },
  plugins: [starlightPlugin(), tailwindTypography()],
};
