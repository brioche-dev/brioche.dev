export function indoc(
  strings: TemplateStringsArray,
  ...values: string[]
): string {
  const string = strings
    .flatMap((str, i): string[] => {
      const value = values[i];
      if (value != null) {
        return [str, value];
      } else {
        return [str];
      }
    })
    .join("");

  let lines = string.split("\n");

  if (lines.at(0)?.trim() === "") {
    lines = lines.slice(1);
  }
  if (lines.at(-1)?.trim() === "") {
    lines = lines.slice(0, -1);
  }

  lines = [...lines, ""];

  const minIndentation = lines.reduce((minIndentation, line) => {
    if (line.trim() === "") {
      return minIndentation;
    }

    const indentation = line.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(minIndentation, indentation);
  }, Infinity);

  return lines.map((line) => line.slice(minIndentation)).join("\n");
}
