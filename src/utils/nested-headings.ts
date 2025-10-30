export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface NestedHeading {
  depth: number;
  slug: string;
  text: string;
  children: NestedHeading[]
}

/**
 * Convert a "flat" list of headings, like those produced by Astro, into
 * a nested set of headings. Headings with the same depth will appear
 * as siblings, those with a higher depth will be added as children to
 * the prior heading.
 */
export function nestHeadings(headings: Heading[]): NestedHeading[] {
  const nestedHeadings: NestedHeading[] = [];

  for (const heading of headings) {
    const nestedHeading: NestedHeading = {
      depth: heading.depth,
      slug: heading.slug,
      text: heading.text,
      children: [],
    };

    const current = nestedHeadings.at(-1);
    if (current == null || current.depth >= heading.depth) {
      nestedHeadings.push(nestedHeading);
      continue;
    }

    let inner = current;
    while (inner.depth < heading.depth - 1) {
      const next = inner.children.at(-1);
      if (next == null) {
        break;
      }

      inner = next;
    }

    inner.children.push(nestedHeading);
  }

  return nestedHeadings;
}
