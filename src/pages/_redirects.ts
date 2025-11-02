// This file is used for redirects in Cloudflare Pages:
// https://developers.cloudflare.com/pages/configuration/redirects/
//
// NOTE: This file doesn't normally get included by Astro because it starts
// with an underscore, but there's a small custom integration in the Astro
// config that includes it under `/_redirects` anyway.

interface Redirect {
  from: string;
  to: string;
  code?: number;
}

export const redirects: Redirect[] = [
  {
    from: "/docs",
    to: "/docs/getting-started",
  },
  {
    from: "/blog/portable-dynamically-linked-pacakges-on-linux",
    to: "/blog/portable-dynamically-linked-packages-on-linux",
    code: 302,
  },
  {
    from: "/help/proot-fallback",
    to: "/docs/configuration#proot-fallback",
  },
  {
    from: "/help/sandbox-backend",
    to: "/docs/configuration#sandbox-configuration",
  },
  {
    from: "/help/manual-update",
    to: "/docs/installation#manually-updating",
  },
];

export async function GET() {
  // Create a redirect for each entry in `redirects` (both with and without
  // a trailing slash
  const redirectList = redirects
    .flatMap(({ from, to, code = 301 }) => [
      `${from} ${to} ${code}`,
      `${from}/ ${to} ${code}`,
    ])
    .join("\n");
  return new Response(`${redirectList}\n`);
}
