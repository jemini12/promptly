import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

function getUserIdFromSession(session: unknown): string | null {
  if (typeof session !== "object" || session === null || Array.isArray(session)) {
    return null;
  }
  const maybeUser = (session as Record<string, unknown>).user;
  if (typeof maybeUser !== "object" || maybeUser === null || Array.isArray(maybeUser)) {
    return null;
  }
  const id = (maybeUser as Record<string, unknown>).id;
  return typeof id === "string" && id.length ? id : null;
}

export async function requireUserId() {
  let session: unknown = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  const userId = getUserIdFromSession(session);
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
