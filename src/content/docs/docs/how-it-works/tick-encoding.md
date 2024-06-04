---
title: Tick Encoding
---

Brioche heavily uses JSON representations for values, especially for [artifacts](/docs/core-concepts/artifacts) and [recipes](/docs/core-concepts/recipes). It turns out that there are quite a few places where we need to represent arbitrary binary data in JSON objects, although in a lot of cases the data is commonly "ASCII-like", meaning the document would mostly be readable if it were stored in a pure ASCII format, but we still need to preserve any non-ASCII values in their original form. There are a few different obvious choices for encoding this data:

- Directly as an array of numbers: `[0, 1, 2]`
  - Extremely space inefficient
  - Not at all human readable
- As a hex-encoded string: `"000102"`
  - Very space inefficient
  - Not human readable
- As a base64-encoded string: `"MDAwMTAy"`
  - Relatively efficient for arbitrary binary data, but not as efficient as it could be for "ASCII-like" data
  - Not human readable
  - A few footguns around padding
- As a percent-encoded / URL-encoded string: `"%00%01%02"`
  - Very efficient for pure ASCII and ASCII-like data, inefficient for arbitrary binary data
  - Very human readable
  - Several different dialects depending on context, several equivalent forms for the same input

From these choices, percent encoding looks the most promising for Brioche's use-case, but the lack of a single canonical encoding is a very tough pill to swallow. Two different recipes could be different even if they contain exactly the same data, purely because the percent encoding was different!

This is why [Tick Encoding](https://crates.io/crates/tick-encoding) was created: it's a format extremely similar to percent encoding, but with a few differences:

- Uses the backtick (<code>\`</code>) character instead of the percent (`%`) character for escapes. The escape character itself is also represented as two backticks as a special case
- One canonical encoding scheme that's also validated on decode, ensuring that any binary string has a single Tick Encoding representation
- Slightly expanded set of characters that can be represented unescaped, since we don't need to worry about URL safety

Tick Encoding is used anywhere that arbitrary binary data should go in Brioche, such as for file paths and for inputs to processes (both of which are commonly ASCII or UTF-8, but don't need to be).
