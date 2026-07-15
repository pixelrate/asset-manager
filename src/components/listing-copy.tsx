"use client";

import { useMemo, useState } from "react";
import { Button, Select } from "@/components/ui";
import { fillTemplate } from "@/lib/format";

type TemplateView = { id: string; name: string; marketplace: string | null; body: string };

export function ListingCopy({
  templates,
  vars,
}: {
  templates: TemplateView[];
  vars: Record<string, string | number | null>;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const t = templates.find((t) => t.id === templateId);
    return t ? fillTemplate(t.body, vars) : "";
  }, [templateId, templates, vars]);

  if (templates.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No listing templates yet — create one in Settings → Templates to generate ready-to-paste listing copy.
      </p>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-auto flex-1">
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.marketplace ? ` (${t.marketplace.toLowerCase()})` : ""}
            </option>
          ))}
        </Select>
        <Button variant="secondary" type="button" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 font-sans text-sm text-gray-700">
        {output}
      </pre>
    </div>
  );
}
