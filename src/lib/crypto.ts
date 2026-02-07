import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function keyFromEnv() {
  const raw = process.env.CHANNEL_SECRET_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error("CHANNEL_SECRET_KEY or NEXTAUTH_SECRET is required");
  }

  if (raw.length === 64 && /^[a-f0-9]+$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptString(value: string) {
  const iv = randomBytes(12);
  const key = keyFromEnv();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptString(value: string) {
  const [ivB64, tagB64, encryptedB64] = value.split(":");
  if (!ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid encrypted payload");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const key = keyFromEnv();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function maskSecret(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`;
}
