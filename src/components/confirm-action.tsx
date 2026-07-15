"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonStyles } from "@/components/ui";

/** Button that confirms, runs a server action, then refreshes. */
export function ConfirmAction({
  action,
  label,
  confirmText,
  variant = "secondary",
  className,
}: {
  action: () => Promise<void>;
  label: string;
  confirmText?: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          await action();
          router.refresh();
        });
      }}
    >
      {pending ? "Working…" : label}
    </Button>
  );
}
