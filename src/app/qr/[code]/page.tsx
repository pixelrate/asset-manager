import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public QR landing: /qr/[code]. Resolves the code and forwards to the item or
 * location page (which will ask for login if needed).
 */
export default async function QrRedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const item = await prisma.item.findUnique({ where: { qrCode: code }, select: { id: true } });
  if (item) redirect(`/items/${item.id}`);

  const location = await prisma.location.findUnique({ where: { qrCode: code }, select: { id: true } });
  if (location) redirect(`/locations/${location.id}`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <p className="text-4xl">🤔</p>
      <h1 className="text-lg font-semibold text-gray-900">Unknown code</h1>
      <p className="max-w-sm text-sm text-gray-500">
        This QR code (<code className="rounded bg-gray-100 px-1">{code}</code>) doesn’t match any item or location.
        It may have been deleted.
      </p>
      <Link href="/dashboard" className="text-sm font-medium text-brand-600 hover:underline">
        Go to dashboard →
      </Link>
    </div>
  );
}
