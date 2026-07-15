"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, Input, cn } from "@/components/ui";
import { IconPrint } from "@/components/icons";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <IconPrint size={16} /> Print
    </Button>
  );
}

type Opt = { id: string; label: string };

export function LabelSelector({ items, locations }: { items: Opt[]; locations: Opt[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selItems, setSelItems] = useState<Set<string>>(new Set());
  const [selLocs, setSelLocs] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );
  const filteredLocs = useMemo(
    () => locations.filter((l) => l.label.toLowerCase().includes(q.toLowerCase())),
    [locations, q]
  );

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  const count = selItems.size + selLocs.size;

  const generate = () => {
    const params = new URLSearchParams();
    if (selItems.size) params.set("ids", [...selItems].join(","));
    if (selLocs.size) params.set("locations", [...selLocs].join(","));
    router.push(`/labels?${params.toString()}`);
  };

  const listBox = (
    title: string,
    opts: Opt[],
    sel: Set<string>,
    apply: (s: Set<string>) => void,
    all: Opt[]
  ) => (
    <Card>
      <CardHeader
        title={`${title} (${sel.size} selected)`}
        action={
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() => apply(sel.size === all.length ? new Set() : new Set(all.map((o) => o.id)))}
          >
            {sel.size === all.length ? "Clear all" : "Select all"}
          </button>
        }
      />
      <ul className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
        {opts.map((o) => (
          <li key={o.id}>
            <label className={cn("flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50", sel.has(o.id) && "bg-brand-50/50")}>
              <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(sel, o.id, apply)} className="rounded" />
              <span className="text-gray-800">{o.label}</span>
            </label>
          </li>
        ))}
        {opts.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">No matches.</li>}
      </ul>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button type="button" onClick={generate} disabled={count === 0}>
          <IconPrint size={16} /> Generate sheet ({count})
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {listBox("Items", filteredItems, selItems, setSelItems, items)}
        {listBox("Locations", filteredLocs, selLocs, setSelLocs, locations)}
      </div>
    </div>
  );
}
