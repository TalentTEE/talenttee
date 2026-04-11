import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { randomBytes } from 'crypto';
import nacl from 'tweetnacl';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private serverKeyPair: nacl.SignKeyPair;

  onModuleInit() {
    this.serverKeyPair = nacl.sign.keyPair();
    // NOTE: Ephemeral keypair — 서버 재시작 시 소실, 기존 암호화 데이터 복호화 불가
    this.logger.log('Server Ed25519 keypair generated (ephemeral)');
  }

  getServerPublicKey(): Uint8Array {
    return this.serverKeyPair.publicKey;
  }

  /**
   * Ed25519 keypair → Curve25519 → X25519 ECDH → HKDF-SHA256 → 32-byte session key
   */
  deriveSessionKey(
    myEd25519Secret: Uint8Array,
    theirEd25519Public: Uint8Array,
    nonce: string,
  ): Uint8Array {
    const myX25519Priv = ed25519.utils.toMontgomerySecret(myEd25519Secret.subarray(0, 32));
    const theirX25519Pub = ed25519.utils.toMontgomery(theirEd25519Public);
    const sharedSecret = x25519.getSharedSecret(myX25519Priv, theirX25519Pub);
    const salt = new TextEncoder().encode(nonce);
    const info = new TextEncoder().encode('negotiation');
    return hkdf(sha256, sharedSecret, salt, info, 32);
  }

  /**
   * XChaCha20-Poly1305 encrypt. Returns [24-byte nonce][ciphertext+tag]
   */
  encrypt(sessionKey: Uint8Array, plaintext: string): Buffer {
    const nonce = randomBytes(24);
    const cipher = xchacha20poly1305(sessionKey, nonce);
    const ciphertext = cipher.encrypt(new TextEncoder().encode(plaintext));
    return Buffer.concat([Buffer.from(nonce), Buffer.from(ciphertext)]);
  }

  /**
   * XChaCha20-Poly1305 decrypt. Input: [24-byte nonce][ciphertext+tag]
   */
  decrypt(sessionKey: Uint8Array, ciphertext: Buffer): string {
    const nonce = ciphertext.subarray(0, 24);
    const cipher = xchacha20poly1305(sessionKey, nonce);
    return new TextDecoder().decode(cipher.decrypt(ciphertext.subarray(24)));
  }

  /** Derive session key using server's keypair */
  deriveServerSessionKey(theirEd25519Public: Uint8Array, nonce: string): Uint8Array {
    return this.deriveSessionKey(this.serverKeyPair.secretKey, theirEd25519Public, nonce);
  }
}
