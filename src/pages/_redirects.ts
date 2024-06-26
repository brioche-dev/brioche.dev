// This file is used for redirects in Cloudflare Pages:
// https://developers.cloudflare.com/pages/configuration/redirects/
//
// NOTE: This file doesn't normally get included by Astro because it starts
// with an underscore, but there's a small custom integration in the Astro
// config that includes it under `/_redirects` anyway.

export const redirects: Record<string, string> = {
  "/docs": "/docs/getting-started",
};

export async function GET() {
  // Create a redirect for each entry in `redirects` (both with and without
  // a trailing slash
  const redirectList = Object.entries(redirects)
    .flatMap(([from, to]) => [`${from} ${to}`, `${from}/ ${to}`])
    .join("\n");
  return new Response(`${redirectList}\n`);
}
