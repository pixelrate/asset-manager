import { IconBox } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-brand-600">
        <IconBox size={30} />
        <span className="text-2xl font-bold tracking-tight text-gray-900">Asset Manager</span>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
      <p className="mt-6 text-center text-xs text-gray-400">
        Catalog your garage, workshop, and shed — and sell the rest.
      </p>
    </div>
  );
}
