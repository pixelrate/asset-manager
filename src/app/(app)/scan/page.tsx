import { PageHeader } from "@/components/ui";
import { Scanner } from "@/components/scanner";

export const metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Scan"
        subtitle="Point the camera at an item's QR code or barcode to jump straight to it."
      />
      <Scanner />
    </div>
  );
}
