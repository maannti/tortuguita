import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="md:w-48 flex-shrink-0">
        <SettingsSidebar />
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
