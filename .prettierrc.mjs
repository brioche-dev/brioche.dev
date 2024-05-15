/** @type {import("prettier").Config} */
export default {
  trailingComma: "all",
  htmlWhitespaceSensitivity: "strict",
  proseWrap: "never",
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
