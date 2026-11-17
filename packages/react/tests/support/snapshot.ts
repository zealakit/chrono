const KEPT = /^(role|dir|abbr|type|tabindex|id|aria-.*|data-.*)$/;

/** Stable text form of a DOM tree: tag, contract attributes (sorted), text. */
export function snapshot(root: Element, depth = 0): string {
  const attributes = [...root.attributes]
    .filter((attribute) => KEPT.test(attribute.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((attribute) =>
      attribute.value === ""
        ? attribute.name
        : `${attribute.name}="${attribute.value}"`,
    )
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
