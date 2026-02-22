import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { prisma } from "@/lib/prisma";

export async function requireAdminUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });

  const isRoleAdmin = user?.role === "admin";
  const isAllowlisted = isAdminEmail(user?.email);
  if (!isRoleAdmin && !isAllowlisted) {
    throw new Error("Forbidden");
  }

  return userId;
}

export async function requireAdminPageAccess(options?: { callbackUrl?: string }) {
  try {
    await requireAdminUserId();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      const cb = options?.callbackUrl ?? "/admin";
      redirect(`/signin?callbackUrl=${encodeURIComponent(cb)}`);
    }
    redirect("/dashboard");
  }
}
