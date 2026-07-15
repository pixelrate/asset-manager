"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const tabs = [
  { href: "/settings", label: "General" },
  { href: "/settings/categories", label: "Categories" },
  { href: "/settings/tags", label: "Tags" },
  { href: "/settings/templates", label: "Templates" },
  { href: "/settings/fields", label: "Custom fields" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/billing", label: "Billing" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
