// `data-chrono-action` is the Vanilla adapter's own hook for delegated clicks, not part of the shared contract.
const KEPT =
  /^(role|dir|abbr|type|tabindex|id|aria-.*|data-(?!chrono-action$).*)$/;

/** Keep only `--chrono-*` declarations from a style attribute (plan 05 13.4). */
function chronoStyle(value: string): string | null {
  const props = value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("--chrono-"))
    .sort();
  return props.length > 0 ? props.join("; ") : null;
}

/** Stable text form of a DOM tree: tag, contract attributes (sorted), text. */
export function snapshot(root: Element, depth = 0): string {
  const attributes = [...root.attributes]
    .filter(
      (attribute) => KEPT.test(attribute.name) || attribute.name === "style",
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((attribute) => {
      if (attribute.name === "style") {
        const chrono = chronoStyle(attribute.value);
        return chrono ? [`style="${chrono}"`] : [];
      }
      return [
        attribute.value === ""
          ? attribute.name
          : `${attribute.name}="${attribute.value}"`,
      ];
    })
    .join(" ");
  const pad = "  ".repeat(depth);
  const open = `${pad}<${root.tagName.toLowerCase()}${attributes ? ` ${attributes}` : ""}>`;
  const children = [...root.childNodes].flatMap((node) => {
    if (node.nodeType === 1) return [snapshot(node as Element, depth + 1)];
    const text = (node.textContent ?? "").trim();
    return text ? [`${pad}  ${text}`] : [];
  });
  return children.length > 0 ? [open, ...children].join("\n") : open;
}
