"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea, cn } from "@/components/ui";
import { IconMic } from "@/components/icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Textarea with Web Speech API dictation (mic button). Falls back silently where unsupported. */
export function VoiceTextarea({
  name,
  defaultValue,
  placeholder,
  rows = 4,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop?.();
  }, []);

  const toggle = () => {
    const w = window as any;
    if (listening) {
      recRef.current?.stop?.();
      setListening(false);
      return;
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text) {
        setValue((prev) => (prev ? prev.replace(/\s+$/, "") + " " + text.trim() : text.trim()));
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="relative">
      <Textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pr-11"
      />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          title={listening ? "Stop dictation" : "Dictate with your voice"}
          className={cn(
            "absolute right-2 top-2 rounded-full p-1.5 transition-colors",
            listening ? "animate-pulse bg-red-100 text-red-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          )}
        >
          <IconMic size={18} />
        </button>
      )}
    </div>
  );
}
