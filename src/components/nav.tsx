"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import {
  IconBox,
  IconChart,
  IconDashboard,
  IconMap,
  IconMenu,
  IconPin,
  IconPlus,
  IconPrint,
  IconQr,
  IconScan,
  IconSettings,
  IconShield,
  IconTrash,
} from "@/components/icons";

type NavUser = { name: string; tenantName: string; isSuperAdmin: boolean };

const mainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/items", label: "Items", icon: IconBox },
  { href: "/locations", label: "Locations", icon: IconPin },
  { href: "/map", label: "Garage Map", icon: IconMap },
  { href: "/scan", label: "Scan", icon: IconScan },
];

const sellingLinks = [
  { href: "/reports", label: "Reports", icon: IconChart },
  { href: "/labels", label: "Print Labels", icon: IconPrint },
];

const manageLinks = [
  { href: "/trash", label: "Trash", icon: IconTrash },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof IconBox; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export function Sidebar({ user, logout }: { user: NavUser; logout: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const section = (title: string, links: typeof mainLinks) => (
    <div>
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <nav className="space-y-0.5">
        {links.map((l) => (
          <NavItem key={l.href} {...l} active={isActive(l.href)} />
        ))}
      </nav>
    </div>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center gap-2 px-5 py-4 text-brand-600">
        <IconBox size={24} />
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">Asset Manager</p>
          <p className="max-w-36 truncate text-xs text-gray-400">{user.tenantName}</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {section("Inventory", mainLinks)}
        {section("Selling", sellingLinks)}
        {section("Manage", manageLinks)}
        {user.isSuperAdmin ? (
          <div>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Platform</p>
            <NavItem href="/admin" label="Admin" icon={IconShield} active={isActive("/admin")} />
          </div>
        ) : null}
      </div>
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
          </div>
          {logout}
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const tab = (href: string, label: string, Icon: typeof IconBox) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
        isActive(href) ? "text-brand-600" : "text-gray-500"
      )}
    >
      <Icon size={22} />
      {label}
    </Link>
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tab("/dashboard", "Home", IconDashboard)}
      {tab("/items", "Items", IconBox)}
      <Link href="/items/new" className="flex flex-1 flex-col items-center justify-center" aria-label="Add item">
        <span className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
          <IconPlus size={24} />
        </span>
      </Link>
      {tab("/scan", "Scan", IconScan)}
      {tab("/more", "More", IconMenu)}
    </nav>
  );
}

export const moreLinks = [
  { href: "/locations", label: "Locations", icon: IconPin },
  { href: "/map", label: "Garage Map", icon: IconMap },
  { href: "/reports", label: "Reports", icon: IconChart },
  { href: "/labels", label: "Print Labels", icon: IconPrint },
  { href: "/trash", label: "Trash", icon: IconTrash },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function MoreGrid({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const links = [...moreLinks, ...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: IconShield }] : [])];
  return (
    <div className="grid grid-cols-2 gap-3">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <span className="text-brand-600">
            <Icon size={22} />
          </span>
          {label}
        </Link>
      ))}
    </div>
  );
}

export function QrShortcut() {
  const pathname = usePathname();
  if (pathname.startsWith("/labels")) return null;
  return (
    <Link
      href="/labels"
      className="hidden items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 md:inline-flex"
    >
      <IconQr size={14} />
      Labels
    </Link>
  );
}
