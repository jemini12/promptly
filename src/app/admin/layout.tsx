import { SiteNav } from "@/components/site-nav";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="page-shell">
      <SiteNav signedIn />
      {children}
    </main>
  );
}
