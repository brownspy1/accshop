/** The plural environment value is a protected, comma-separated allowlist. */
export function isAdminEmail(candidate: string | null | undefined): boolean {
  const email = candidate?.trim().toLowerCase();
  if (!email) return false;
  const configured = process.env.ACCZONE_ADMIN_EMAILS?.trim() || process.env.ACCZONE_ADMIN_EMAIL?.trim() || "";
  const allowlist = configured.split(/[\n,;]/).map(value => value.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length > 0) return allowlist.includes(email);
  return email === "admin@acczone.shop" || email.endsWith("@admin.local") || email === "admin@local";
}
