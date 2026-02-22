import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminPageAccess } from "@/lib/admin-authz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Promptloop admin console.",
};

export default async function AdminHomePage() {
  await requireAdminPageAccess({ callbackUrl: "/admin" });

  return (
    <section className="content-shell py-10">
      <section className="surface-card">
        <h1 className="text-2xl font-semibold text-zinc-900">Admin</h1>
        <p className="mt-1 text-sm text-zinc-600">Internal tools for managing Promptloop.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/users"
            className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
          >
            Users
          </Link>
        </div>
        <p className="mt-5 text-xs text-zinc-500">Access is controlled by `ADMIN_EMAILS` environment variable.</p>
      </section>
    </section>
  );
}
