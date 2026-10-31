import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Criptografia de campos sensíveis (anotações privadas) com AES-256-GCM.
 * Formato: v1.<iv>.<tag>.<ciphertext> (base64url).
 */
function key(): Buffer {
  const k = Buffer.from(serverEnv().MIRA_ENCRYPTION_KEY, 'base64');
  if (k.length !== 32) throw new Error('MIRA_ENCRYPTION_KEY precisa ter 32 bytes.');
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}

export function decrypt(payload: string | null | undefined): string {
  if (!payload) return '';
  const [v, iv, tag, data] = payload.split('.');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Formato de dado criptografado inválido.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
