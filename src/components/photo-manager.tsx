"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, cn } from "@/components/ui";
import { deletePhoto, movePhoto, setPrimaryPhoto } from "@/app/(app)/items/actions";
import { IconUpload } from "@/components/icons";
import { dateShort } from "@/lib/format";

export type PhotoView = { id: string; url: string; isPrimary: boolean; createdAt: string };

export function PhotoManager({ itemId, photos }: { itemId: string; photos: PhotoView[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("photos", f);
      const res = await fetch(`/api/items/${itemId}/photos`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const act = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, idx) => (
          <figure key={p.id} className={cn("group relative overflow-hidden rounded-xl border bg-gray-50", p.isPrimary ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              className="aspect-square w-full cursor-zoom-in object-cover"
              onClick={() => setLightbox(p.url)}
            />
            {p.isPrimary && (
              <Badge color="bg-brand-600 text-white" className="absolute left-2 top-2">
                Primary
              </Badge>
            )}
            <figcaption className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px] text-gray-400">
              <span>{dateShort(p.createdAt)}</span>
              <span className="flex items-center gap-0.5">
                <button className="rounded px-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30" disabled={idx === 0 || pending} onClick={() => act(() => movePhoto(p.id, "up"))} title="Move earlier">
                  ←
                </button>
                <button className="rounded px-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30" disabled={idx === photos.length - 1 || pending} onClick={() => act(() => movePhoto(p.id, "down"))} title="Move later">
                  →
                </button>
                {!p.isPrimary && (
                  <button className="rounded px-1 text-gray-500 hover:bg-gray-100" disabled={pending} onClick={() => act(() => setPrimaryPhoto(p.id))} title="Make primary">
                    ★
                  </button>
                )}
                <button
                  className="rounded px-1 text-red-400 hover:bg-red-50"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this photo?")) act(() => deletePhoto(p.id));
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </span>
            </figcaption>
          </figure>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500"
        >
          <IconUpload size={22} />
          <span className="text-xs font-medium">{uploading ? "Uploading…" : "Add photos"}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

export function AttachmentUploader({ itemId }: { itemId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      await fetch(`/api/items/${itemId}/attachments`, { method: "POST", body: fd });
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <Button variant="small" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading…" : "Attach file"}
      </Button>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
    </>
  );
}
