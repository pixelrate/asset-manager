import { PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";

export const metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <div className="mt-4">{children}</div>
    </div>
  );
}
