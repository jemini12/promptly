function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseAdminEmails(value: string | undefined): Set<string> {
  if (!value) {
    return new Set();
  }

  const emails = value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map(normalizeEmail);

  return new Set(emails);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }
  const allowed = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (allowed.size === 0) {
    return false;
  }
  return allowed.has(normalizeEmail(email));
}
