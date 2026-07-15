"use client";

import { useActionState, useState } from "react";
import { Button, Card, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { CONDITIONS, DECISIONS, MARKETPLACES, SELLING_STATUSES } from "@/lib/constants";
import type { SelectOption } from "@/lib/types";
import { indentLabel } from "@/lib/tree";
import { VoiceTextarea } from "@/components/voice-textarea";
import type { ItemFormState } from "@/app/(app)/items/actions";

export type CustomFieldInput = {
  id: string;
  name: string;
  type: string;
  options: string[];
  value: string;
};

export type ItemFormInitial = Partial<{
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  model: string;
  serialNumber: string;
  quantity: number;
  owner: string;
  condition: string;
  notes: string;
  favorite: boolean;
  locationId: string;
  decision: string;
  sellingStatus: string;
  marketplace: string;
  listingUrl: string;
  listedAt: string; // yyyy-mm-dd
  soldAt: string;
  salePrice: number | null;
  buyer: string;
  saleNotes: string;
  purchasePrice: number | null;
  estimatedValue: number | null;
  minPrice: number | null;
  tags: string;
}>;

type Props = {
  action: (prev: ItemFormState, fd: FormData) => Promise<ItemFormState>;
  categories: SelectOption[];
  locations: SelectOption[];
  customFields: CustomFieldInput[];
  initial?: ItemFormInitial;
  submitLabel: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function ItemForm({ action, categories, locations, customFields, initial = {}, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(action, {});
  const [sellingStatus, setSellingStatus] = useState(initial.sellingStatus ?? "NOT_LISTED");
  const showSaleFields = sellingStatus !== "NOT_LISTED" || (initial.decision ?? "") === "SELL";

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state.error} />

      <Section title="Basics">
        <div className="sm:col-span-2">
          <Field label="Name *">
            <Input name="name" required defaultValue={initial.name ?? ""} placeholder="DeWalt 20V drill" autoFocus />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" hint="Tap the mic to dictate.">
            <VoiceTextarea name="description" defaultValue={initial.description ?? ""} placeholder="What is it, what's included, anything worth remembering…" />
          </Field>
        </div>
        <Field label="Category">
          <Select name="categoryId" defaultValue={initial.categoryId ?? ""}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {indentLabel(c.label, c.depth ?? 0)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condition">
          <Select name="condition" defaultValue={initial.condition ?? ""}>
            <option value="">— Not set —</option>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand">
          <Input name="brand" defaultValue={initial.brand ?? ""} placeholder="DeWalt" />
        </Field>
        <Field label="Model">
          <Input name="model" defaultValue={initial.model ?? ""} placeholder="DCD771C2" />
        </Field>
        <Field label="Serial number">
          <Input name="serialNumber" defaultValue={initial.serialNumber ?? ""} />
        </Field>
        <Field label="Quantity">
          <Input name="quantity" type="number" min={1} defaultValue={initial.quantity ?? 1} />
        </Field>
        <Field label="Owner" hint="Whose is it? (household member, business, …)">
          <Input name="owner" defaultValue={initial.owner ?? ""} />
        </Field>
        <Field label="Tags" hint="Comma-separated, e.g. cordless, yellow, project-x">
          <Input name="tags" defaultValue={initial.tags ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="favorite" defaultChecked={initial.favorite ?? false} className="rounded" />
            Mark as favorite
          </label>
        </div>
      </Section>

      <Section title="Where is it?">
        <Field label="Location">
          <Select name="locationId" defaultValue={initial.locationId ?? ""}>
            <option value="">— None —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {indentLabel(l.label, l.depth ?? 0)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Keep / Sell / Donate / Trash">
          <Select name="decision" defaultValue={initial.decision ?? "UNDECIDED"}>
            {DECISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Value">
        <Field label="Purchase price ($)">
          <Input name="purchasePrice" type="number" step="any" min={0} defaultValue={initial.purchasePrice ?? ""} />
        </Field>
        <Field label="Estimated value ($)">
          <Input name="estimatedValue" type="number" step="any" min={0} defaultValue={initial.estimatedValue ?? ""} />
        </Field>
        <Field label="Minimum acceptable price ($)" hint="Your negotiation floor.">
          <Input name="minPrice" type="number" step="any" min={0} defaultValue={initial.minPrice ?? ""} />
        </Field>
      </Section>

      <Section title="Selling">
        <Field label="Selling status">
          <Select name="sellingStatus" value={sellingStatus} onChange={(e) => setSellingStatus(e.target.value)}>
            {SELLING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Marketplace">
          <Select name="marketplace" defaultValue={initial.marketplace ?? ""}>
            <option value="">— None —</option>
            {MARKETPLACES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        {(showSaleFields || sellingStatus !== "NOT_LISTED") && (
          <>
            <Field label="Listing URL">
              <Input name="listingUrl" type="url" defaultValue={initial.listingUrl ?? ""} placeholder="https://…" />
            </Field>
            <Field label="Listed on">
              <Input name="listedAt" type="date" defaultValue={initial.listedAt ?? ""} />
            </Field>
            <Field label="Sale price ($)">
              <Input name="salePrice" type="number" step="any" min={0} defaultValue={initial.salePrice ?? ""} />
            </Field>
            <Field label="Sold on">
              <Input name="soldAt" type="date" defaultValue={initial.soldAt ?? ""} />
            </Field>
            <Field label="Buyer">
              <Input name="buyer" defaultValue={initial.buyer ?? ""} />
            </Field>
            <Field label="Sale notes">
              <Input name="saleNotes" defaultValue={initial.saleNotes ?? ""} />
            </Field>
          </>
        )}
      </Section>

      {customFields.length > 0 && (
        <Section title="Custom fields">
          {customFields.map((cf) => (
            <Field key={cf.id} label={cf.name}>
              {cf.type === "SELECT" ? (
                <Select name={`cf_${cf.id}`} defaultValue={cf.value}>
                  <option value="">— None —</option>
                  {cf.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : cf.type === "BOOLEAN" ? (
                <input type="checkbox" name={`cf_${cf.id}`} defaultChecked={cf.value === "true"} className="mt-2 rounded" />
              ) : (
                <Input
                  name={`cf_${cf.id}`}
                  type={cf.type === "NUMBER" ? "number" : cf.type === "DATE" ? "date" : "text"}
                  step={cf.type === "NUMBER" ? "any" : undefined}
                  defaultValue={cf.value}
                />
              )}
            </Field>
          ))}
        </Section>
      )}

      <Section title="Notes & photos">
        <div className="sm:col-span-2">
          <Field label="Notes">
            <VoiceTextarea name="notes" defaultValue={initial.notes ?? ""} rows={3} placeholder="Private notes — quirks, missing parts, where the keys are…" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Add photos" hint="You can add, reorder, and pick a primary photo on the item page.">
            <input
              type="file"
              name="photos"
              accept="image/*"
              multiple
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <button type="button" onClick={() => history.back()} className="text-sm text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
