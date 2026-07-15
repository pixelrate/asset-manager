"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Select, cn } from "@/components/ui";
import {
  CONDITIONS,
  DECISIONS,
  DECISION_COLORS,
  SELLING_STATUSES,
  SELLING_STATUS_COLORS,
  labelFor,
} from "@/lib/constants";
import { money, itemNo } from "@/lib/format";
import type { ItemRow, SelectOption } from "@/lib/types";
import { indentLabel } from "@/lib/tree";
import { bulkSoftDelete, bulkUpdateItems, toggleFavorite, type BulkPatch } from "@/app/(app)/items/actions";
import { IconBox, IconStar } from "@/components/icons";

type Props = {
  rows: ItemRow[];
  categories: SelectOption[];
  locations: SelectOption[];
};

function Thumb({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
        <IconBox size={20} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-11 w-11 rounded-lg object-cover" loading="lazy" />;
}

function Star({ item }: { item: ItemRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={item.favorite ? "Unfavorite" : "Favorite"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleFavorite(item.id);
          router.refresh();
        })
      }
      className={cn("p-1", item.favorite ? "text-amber-400" : "text-gray-300 hover:text-amber-300")}
    >
      <IconStar size={16} fill={item.favorite ? "currentColor" : "none"} />
    </button>
  );
}

export function ItemsTable({ rows, categories, locations }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [patch, setPatch] = useState<BulkPatch>({});
  const [pending, start] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ids = [...selected];

  const applyBulk = () =>
    start(async () => {
      await bulkUpdateItems(ids, patch);
      setSelected(new Set());
      setBulkOpen(false);
      setPatch({});
      router.refresh();
    });

  const deleteBulk = () => {
    if (!confirm(`Move ${ids.length} item(s) to trash?`)) return;
    start(async () => {
      await bulkSoftDelete(ids);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <div>
      {ids.length > 0 && (
        <div className="sticky top-2 z-20 mb-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-brand-700">{ids.length} selected</span>
            <Button variant="small" onClick={() => setBulkOpen(!bulkOpen)} disabled={pending}>
              Bulk edit
            </Button>
            <Link
              href={`/labels?ids=${ids.join(",")}`}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Print labels
            </Link>
            <Button variant="small" className="text-red-600" onClick={deleteBulk} disabled={pending}>
              Move to trash
            </Button>
            <button type="button" className="ml-auto text-xs text-gray-500 hover:underline" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
          {bulkOpen && (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-brand-100 pt-2">
              <Select className="w-auto" value={patch.categoryId ?? ""} onChange={(e) => setPatch({ ...patch, categoryId: e.target.value || undefined })}>
                <option value="">Category: no change</option>
                <option value="__clear__">Category: clear</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {indentLabel(c.label, c.depth ?? 0)}
                  </option>
                ))}
              </Select>
              <Select className="w-auto" value={patch.locationId ?? ""} onChange={(e) => setPatch({ ...patch, locationId: e.target.value || undefined })}>
                <option value="">Location: no change</option>
                <option value="__clear__">Location: clear</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {indentLabel(l.label, l.depth ?? 0)}
                  </option>
                ))}
              </Select>
              <Select className="w-auto" value={patch.decision ?? ""} onChange={(e) => setPatch({ ...patch, decision: e.target.value || undefined })}>
                <option value="">Decision: no change</option>
                {DECISIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <Select className="w-auto" value={patch.sellingStatus ?? ""} onChange={(e) => setPatch({ ...patch, sellingStatus: e.target.value || undefined })}>
                <option value="">Status: no change</option>
                {SELLING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Button variant="primary" className="px-3 py-1 text-xs" onClick={applyBulk} disabled={pending}>
                {pending ? "Applying…" : "Apply"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-2 py-2.5">Item</th>
              <th className="px-2 py-2.5">Category</th>
              <th className="px-2 py-2.5">Location</th>
              <th className="px-2 py-2.5">Decision</th>
              <th className="px-2 py-2.5">Status</th>
              <th className="px-2 py-2.5 text-right">Value</th>
              <th className="w-10 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className={cn("hover:bg-gray-50", selected.has(r.id) && "bg-brand-50/50")}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="rounded" />
                </td>
                <td className="px-2 py-2">
                  <Link href={`/items/${r.id}`} className="flex items-center gap-3">
                    <Thumb url={r.photoUrl} />
                    <span>
                      <span className="block font-medium text-gray-900 hover:text-brand-600">{r.name}</span>
                      <span className="block text-xs text-gray-400">
                        {itemNo(r.itemNumber)}
                        {r.brand ? ` · ${r.brand}` : ""}
                        {r.quantity > 1 ? ` · ×${r.quantity}` : ""}
                        {r.condition ? ` · ${labelFor(CONDITIONS, r.condition)}` : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-gray-600">{r.categoryName ?? "—"}</td>
                <td className="px-2 py-2 text-gray-600">{r.locationName ?? "—"}</td>
                <td className="px-2 py-2">
                  <Badge color={DECISION_COLORS[r.decision]}>{labelFor(DECISIONS, r.decision)}</Badge>
                </td>
                <td className="px-2 py-2">
                  <Badge color={SELLING_STATUS_COLORS[r.sellingStatus]}>{labelFor(SELLING_STATUSES, r.sellingStatus)}</Badge>
                </td>
                <td className="px-2 py-2 text-right font-medium text-gray-700">
                  {r.sellingStatus === "SOLD" ? money(r.salePrice) : money(r.estimatedValue)}
                </td>
                <td className="px-2 py-2">
                  <Star item={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={cn("rounded-xl border border-gray-200 bg-white p-3 shadow-sm", selected.has(r.id) && "border-brand-300 bg-brand-50/40")}>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="mt-1 rounded" />
              <Link href={`/items/${r.id}`} className="flex flex-1 items-start gap-3">
                <Thumb url={r.photoUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{r.name}</span>
                  <span className="block text-xs text-gray-400">
                    {itemNo(r.itemNumber)} · {r.locationName ?? "No location"}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge color={DECISION_COLORS[r.decision]}>{labelFor(DECISIONS, r.decision)}</Badge>
                    <Badge color={SELLING_STATUS_COLORS[r.sellingStatus]}>{labelFor(SELLING_STATUSES, r.sellingStatus)}</Badge>
                  </span>
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {r.sellingStatus === "SOLD" ? money(r.salePrice) : money(r.estimatedValue)}
                </span>
              </Link>
              <Star item={r} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
