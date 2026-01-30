import { encrypt, decrypt, encryptIfConfigured, decryptIfConfigured } from "./encryption.js";

const HEX_KEY_32 = "0".repeat(64); // 32 bytes in hex

describe("encryption", () => {
  beforeEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe("encryptIfConfigured / decryptIfConfigured without key", () => {
    it("returns plaintext when ENCRYPTION_KEY is not set", () => {
      expect(encryptIfConfigured("secret")).toBe("secret");
      expect(decryptIfConfigured("secret")).toBe("secret");
    });
  });

  describe("with ENCRYPTION_KEY set", () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = HEX_KEY_32;
    });

    it("encrypts and decrypts round-trip", () => {
      const plain = "access_token_123";
      const cipher = encrypt(plain);
      expect(cipher).not.toBe(plain);
      expect(decrypt(cipher)).toBe(plain);
    });

    it("encryptIfConfigured encrypts when key is set", () => {
      const plain = "refresh_token_456";
      const cipher = encryptIfConfigured(plain);
      expect(cipher).not.toBe(plain);
      expect(decryptIfConfigured(cipher)).toBe(plain);
    });

    it("decrypt throws on invalid ciphertext (too short)", () => {
      expect(() => decrypt("YWJj")).toThrow("Invalid ciphertext: too short");
    });

    it("decrypt throws on invalid base64/corrupted", () => {
      const validCipher = encrypt("x");
      const bad = validCipher.slice(0, -2) + "!!";
      expect(() => decrypt(bad)).toThrow();
    });
  });
});
