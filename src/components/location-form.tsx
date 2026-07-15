"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { LOCATION_TYPES } from "@/lib/constants";
import type { SelectOption } from "@/lib/types";
import { indentLabel } from "@/lib/tree";
import type { LocationFormState } from "@/app/(app)/locations/actions";

type Props = {
  action: (prev: LocationFormState, fd: FormData) => Promise<LocationFormState>;
  parents: SelectOption[];
  initial?: { name?: string; type?: string; parentId?: string; description?: string };
  submitLabel: string;
  resetOnSuccess?: boolean;
};

export function LocationForm({ action, parents, initial = {}, submitLabel, resetOnSuccess }: Props) {
  const [state, formAction, pending] = useActionState<LocationFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (resetOnSuccess && wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state.error, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <ErrorBanner message={state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *">
          <Input name="name" required defaultValue={initial.name ?? ""} placeholder="Shelf B, Red toolbox…" />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue={initial.type ?? "AREA"}>
            {LOCATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Inside (parent)">
          <Select name="parentId" defaultValue={initial.parentId ?? ""}>
            <option value="">— Top level —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {indentLabel(p.label, p.depth ?? 0)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Input name="description" defaultValue={initial.description ?? ""} placeholder="Optional" />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
