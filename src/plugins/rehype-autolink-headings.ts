/*
Copied from Starlight:
https://github.com/withastro/starlight/blob/55138b3126fabd5f044303db2f25f2d1d31747c7/packages/starlight/integrations/heading-links.

Updated to add heading links to all pages except "/docs/" (which are handled
by Starlight by default)
*/

/**
 *! MIT License
 *!
 *! Copyright (c) 2023 [Astro contributors](https://github.com/withastro/starlight/graphs/contributors)
 *!
 *! Permission is hereby granted, free of charge, to any person obtaining a copy
 *! of this software and associated documentation files (the "Software"), to deal
 *! in the Software without restriction, including without limitation the rights
 *! to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *! copies of the Software, and to permit persons to whom the Software is
 *! furnished to do so, subject to the following conditions:
 *!
 *! The above copyright notice and this permission notice shall be included in all
 *! copies or substantial portions of the Software.
 *!
 *! THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *! IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *! FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *! AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *! LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *! OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *! SOFTWARE.
 */

import type { Nodes, Root } from "hast";
import { toString } from "hast-util-to-string";
import { h } from "hastscript";
import type { Transformer } from "unified";
import { SKIP, visit } from "unist-util-visit";

const AnchorLinkIcon = h(
  "span",
  { ariaHidden: "true", class: "sl-anchor-icon" },
  h(
    "svg",
    { width: 16, height: 16, viewBox: "0 0 24 24" },
    h("path", {
      fill: "currentcolor",
      d: "m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z",
    }),
  ),
);

/**
 * Add anchor links to headings.
 */
export default function rehypeAutolinkHeadings(): Transformer<Root> {
  return (tree, file) => {
    if (normalizePath(file.path).includes("/docs/")) {
      return;
    }

    visit(tree, "element", function (node, index, parent) {
      if (
        !headingRank(node) ||
        !node.properties.id ||
        typeof index !== "number" ||
        parent?.children == null
      ) {
        return;
      }

      // Wrap the heading in a div and append the anchor link.
      parent.children[index] = h(
        "div",
        { class: `sl-heading-wrapper level-${node.tagName}` },
        // Heading
        node,
        // Anchor link
        {
          type: "element",
          tagName: "a",
          properties: {
            class: "sl-anchor-link",
            href: "#" + node.properties.id,
          },
          children: [
            AnchorLinkIcon,
            h("span", { class: "sr-only" }, toString(node)),
          ],
        },
      );

      return SKIP;
    });
  };
}

/**
 * File path separators seems to be inconsistent on Windows when the rehype plugin is used on
 * Markdown vs MDX files.
 * For the time being, we normalize the path to unix style path.
 */
const backSlashRegex = /\\/g;
function normalizePath(path: string) {
  return path.replace(backSlashRegex, "/");
}

// This utility is inlined from https://github.com/syntax-tree/hast-util-heading-rank
// Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com>
// MIT License: https://github.com/syntax-tree/hast-util-heading-rank/blob/main/license
/**
 * Get the rank (`1` to `6`) of headings (`h1` to `h6`).
 * @param node Node to check.
 * @returns Rank of the heading or `undefined` if not a heading.
 */
function headingRank(node: Nodes): number | undefined {
  const name = node.type === "element" ? node.tagName.toLowerCase() : "";
  const code =
    name.length === 2 && name.charCodeAt(0) === 104 /* `h` */
      ? name.charCodeAt(1)
      : 0;
  return code > 48 /* `0` */ && code < 55 /* `7` */
    ? code - 48 /* `0` */
    : undefined;
}
