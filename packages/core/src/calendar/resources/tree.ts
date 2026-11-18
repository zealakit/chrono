import { warnOnce } from "../events/normalize.js";
import type { ResourceId, ResourceInput, ResourceRow } from "./types.js";

/**
 * Flat resources → the visible, depth-first rows (plan 10 §13.2). Roots have no
 * `parentId` or an unknown one; cycles are broken by dropping the back edge;
 * a repeated `id` keeps the first. Collapsed groups hide their descendants.
 */
export function buildResourceTree<T extends ResourceInput>(
  resources: readonly T[],
  collapsed: readonly ResourceId[] = [],
  getLabel?: (resource: T) => string,
): { rows: ResourceRow<T>[]; leafCount: number } {
  const byKey = new Map<string, T>();
  for (const resource of resources) {
    const key = String(resource.id);
    if (byKey.has(key)) {
      warnOnce(`[chrono] Duplicate resource id "${key}".`);
      continue;
    }
    byKey.set(key, resource);
  }

  const parentOf = (resource: T): string | null => {
    const parent = resource.parentId;
    if (parent === undefined || parent === null) {
      return null;
    }
    const key = String(parent);
    if (!byKey.has(key)) {
      warnOnce(
        `[chrono] Resource "${resource.id}" has an unknown parentId "${key}".`,
      );
      return null;
    }
    return key;
  };

  const parents = new Map<string, string | null>();
  for (const [key, resource] of byKey) {
    parents.set(key, parentOf(resource));
  }
  // Break cycles: walk up from each node; a revisit means a back edge.
  for (const key of byKey.keys()) {
    const seen = new Set<string>([key]);
    let current = parents.get(key) ?? null;
    while (current !== null) {
      if (seen.has(current)) {
        warnOnce(
          `[chrono] Resource "${key}" is part of a parent cycle; made a root.`,
        );
        parents.set(key, null);
        break;
      }
      seen.add(current);
      current = parents.get(current) ?? null;
    }
  }

  const children = new Map<string | null, string[]>();
  for (const key of byKey.keys()) {
    const parent = parents.get(key) ?? null;
    const list = children.get(parent) ?? [];
    list.push(key);
    children.set(parent, list);
  }

  const collapsedKeys = new Set(collapsed.map(String));
  const rows: ResourceRow<T>[] = [];
  let leafCount = 0;
  const visit = (key: string, level: number): void => {
    const resource = byKey.get(key) as T;
    const kids = children.get(key) ?? [];
    const group = kids.length > 0;
    const expanded = group && !collapsedKeys.has(key);
    rows.push({
      key,
      id: resource.id,
      resource,
      label: getLabel ? getLabel(resource) : String(resource.id),
      parentKey: parents.get(key) ?? null,
      level,
      group,
      expanded,
      index: rows.length,
    });
    if (!group) {
      leafCount += 1;
    }
    if (expanded) {
      for (const child of kids) {
        visit(child, level + 1);
      }
    }
  };
  for (const root of children.get(null) ?? []) {
    visit(root, 0);
  }
  return { rows, leafCount };
}
