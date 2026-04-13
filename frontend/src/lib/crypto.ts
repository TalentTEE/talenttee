import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';

/**
 * Derive a 32-byte session key via X25519 ECDH + HKDF-SHA256.
 * Mirrors backend CryptoService.deriveSessionKey exactly.
 */
export function deriveSessionKey(
  myEd25519Secret: Uint8Array,
  theirEd25519Public: Uint8Array,
  nonce: string,
): Uint8Array {
  // Ed25519 → Curve25519 (Montgomery form) conversion
  const myX25519Priv = ed25519.utils.toMontgomerySecret(myEd25519Secret.subarray(0, 32));
  const theirX25519Pub = ed25519.utils.toMontgomery(theirEd25519Public);

  // X25519 ECDH shared secret
  const sharedSecret = x25519.getSharedSecret(myX25519Priv, theirX25519Pub);

  // HKDF-SHA256 key derivation
  const salt = new TextEncoder().encode(nonce);
  const info = new TextEncoder().encode('negotiation');
  return hkdf(sha256, sharedSecret, salt, info, 32);
}

/**
 * Decrypt XChaCha20-Poly1305 ciphertext.
 * Input format: [24-byte nonce][ciphertext+tag]
 */
export function decrypt(sessionKey: Uint8Array, ciphertext: Uint8Array): string {
  const nonce = ciphertext.subarray(0, 24);
  const cipher = xchacha20poly1305(sessionKey, nonce);
  return new TextDecoder().decode(cipher.decrypt(ciphertext.subarray(24)));
}

/**
 * Full decryption pipeline: derive session key → decrypt encrypted data.
 * Returns the parsed agent response object.
 */
export function decryptNegotiationRound<T = unknown>(
  mySecretKeyBytes: Uint8Array,
  serverPublicKeyBytes: Uint8Array,
  nonce: string,
  encryptedDataBase64: string,
): T {
  const sessionKey = deriveSessionKey(mySecretKeyBytes, serverPublicKeyBytes, nonce);

  // Decode base64 → Uint8Array
  const binaryStr = atob(encryptedDataBase64);
  const ciphertext = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    ciphertext[i] = binaryStr.charCodeAt(i);
  }

  const plaintext = decrypt(sessionKey, ciphertext);
  return JSON.parse(plaintext) as T;
}
