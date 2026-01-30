import crypto from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Set a 32-byte hex key or any string (will be hashed)."
    );
  }
  if (Buffer.isBuffer(raw)) return raw as unknown as Buffer;
  if (raw.length === KEY_LEN * 2 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/**
 * Encrypt a string for storage. IV and auth tag are prepended to the ciphertext.
 * In production, use a dedicated KMS (e.g. AWS KMS) for key management.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt a string produced by encrypt().
 */
export function decrypt(ciphertextBase64: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertextBase64, "base64");
  if (buf.length < IV_LEN + AUTH_TAG_LEN) {
    throw new Error("Invalid ciphertext: too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const authTag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

/**
 * If ENCRYPTION_KEY is not set, return plaintext (development). Otherwise encrypt.
 */
export function encryptIfConfigured(plaintext: string): string {
  if (!process.env.ENCRYPTION_KEY) return plaintext;
  return encrypt(plaintext);
}

/**
 * If value looks like our ciphertext (base64), decrypt. Otherwise return as-is.
 */
export function decryptIfConfigured(ciphertext: string): string {
  if (!process.env.ENCRYPTION_KEY) return ciphertext;
  try {
    const buf = Buffer.from(ciphertext, "base64");
    if (buf.length >= IV_LEN + AUTH_TAG_LEN) return decrypt(ciphertext);
  } catch {
    // not our ciphertext
  }
  return ciphertext;
}
