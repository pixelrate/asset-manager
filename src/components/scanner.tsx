"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { IconCamera, IconSearch } from "@/components/icons";

type LookupResult = { type: string; url: string; name: string };

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const busyRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => () => stopRef.current?.(), []);

  const lookup = async (code: string): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setStatus(`Looking up “${code}”…`);
    try {
      const res = await fetch(`/api/lookup?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const json = (await res.json()) as LookupResult;
        setStatus(`Found: ${json.name}`);
        stopRef.current?.();
        router.push(json.url);
        return true;
      }
      setStatus(`No match for “${code}” — keep scanning.`);
      return false;
    } finally {
      busyRef.current = false;
    }
  };

  const start = async () => {
    setError(null);
    setStatus("Starting camera…");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) void lookup(result.getText());
      });
      stopRef.current = () => {
        controls.stop();
        setScanning(false);
      };
      setScanning(true);
      setStatus("Scanning — hold a code in front of the camera.");
    } catch (e) {
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : "Couldn't start the camera on this device. Use manual entry below."
      );
      setStatus(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative aspect-[4/3] bg-gray-900">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <IconCamera size={40} />
              <Button type="button" onClick={start}>
                Start scanning
              </Button>
            </div>
          )}
          {scanning && (
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/60" />
          )}
        </div>
        {(status || error) && (
          <p className={`px-4 py-2.5 text-sm ${error ? "text-red-600" : "text-gray-600"}`}>{error ?? status}</p>
        )}
        {scanning && (
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button type="button" className="text-sm font-medium text-gray-500 hover:underline" onClick={() => stopRef.current?.()}>
              Stop camera
            </button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Manual lookup</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) void lookup(manual.trim());
          }}
        >
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Barcode number, item # (e.g. 42), or QR code"
          />
          <Button type="submit" variant="secondary">
            <IconSearch size={16} /> Find
          </Button>
        </form>
      </Card>
    </div>
  );
}
