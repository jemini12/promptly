import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPageAccess } from "@/lib/admin-authz";
import { RoleEditor } from "@/app/admin/users/[id]/role-editor";
import { PlanEditor } from "@/app/admin/users/[id]/plan-editor";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Admin User",
  description: "User detail and jobs.",
};

export default async function AdminUserDetailPage({ params }: Params) {
  await requireAdminPageAccess({ callbackUrl: "/admin/users" });
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      createdAt: true,
      role: true,
      plan: true,
      overrideEnabledJobsLimit: true,
      overrideTotalJobsLimit: true,
      overrideDailyRunLimit: true,
    },
  });
  if (!user) {
    return (
      <section className="content-shell py-10">
        <section className="surface-card">
          <h1 className="text-2xl font-semibold text-zinc-900">User not found</h1>
          <p className="mt-2 text-sm text-zinc-600">No user exists for id: {id}</p>
          <Link href="/admin/users" className="mt-4 inline-flex text-sm text-zinc-600 hover:text-zinc-900">
            Back to Users
          </Link>
        </section>
      </section>
    );
  }

  const [jobs, totalJobs, enabledJobs] = await Promise.all([
    prisma.job.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, enabled: true, createdAt: true, updatedAt: true, nextRunAt: true },
    }),
    prisma.job.count({ where: { userId: id } }),
    prisma.job.count({ where: { userId: id, enabled: true } }),
  ]);

  return (
    <section className="content-shell py-10">
      <section className="surface-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">User</h1>
            <p className="mt-1 text-sm text-zinc-600">{user.email ?? user.name ?? user.id}</p>
          </div>
          <Link href="/admin/users" className="text-sm text-zinc-600 transition hover:text-zinc-900">
            Back to Users
          </Link>
        </div>

        <div className="mt-5 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
          <p className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">Provider: {String(user.provider)}</p>
          <p className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">Created: {user.createdAt.toISOString().slice(0, 10)}</p>
          <p className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">Role: {String(user.role)}</p>
          <p className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">Total jobs: {totalJobs}</p>
          <p className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">Enabled jobs: {enabledJobs}</p>
        </div>

        <RoleEditor userId={user.id} initialRole={user.role === "admin" ? "admin" : "user"} />

        <PlanEditor
          userId={user.id}
          initialPlan={user.plan === "pro" ? "pro" : "free"}
          initialOverrides={{
            enabledJobsLimit: user.overrideEnabledJobsLimit,
            totalJobsLimit: user.overrideTotalJobsLimit,
            dailyRunLimit: user.overrideDailyRunLimit,
          }}
        />

        <h2 className="mt-8 text-sm font-semibold text-zinc-900">Jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No jobs.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs text-zinc-500">
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium">Name</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium">Enabled</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium">Next run</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="text-zinc-900">
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{job.name}</span>
                        <span className="text-xs text-zinc-500">{job.id}</span>
                      </div>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{job.enabled ? "yes" : "no"}</td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{job.nextRunAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{job.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
