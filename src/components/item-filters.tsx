"use client";

import { useState } from "react";
import { Button, Input, Select, cn } from "@/components/ui";
import { CONDITIONS, DECISIONS, MARKETPLACES, SELLING_STATUSES } from "@/lib/constants";
import type { SelectOption } from "@/lib/types";
import { indentLabel } from "@/lib/tree";
import { IconSearch } from "@/components/icons";

type Props = {
  categories: SelectOption[];
  locations: SelectOption[];
  tags: SelectOption[];
  values: Record<string, string>;
};

export function ItemFilters({ categories, locations, tags, values }: Props) {
  const hasAdvanced = Boolean(
    values.condition || values.marketplace || values.tag || values.minValue || values.maxValue || values.dateFrom || values.dateTo || values.favorites
  );
  const [open, setOpen] = useState(hasAdvanced);

  return (
    <form method="get" action="/items" className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <IconSearch size={16} />
          </span>
          <Input name="q" defaultValue={values.q ?? ""} placeholder="Search name, description, serial, barcode…" className="pl-9" />
        </div>
        <Select name="category" defaultValue={values.category ?? ""} className="w-auto min-w-36">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {indentLabel(c.label, c.depth ?? 0)}
            </option>
          ))}
        </Select>
        <Select name="location" defaultValue={values.location ?? ""} className="w-auto min-w-36">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {indentLabel(l.label, l.depth ?? 0)}
            </option>
          ))}
        </Select>
        <Select name="decision" defaultValue={values.decision ?? ""} className="w-auto">
          <option value="">Any decision</option>
          {DECISIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={values.status ?? ""} className="w-auto">
          <option value="">Any selling status</option>
          {SELLING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="primary">
          Filter
        </Button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn("text-xs font-medium", open ? "text-brand-600" : "text-gray-500 hover:text-gray-700")}
        >
          {open ? "Fewer filters" : "More filters"}
        </button>
      </div>

      <div className={cn("flex-wrap items-end gap-2 pt-3", open ? "flex" : "hidden")}>
        <Select name="condition" defaultValue={values.condition ?? ""} className="w-auto">
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select name="marketplace" defaultValue={values.marketplace ?? ""} className="w-auto">
          <option value="">Any marketplace</option>
          {MARKETPLACES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select name="tag" defaultValue={values.tag ?? ""} className="w-auto">
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase text-gray-400">Value $ min–max</span>
          <span className="flex items-center gap-1">
            <Input name="minValue" type="number" step="any" defaultValue={values.minValue ?? ""} className="w-24" />
            <span className="text-gray-400">–</span>
            <Input name="maxValue" type="number" step="any" defaultValue={values.maxValue ?? ""} className="w-24" />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase text-gray-400">Added between</span>
          <span className="flex items-center gap-1">
            <Input name="dateFrom" type="date" defaultValue={values.dateFrom ?? ""} className="w-36" />
            <span className="text-gray-400">–</span>
            <Input name="dateTo" type="date" defaultValue={values.dateTo ?? ""} className="w-36" />
          </span>
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-gray-600">
          <input type="checkbox" name="favorites" value="1" defaultChecked={values.favorites === "1"} className="rounded" />
          Favorites only
        </label>
      </div>
    </form>
  );
}
