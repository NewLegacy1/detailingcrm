/**
 * Server-only: encrypt/decrypt tokens at rest using AES-256-GCM.
 * Requires TOKEN_ENCRYPTION_SECRET (32+ chars).
 */

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_SECRET must be set and at least 32 characters')
  }
  const buf = Buffer.from(secret, 'utf8')
  if (buf.length >= KEY_LENGTH) return buf.subarray(0, KEY_LENGTH)
  return crypto.createHash('sha256').update(buf).digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH })
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const raw = Buffer.from(ciphertext, 'base64')
  if (raw.length < IV_LENGTH + TAG_LENGTH) throw new Error('Invalid ciphertext')
  const iv = raw.subarray(0, IV_LENGTH)
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const enc = raw.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)
  return decipher.update(enc) + decipher.final('utf8')
}
