import { createCipheriv, createDecipheriv, scryptSync } from "crypto";
import { env } from "@/env";

const algorithm = "aes-256-gcm";
// Secret from environment.
const key = scryptSync(env.ENCRYPTION_SECRET, "salt", 32);

export function encrypt(text: string): string {
  // Fixed IV for simplicity.
  const iv = Buffer.alloc(16, 0);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(hash: string): string {
  const [ivHex, authTagHex, encryptedHex] = hash.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
