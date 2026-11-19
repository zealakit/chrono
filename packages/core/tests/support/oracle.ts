/**
 * Naive, deliberately simple implementations used as an oracle to cross-check
 * the fast layout (plan 05 13.4). They must be correct but need not be fast.
 */

export type Span = { start: number; days: number };

/**
 * First-fit lane packing over column spans. A piece occupies
 * `[start, start + days)` columns; it takes the lowest lane whose intervals do
 * not overlap it.
 */
export function packMonthLanes(items: readonly Span[]): number[] {
  const lanes: { start: number; end: number }[][] = [];
  return items.map((item) => {
    const end = item.start + item.days;
    let lane = 0;
    for (;;) {
      const intervals = lanes[lane];
      const overlap = intervals?.some(
        (interval) => interval.start < end && item.start < interval.end,
      );
      if (!overlap) {
        break;
      }
      lane += 1;
    }
    if (!lanes[lane]) {
      lanes[lane] = [];
    }
    lanes[lane].push({ start: item.start, end });
    return lane;
  });
}

/** mulberry32: a tiny seeded PRNG (plan 03 §5 uses the same approach). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Naive time-grid column assignment: transitive-overlap clustering by
 * union-find, then lowest-free-column placement and rightward expansion
 * (plan 05 E8). Inputs must be sorted by start, then duration descending.
 */
export function packTimeGridColumns(
  items: { start: number; end: number }[],
): { column: number; columns: number; span: number }[] {
  const n = items.length;
  const result = items.map(() => ({ column: 0, columns: 1, span: 1 }));
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) {
      root = parent[root] as number;
    }
    let current = i;
    while (parent[current] !== root) {
      const next = parent[current] as number;
      parent[current] = root;
      current = next;
    }
    return root;
  };
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      const ia = items[a] as { start: number; end: number };
      const ib = items[b] as { start: number; end: number };
      if (ia.start < ib.end && ib.start < ia.end) {
        const ra = find(a);
        const rb = find(b);
        parent[ra] = rb;
      }
    }
  }
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const root = find(i);
    const list = clusters.get(root);
    if (list) {
      list.push(i);
    } else {
      clusters.set(root, [i]);
    }
  }
  for (const indices of clusters.values()) {
    const columnEnds: number[] = [];
    for (const i of indices) {
      const item = items[i] as { start: number; end: number };
      let column = 0;
      while (
        column < columnEnds.length &&
        (columnEnds[column] as number) > item.start
      ) {
        column += 1;
      }
      if (column === columnEnds.length) {
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }
      (result[i] as { column: number }).column = column;
    }
    const columns = columnEnds.length;
    for (const i of indices) {
      const item = items[i] as { start: number; end: number };
      const placed = result[i] as {
        column: number;
        columns: number;
        span: number;
      };
      placed.columns = columns;
      let span = 1;
      while (placed.column + span < columns) {
        const column = placed.column + span;
        const overlap = indices.some((j) => {
          const other = items[j] as { start: number; end: number };
          const placedOther = result[j] as { column: number };
          return (
            placedOther.column === column &&
            other.start < item.end &&
            item.start < other.end
          );
        });
        if (overlap) {
          break;
        }
        span += 1;
      }
      placed.span = span;
    }
  }
  return result;
}
