import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { BottomNav, Sidebar } from "@/components/nav";
import { IconLogout } from "@/components/icons";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <Sidebar
        user={{ name: user.name, tenantName: user.tenant.name, isSuperAdmin: user.isSuperAdmin }}
        logout={
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Sign out"
            >
              <IconLogout size={18} />
            </button>
          </form>
        }
      />
      <main className="px-4 pb-24 pt-4 md:ml-60 md:px-8 md:pb-10 md:pt-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
