import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui";
import { IconClock, IconX } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "ACTIVE") redirect("/dashboard");

  const rejected = user.status === "REJECTED" || user.status === "SUSPENDED";

  return (
    <div className="text-center">
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          rejected ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
        }`}
      >
        {rejected ? <IconX size={24} /> : <IconClock size={24} />}
      </div>
      <h1 className="mb-1 text-lg font-semibold text-gray-900">
        {rejected ? "Account unavailable" : "Awaiting approval"}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {rejected
          ? "Your account has been rejected or suspended. Contact the administrator if you believe this is a mistake."
          : `Thanks ${user.name.split(" ")[0]} — your account (${user.email}) was created and is waiting for an administrator to approve it. Check back soon.`}
      </p>
      <form action={logoutAction}>
        <Button variant="secondary" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
