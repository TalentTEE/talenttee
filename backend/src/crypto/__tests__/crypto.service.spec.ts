import { Test } from '@nestjs/testing';
import { CryptoService } from '../crypto.service.js';
import nacl from 'tweetnacl';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get(CryptoService);
    service.onModuleInit();
  });

  describe('deriveSessionKey', () => {
    it('should produce a 32-byte key', () => {
      const alice = nacl.sign.keyPair();
      const bob = nacl.sign.keyPair();
      const key = service.deriveSessionKey(alice.secretKey, bob.publicKey, 'test-nonce');
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should be symmetric — same key from both sides', () => {
      const alice = nacl.sign.keyPair();
      const bob = nacl.sign.keyPair();
      const nonce = 'session-123';
      const keyAB = service.deriveSessionKey(alice.secretKey, bob.publicKey, nonce);
      const keyBA = service.deriveSessionKey(bob.secretKey, alice.publicKey, nonce);
      expect(Buffer.from(keyAB).toString('hex')).toBe(Buffer.from(keyBA).toString('hex'));
    });

    it('should produce different keys for different nonces', () => {
      const alice = nacl.sign.keyPair();
      const bob = nacl.sign.keyPair();
      const key1 = service.deriveSessionKey(alice.secretKey, bob.publicKey, 'nonce-1');
      const key2 = service.deriveSessionKey(alice.secretKey, bob.publicKey, 'nonce-2');
      expect(Buffer.from(key1).toString('hex')).not.toBe(Buffer.from(key2).toString('hex'));
    });
  });

  describe('encrypt / decrypt', () => {
    it('should round-trip plaintext correctly', () => {
      const alice = nacl.sign.keyPair();
      const bob = nacl.sign.keyPair();
      const key = service.deriveSessionKey(alice.secretKey, bob.publicKey, 'nonce');
      const plaintext = '{"salary": 70000000, "decision": "COUNTER"}';
      const encrypted = service.encrypt(key, plaintext);
      const decrypted = service.decrypt(key, encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random nonce)', () => {
      const key = service.deriveSessionKey(
        nacl.sign.keyPair().secretKey,
        nacl.sign.keyPair().publicKey,
        'n',
      );
      const ct1 = service.encrypt(key, 'hello');
      const ct2 = service.encrypt(key, 'hello');
      expect(ct1.toString('hex')).not.toBe(ct2.toString('hex'));
    });

    it('should fail to decrypt with wrong key', () => {
      const key1 = service.deriveSessionKey(
        nacl.sign.keyPair().secretKey,
        nacl.sign.keyPair().publicKey,
        'n1',
      );
      const key2 = service.deriveSessionKey(
        nacl.sign.keyPair().secretKey,
        nacl.sign.keyPair().publicKey,
        'n2',
      );
      const encrypted = service.encrypt(key1, 'secret');
      expect(() => service.decrypt(key2, encrypted)).toThrow();
    });
  });

  describe('deriveServerSessionKey', () => {
    it('should use server keypair internally', () => {
      const user = nacl.sign.keyPair();
      const key = service.deriveServerSessionKey(user.publicKey, 'session-nonce');
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });
  });
});
