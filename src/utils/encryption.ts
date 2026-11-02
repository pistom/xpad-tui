import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/*
 * Encrypted note format, version 1
 * --------------------------------
 * Binary layout: [salt 16B][iv 16B][authTag 16B][ciphertext]
 *   - cipher: AES-256-GCM (16-byte auth tag)
 *   - key:    scrypt(password UTF-8, salt, N=16384, r=8, p=1, keyLen=32)
 *
 * In note files the binary blob is stored as ASCII armor (base64 wrapped at
 * 64 chars between BEGIN/END markers) so the file stays plain text and can be
 * synced via git and decrypted by other clients (e.g. Android).
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

const ARMOR_BEGIN = '-----BEGIN XPAD ENCRYPTED NOTE v1-----';
const ARMOR_END = '-----END XPAD ENCRYPTED NOTE-----';

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
}

/**
 * Encrypts text using AES-256-GCM with a password
 * Returns a buffer with format: [salt][iv][authTag][encryptedData]
 */
export function encryptText(text: string, password: string): Buffer {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypts buffer encrypted with encryptText
 * Throws error if password is incorrect or data is corrupted
 */
export function decryptText(encryptedBuffer: Buffer, password: string): string {
  if (encryptedBuffer.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }

  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(password, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed: incorrect password or corrupted data');
  }
}

/** Wraps an encrypted blob into text armor suitable for a note body. */
export function armor(data: Buffer): string {
  const b64 = data.toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return [ARMOR_BEGIN, ...lines, ARMOR_END, ''].join('\n');
}

/** Extracts the encrypted blob from text armor. */
export function dearmor(text: string): Buffer {
  const start = text.indexOf(ARMOR_BEGIN);
  const end = text.indexOf(ARMOR_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Invalid encrypted note: armor markers not found');
  }
  const b64 = text.slice(start + ARMOR_BEGIN.length, end).replace(/\s+/g, '');
  return Buffer.from(b64, 'base64');
}

export function encryptToArmor(text: string, password: string): string {
  return armor(encryptText(text, password));
}

export function decryptFromArmor(armored: string, password: string): string {
  return decryptText(dearmor(armored), password);
}
