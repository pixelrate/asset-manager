export type TreeNode = { id: string; name: string; parentId: string | null; sortOrder?: number };
export type TreeOption = { id: string; label: string; depth: number };

/** Flatten a parent/child list into depth-annotated options (DFS, stable order). */
export function flattenTree<T extends TreeNode>(nodes: T[]): Array<TreeOption & { node: T }> {
  const byParent = new Map<string | null, T[]>();
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    // Treat orphans (parent missing/deleted) as roots.
    const key = n.parentId && ids.has(n.parentId) ? n.parentId : null;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  }
  const out: Array<TreeOption & { node: T }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const n of byParent.get(parentId) ?? []) {
      out.push({ id: n.id, label: n.name, depth, node: n });
      walk(n.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function indentLabel(label: string, depth: number): string {
  return depth > 0 ? " ".repeat(depth * 3) + "› " + label : label;
}
