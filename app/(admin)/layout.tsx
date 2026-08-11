import SidebarShell from "@/components/layout/sidebar-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarShell />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
