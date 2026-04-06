import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

describe("lib/encryption", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENCRYPTION_KEY = "gamestore-secret-key-12345678901"; // 32 bytes
    delete process.env.ENCRYPTION_KEY_ID;
    delete process.env.ENCRYPTION_PREVIOUS_KEYS;
  });

  it("encrypts and decrypts correctly (GCM)", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const secret = "my top secret data";
    
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(":")).toHaveLength(5); // v1:kid:iv:encrypted:tag
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("returns original text on decryption failure", async () => {
    const { decrypt } = await import("@/lib/encryption");
    const fakeData = "not-encrypted-data";
    expect(decrypt(fakeData)).toBe(fakeData);
    
    // Invalid encrypted format
    expect(decrypt("invalid:hex:parts")).toBe("invalid:hex:parts");
  });

  it("throws in production without ENCRYPTION_KEY", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ENCRYPTION_KEY;

    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY environment variable is required in production/);
    
    vi.unstubAllEnvs(); // Reset
  });

  it("throws if ENCRYPTION_KEY is wrong length", async () => {
    process.env.ENCRYPTION_KEY = "short";

    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY must be 32 bytes/);
  });

  it("falls back to DEV_FALLBACK_KEY if no key provided in non-production", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt, decrypt } = await import("@/lib/encryption");
    
    const encrypted = encrypt("test");
    expect(decrypt(encrypted)).toBe("test");
  });

  describe("isEncrypted", () => {
    it("returns false for plain text", async () => {
      const { isEncrypted } = await import("@/lib/encryption");
      expect(isEncrypted("plain text")).toBe(false);
    });

    it("returns false for invalid hex", async () => {
      const { isEncrypted } = await import("@/lib/encryption");
      expect(isEncrypted("invalid:hex")).toBe(false);
    });
    
    it("returns true for valid legacy CBC format", async () => {
      const { isEncrypted } = await import("@/lib/encryption");
      // 32 chars hex IV : hex body
      const fakeEncrypted = `${"a".repeat(32)}:1a2b3c`;
      expect(isEncrypted(fakeEncrypted)).toBe(true);
    });
  });
  
  it("decrypts legacy CBC format correctly", async () => {
    const { decrypt } = await import("@/lib/encryption");
    // Generate old CBC format manually for testing
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from("gamestore-secret-key-12345678901"), iv);
    let encrypted = cipher.update(Buffer.from("legacy data"));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const legacyEncryptedString = `${iv.toString("hex")}:${encrypted.toString("hex")}`;
    
    expect(decrypt(legacyEncryptedString)).toBe("legacy data");
  });

  it("decrypts kid-tagged payloads using previous keys", async () => {
    const oldKey = "0123456789abcdef0123456789abcdef";
    const newKey = "fedcba9876543210fedcba9876543210";
    process.env.ENCRYPTION_KEY = newKey;
    process.env.ENCRYPTION_KEY_ID = "current";
    process.env.ENCRYPTION_PREVIOUS_KEYS = `old=${oldKey}`;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(oldKey, "utf8"), iv);
    let encrypted = cipher.update("rotated secret", "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    const payload = `v1:old:${iv.toString("hex")}:${encrypted}:${authTag}`;

    const { decrypt } = await import("@/lib/encryption");
    expect(decrypt(payload)).toBe("rotated secret");
  });

  it("decrypts legacy v1 payloads by trying configured keys", async () => {
    const oldKey = "0123456789abcdef0123456789abcdef";
    const newKey = "fedcba9876543210fedcba9876543210";
    process.env.ENCRYPTION_KEY = newKey;
    process.env.ENCRYPTION_PREVIOUS_KEYS = `old=${oldKey}`;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(oldKey, "utf8"), iv);
    let encrypted = cipher.update("legacy secret", "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    const payload = `v1:${iv.toString("hex")}:${encrypted}:${authTag}`;

    const { decrypt } = await import("@/lib/encryption");
    expect(decrypt(payload)).toBe("legacy secret");
  });
});
