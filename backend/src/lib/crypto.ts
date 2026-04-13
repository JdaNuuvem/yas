import { createCipheriv, createDecipheriv, randomBytes, createHmac } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decrypt(ciphertext: string, hexKey: string): string {
  const [ivHex, encryptedHex, tagHex] = ciphertext.split(":");
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

export function hashDeterministic(text: string, hexKey: string): string {
  // Uses HMAC-SHA256 with the system's AES key as salt to generate a 
  // deterministic, universally unique hash for exact-match searches.
  return createHmac("sha256", Buffer.from(hexKey, "hex")).update(text, "utf8").digest("hex");
}
