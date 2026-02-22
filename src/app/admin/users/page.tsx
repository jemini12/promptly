import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPageAccess } from "@/lib/admin-authz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Users",
  description: "User list and usage overview.",
};

type Row = {
  id: string;
  email: string | null;
  name: string | null;
  provider: string;
  role: string;
  createdAt: Date;
  totalJobs: number;
  enabledJobs: number;
};

export default async function AdminUsersPage() {
  await requireAdminPageAccess({ callbackUrl: "/admin/users" });

  const [users, totalByUser, enabledByUser] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, provider: true, createdAt: true, role: true },
    }),
    prisma.job.groupBy({
      by: ["userId"],
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ["userId"],
      where: { enabled: true },
      _count: { _all: true },
    }),
  ] as const);

  const totalMap = new Map(totalByUser.map((row) => [row.userId, row._count._all] as const));
  const enabledMap = new Map(enabledByUser.map((row) => [row.userId, row._count._all] as const));

  const rows: Row[] = users.map((u) => ({
    ...u,
    provider: String(u.provider),
    role: String(u.role),
    totalJobs: totalMap.get(u.id) ?? 0,
    enabledJobs: enabledMap.get(u.id) ?? 0,
  }));

  return (
    <section className="content-shell py-10">
      <section className="surface-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
            <p className="mt-1 text-sm text-zinc-600">Basic user list with job counts.</p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-zinc-600 transition hover:text-zinc-900"
          >
            Back to Admin
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-zinc-500">
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">User</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Provider</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Role</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Total jobs</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Enabled jobs</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="text-zinc-900">
                  <td className="border-b border-zinc-100 px-3 py-2">
                    <div className="flex flex-col">
                      <Link href={`/admin/users/${row.id}`} className="font-medium hover:underline">
                        {row.email ?? row.name ?? row.id}
                      </Link>
                      {row.email && row.name ? <span className="text-xs text-zinc-500">{row.name}</span> : null}
                    </div>
                  </td>
                  <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{row.provider}</td>
                  <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{row.role}</td>
                  <td className="border-b border-zinc-100 px-3 py-2 tabular-nums">{row.totalJobs}</td>
                  <td className="border-b border-zinc-100 px-3 py-2 tabular-nums">{row.enabledJobs}</td>
                  <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{row.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
