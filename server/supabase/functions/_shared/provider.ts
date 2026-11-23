import { hmacKey } from './device.ts'
import { HttpError } from './http.ts'
import { token, uuid } from './validation.ts'

const encoder = new TextEncoder()
const GOOGLE_KEYS = 'https://www.gstatic.com/admob/reward/verifier-keys.json'
const CACHE_MS = 12 * 60 * 60 * 1000
const REFRESH_INTERVAL = 60_000
const SSV_AGE = 7 * 24 * 60 * 60 * 1000

function base64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) throw new HttpError(400, 'invalid_signature_encoding')
  try {
    return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
  } catch {
    throw new HttpError(400, 'invalid_signature_encoding')
  }
}

// Google sends DER-encoded P-256 integers. Web Crypto consumes a 64-byte r || s.
export function derToRaw(signature: Uint8Array): Uint8Array<ArrayBuffer> {
  function bad(): never { throw new HttpError(400, 'invalid_ecdsa_der') }
  if (signature.length < 8 || signature.length > 72 || signature[0] !== 0x30 ||
      signature[1] !== signature.length - 2) return bad()
  const output = new Uint8Array(64)
  let offset = 2
  for (let i = 0; i < 2; i++) {
    if (signature[offset++] !== 0x02) return bad()
    const length = signature[offset++]
    if (!length || length > 33 || offset + length > signature.length) return bad()
    let bytes = signature.subarray(offset, offset + length)
    if (bytes[0] === 0 && length > 1) {
      if (bytes[1] < 0x80) return bad()
      bytes = bytes.subarray(1)
    } else if (bytes[0] >= 0x80) return bad()
    if (bytes.length > 32 || bytes.every(byte => byte === 0)) return bad()
    output.set(bytes, (i + 1) * 32 - bytes.length)
    offset += length
  }
  if (offset !== signature.length) return bad()
  return output
}

function decode(value: string) {
  try { return decodeURIComponent(value) } catch {
    throw new HttpError(400, 'malformed_callback')
  }
}

let keyCache = new Map<string, CryptoKey>()
let lastFetch = -Infinity
let freshUntil = 0
let refresh: Promise<void> | undefined

async function fetchGoogleKeys() {
  const response = await fetch(GOOGLE_KEYS, { signal: AbortSignal.timeout(5000), redirect: 'error' })
  if (!response.ok) throw new HttpError(503, 'google_keys_unavailable')
  const payload = await response.json()
  if (!Array.isArray(payload.keys) || payload.keys.length < 1 || payload.keys.length > 32) {
    throw new HttpError(503, 'google_keys_unavailable')
  }
  const keys = new Map<string, CryptoKey>()
  for (const entry of payload.keys) {
    const id = token(String(entry.keyId), /^\d{1,10}$/)
    const bytes = base64(token(entry.base64, /^[A-Za-z0-9+/=]{1,512}$/))
    const key = await crypto.subtle.importKey('spki', bytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    keys.set(id, key)
  }
  keyCache = keys
  freshUntil = Date.now() + CACHE_MS
}

export async function googleKey(id: string): Promise<CryptoKey | undefined> {
  const now = Date.now()
  if (freshUntil > now && keyCache.has(id)) return keyCache.get(id)
  if (!refresh && now - lastFetch >= REFRESH_INTERVAL) {
    lastFetch = now
    refresh = fetchGoogleKeys().catch(() => {
      throw new HttpError(503, 'google_keys_unavailable')
    }).finally(() => { refresh = undefined })
  }
  if (refresh) await refresh
  if (freshUntil <= now) throw new HttpError(503, 'google_keys_unavailable')
  return keyCache.get(id)
}

export async function verifyAdMob(
  url: string,
  config: { unit: string; item: string; amount: string },
  getKey: (id: string) => Promise<CryptoKey | undefined>,
  now: number,
) {
  const query = new URL(url).search.slice(1)
  if (query.length > 4096) throw new HttpError(400, 'malformed_callback')
  const parts = /^(.*)&signature=([^&]+)&key_id=(\d{1,10})$/.exec(query)
  if (!parts) throw new HttpError(400, 'malformed_callback')
  const [, signed, encodedSignature, id] = parts
  const fields = new Map<string, string>()
  for (const parameter of signed.split('&')) {
    const pair = /^([a-z_]+)=([^&]*)$/.exec(parameter)
    if (!pair || fields.has(pair[1]) || ['signature', 'key_id'].includes(pair[1])) {
      throw new HttpError(400, 'malformed_callback')
    }
    const value = decode(pair[2])
    // Prevent encoded delimiters from changing the parsed meaning of Tink's decoded query.
    if (/[&=#\u0000-\u001f\u007f]/.test(value)) throw new HttpError(400, 'malformed_callback')
    fields.set(pair[1], value)
  }
  if (fields.get('ad_unit') !== config.unit || fields.get('reward_item') !== config.item ||
      fields.get('reward_amount') !== config.amount) throw new HttpError(403, 'unexpected_ad_reward')
  const user = uuid(fields.get('user_id'))
  const ticket = uuid(fields.get('custom_data'))
  const event = token(fields.get('transaction_id'), /^[0-9a-f]{1,128}$/i).toLowerCase()
  const stamp = token(fields.get('timestamp'), /^(?:\d{13}|\d{16})$/)
  const ms = stamp.length === 16 ? Math.floor(Number(stamp) / 1000) : Number(stamp)
  if (ms < now - SSV_AGE || ms > now + 120_000) throw new HttpError(403, 'expired_callback')
  const raw = derToRaw(base64(decode(encodedSignature)))
  const key = await getKey(id)
  // Tink's java.net.URI.getQuery() percent-decodes the query without converting '+' to spaces.
  if (!key || !await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, raw, encoder.encode(decode(signed)))) {
    throw new HttpError(403, 'invalid_signature')
  }
  return { p_user: user, p_ticket: ticket, p_event: event, p_occurred: new Date(ms).toISOString() }
}

export async function verifyOfferwall(
  secret: string, timestamp: string | null, signature: string | null, bytes: Uint8Array<ArrayBuffer>, now: number,
) {
  if (!timestamp || !/^\d{10}$/.test(timestamp) || Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) {
    throw new HttpError(403, 'expired_callback')
  }
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) throw new HttpError(403, 'invalid_signature')
  const prefix = encoder.encode(timestamp + '.')
  const message = new Uint8Array(prefix.length + bytes.length)
  message.set(prefix)
  message.set(bytes, prefix.length)
  const mac = Uint8Array.from(signature.match(/../g)!, value => Number.parseInt(value, 16))
  if (!await crypto.subtle.verify('HMAC', await hmacKey(secret), mac, message)) {
    throw new HttpError(403, 'invalid_signature')
  }
}
