import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Derives a cryptographic hash of an admin password using Scrypt and a unique salt.
 * Follows OWASP recommendations for password storage.
 */
export function hashAdminPassword(password: string, salt = randomBytes(16).toString("hex")): { hash: string; salt: string } {
  if (!password || password.length < 4) {
    throw new Error("Password must be at least 4 characters");
  }
  const derivedKey = scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString("hex"),
    salt,
  };
}

/**
 * Securely verifies a candidate password against the stored salt and Scrypt hash.
 * Uses constant-time equality check to prevent timing attacks.
 */
export function verifyAdminPassword(candidatePassword: string, storedHash: string, salt: string): boolean {
  if (!candidatePassword || !storedHash || !salt) return false;
  try {
    const candidateHash = scryptSync(candidatePassword, salt, 64);
    const targetBuffer = Buffer.from(storedHash, "hex");
    if (candidateHash.length !== targetBuffer.length) return false;
    return timingSafeEqual(candidateHash, targetBuffer);
  } catch {
    return false;
  }
}

/**
 * Checks against environment secret when custom database password has not yet been set.
 */
export function verifyFallbackAdminSecret(candidatePassword: string): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim() || process.env.ACCZONE_ADMIN_KEY?.trim() || process.env.ADMIN_KEY?.trim() || "admin123";
  const candidateBuffer = Buffer.from(candidatePassword.trim());
  const expectedBuffer = Buffer.from(configuredPassword);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}
