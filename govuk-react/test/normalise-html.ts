/**
 * Canonical form of an HTML fragment, so React output can be compared with
 * upstream's Nunjucks output regardless of source formatting:
 *
 * - attributes sorted by name; `class` tokens de-duplicated, order kept
 * - adjacent text merged and runs of whitespace collapsed to one space
 * - whitespace-only text between elements dropped (indentation)
 * - text trimmed at the start and end of its parent element
 * - comments dropped
 *
 * Whitespace between an element and real text IS kept, because it changes
 * what users and screen readers get: `<span>Warning</span> You can` is not the
 * same as `<span>Warning</span>You can`. Tag names, attribute values and text
 * all have to match.
 */
export function normaliseHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  return serialise(template.content, 0).join("\n");
}

type Item = { kind: "text"; text: string } | { kind: "element"; el: Element };

function children(node: Node): Item[] {
  const items: Item[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").replace(/\s+/g, " ");
      const last = items[items.length - 1];
      if (last?.kind === "text") last.text = (last.text + text).replace(/\s+/g, " ");
      else items.push({ kind: "text", text });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      items.push({ kind: "element", el: child as Element });
    }
  });
  return items.filter((item, i) => {
    if (item.kind !== "text") return true;
    if (!item.text.trim()) return false;
    if (i === 0 || items[i - 1]?.kind !== "element") item.text = item.text.trimStart();
    if (i === items.length - 1 || items[i + 1]?.kind !== "element") item.text = item.text.trimEnd();
    return true;
  });
}

function serialise(node: Node, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const lines: string[] = [];
  for (const item of children(node)) {
    if (item.kind === "text") {
      lines.push(pad + JSON.stringify(item.text));
      continue;
    }
    const el = item.el;
    const attrs = [...el.attributes]
      .map((a) => {
        let value = a.value;
        if (a.name === "class") value = [...new Set(value.split(/\s+/).filter(Boolean))].join(" ");
        return `${a.name}=${JSON.stringify(value)}`;
      })
      .sort();
    const tag = el.tagName.toLowerCase();
    lines.push(`${pad}<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
    lines.push(...serialise(el instanceof HTMLTemplateElement ? el.content : el, depth + 1));
  }
  return lines;
}
