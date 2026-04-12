import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../src/lib/crypto.js";

describe("crypto", () => {
  const testKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("encrypts and decrypts a string", () => {
    const plaintext = "847293";
    const encrypted = encrypt(plaintext, testKey);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(":"); // iv:ciphertext:tag format
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext", () => {
    const plaintext = "847293";
    const a = encrypt(plaintext, testKey);
    const b = encrypt(plaintext, testKey);
    expect(a).not.toBe(b); // different IVs
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("test", testKey);
    const parts = encrypted.split(":");
    // Flip bytes in the encrypted data portion
    const flipped = parts[1]
      .split("")
      .map((c) => (c === "0" ? "f" : "0"))
      .join("");
    const tampered = `${parts[0]}:${flipped}:${parts[2]}`;
    expect(() => decrypt(tampered, testKey)).toThrow();
  });
});
