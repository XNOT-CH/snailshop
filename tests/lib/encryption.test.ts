import { describe, it, expect, vi, beforeEach } from "vitest";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

// Set test encryption key (exactly 32 bytes)
beforeEach(() => {
  vi.stubEnv("ENCRYPTION_KEY", "");
  vi.stubEnv("NODE_ENV", "development");
});

describe("encryption utilities", () => {
  describe("encrypt/decrypt", () => {
    it("encrypts and decrypts text correctly", () => {
      const plaintext = "hello world";
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(":");

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertexts for same input (random IV)", () => {
      const plaintext = "same text";
      const enc1 = encrypt(plaintext);
      const enc2 = encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it("handles empty string", () => {
      const encrypted = encrypt("");
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe("");
    });

    it("handles unicode text", () => {
      const text = "สวัสดีครับ 🎮";
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(text);
    });

    it("handles long text", () => {
      const text = "x".repeat(10000);
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(text);
    });
  });

  describe("decrypt fallback", () => {
    it("returns original text if not encrypted", () => {
      expect(decrypt("plain text without colons")).toBe("plain text without colons");
    });

    it("returns original text if decryption fails", () => {
      expect(decrypt("aa:bb:cc")).toBe("aa:bb:cc");
    });
  });

  describe("isEncrypted", () => {
    it("returns false for plain text", () => {
      expect(isEncrypted("hello world")).toBe(false);
    });

    it("returns false for text with wrong colon format", () => {
      expect(isEncrypted("a:b:c")).toBe(false);
    });

    it("returns false for non-hex parts", () => {
      expect(isEncrypted("not-hex:also-not-hex")).toBe(false);
    });

    it("returns true for properly formatted encrypted text", () => {
      // 32 char hex IV : hex payload
      const fakeEncrypted = "a".repeat(32) + ":" + "b".repeat(16);
      expect(isEncrypted(fakeEncrypted)).toBe(true);
    });
  });
});
