"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Select, cn } from "@/components/ui";
import type { SelectOption } from "@/lib/types";
import { indentLabel } from "@/lib/tree";
import { clearLocationPin, setLocationPin } from "@/app/(app)/locations/actions";
import { IconPin, IconUpload } from "@/components/icons";

export type MapPin = { locationId: string; name: string; x: number; y: number; itemCount: number };

export function MapEditor({
  mapId,
  imageUrl,
  pins,
  locations,
}: {
  mapId: string;
  imageUrl: string;
  pins: MapPin[];
  locations: SelectOption[]; // all tenant locations (for pin placement)
}) {
  const router = useRouter();
  const [placing, setPlacing] = useState<string>("");
  const [pending, start] = useTransition();
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const onMapClick = (e: React.MouseEvent) => {
    if (!placing || !imgWrapRef.current) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const locId = placing;
    start(async () => {
      await setLocationPin(locId, mapId, x, y);
      setPlacing("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <Select value={placing} onChange={(e) => setPlacing(e.target.value)} className="w-auto min-w-52 flex-1">
          <option value="">Select a location to pin…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {indentLabel(l.label, l.depth ?? 0)}
            </option>
          ))}
        </Select>
        {placing ? (
          <span className="text-sm font-medium text-brand-600">
            {pending ? "Saving pin…" : "Now click/tap the map where this location is."}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Pick a location, then tap the map to place its pin.</span>
        )}
      </div>

      <div
        ref={imgWrapRef}
        onClick={onMapClick}
        className={cn("relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", placing && "cursor-crosshair ring-2 ring-brand-300")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Garage map" className="block w-full select-none" draggable={false} />
        {pins.map((p) => (
          <Link
            key={p.locationId}
            href={`/locations/${p.locationId}`}
            onClick={(e) => {
              if (placing) e.preventDefault();
            }}
            className="group absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            title={`${p.name} (${p.itemCount} items)`}
          >
            <span className="flex flex-col items-center">
              <span className="whitespace-nowrap rounded-md bg-gray-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {p.name} · {p.itemCount}
              </span>
              <span className="text-brand-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                <IconPin size={30} fill="white" />
              </span>
            </span>
          </Link>
        ))}
      </div>

      {pins.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pinned locations</p>
          <ul className="flex flex-wrap gap-2">
            {pins.map((p) => (
              <li key={p.locationId} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                <Link href={`/locations/${p.locationId}`} className="font-medium hover:text-brand-600">
                  {p.name}
                </Link>
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-500"
                  title="Remove pin"
                  onClick={() =>
                    start(async () => {
                      await clearLocationPin(p.locationId);
                      router.refresh();
                    })
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MapUploadForm() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/maps", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      router.push(`/map?id=${json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        name="name"
        placeholder="Map name (e.g. Garage overhead)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="file"
        name="image"
        accept="image/*"
        required
        className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
      />
      <Button type="submit" disabled={uploading}>
        <IconUpload size={16} /> {uploading ? "Uploading…" : "Upload map"}
      </Button>
    </form>
  );
}
