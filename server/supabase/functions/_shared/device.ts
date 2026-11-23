import { rpc } from './database.ts'
import { HttpError, requireEnv } from './http.ts'
import { deviceId } from './validation.ts'

const utf8 = new TextEncoder()
const IPv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

export function parseIP(address: string): number[] | null {
  const ipv4 = IPv4.exec(address)
  if (ipv4) {
    const parts = ipv4.slice(1)
    return parts.every(part => Number(part) <= 255 && String(Number(part)) === part)
      ? parts.map(Number) : null
  }
  if (!/^[a-f0-9:.]+$/i.test(address) || !address.includes(':')) return null
  if (address.includes('.')) {
    const lastColon = address.lastIndexOf(':')
    const tail = parseIP(address.slice(lastColon + 1))
    if (!tail || tail.length !== 4) return null
    const pair = [(tail[0] << 8) + tail[1], (tail[2] << 8) + tail[3]].map(part => part.toString(16))
    address = address.slice(0, lastColon + 1) + pair.join(':')
  }
  const sections = address.split('::')
  if (sections.length > 2) return null
  const split = (part: string) => part === '' ? [] : part.split(':')
  const left = split(sections[0])
  const right = sections.length === 2 ? split(sections[1]) : []
  const missing = 8 - left.length - right.length
  if (sections.length === 2 ? missing < 1 : missing !== 0) return null
  const words = [...left, ...Array<string>(missing).fill('0'), ...right]
  if (!words.every(part => /^[a-f0-9]{1,4}$/i.test(part))) return null
  const binary = words.flatMap(part => {
    const n = Number.parseInt(part, 16)
    return [n >> 8, n & 255]
  })
  // Normalize IPv4-mapped IPv6, including the non-dotted representation.
  if (binary.slice(0, 10).every(byte => byte === 0) && binary[10] === 255 && binary[11] === 255) {
    return binary.slice(12)
  }
  return binary
}

export function trustedIP(request: Request, name: string | undefined): number[] | null {
  if (!name) return null
  const value = request.headers.get(name)
  return value ? parseIP(value.trim()) : null
}

export function allowedIP(address: number[] | null, allowlist: string): boolean {
  if (!allowlist.trim()) return true
  return allowlist.split(',').map(entry => {
    const [source, bits, ...rest] = entry.trim().split('/')
    const network = parseIP(source)
    if (!network || rest.length || (bits !== undefined && !/^\d{1,3}$/.test(bits))) {
      throw new HttpError(503, 'invalid_ip_allowlist')
    }
    const length = bits === undefined ? network.length * 8 : Number(bits)
    if (length > network.length * 8) throw new HttpError(503, 'invalid_ip_allowlist')
    return { network, length }
  }).some(({ network, length }) => address?.length === network.length &&
    network.every((byte, i) => {
      const bits = Math.min(8, Math.max(0, length - i * 8))
      return (byte >> (8 - bits)) === (address[i] >> (8 - bits))
    }))
}

export async function hmacKey(secret: string) {
  if (utf8.encode(secret).length < 32) throw new HttpError(503, 'server_not_configured')
  return await crypto.subtle.importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify'])
}

export async function deviceSignals(secret: string, installation: unknown, agent: string | null, ip: number[] | null) {
  const key = await hmacKey(secret)
  async function hash(value: string) {
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8.encode(value)))
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  const normalizedAgent = agent?.trim().slice(0, 512).toLowerCase()
  const prefix = ip?.slice(0, ip.length === 4 ? 3 : 8)
  const [device, ua, subnet] = await Promise.all([
    hash('device:' + deviceId(installation)),
    normalizedAgent ? hash('user-agent:' + normalizedAgent) : null,
    ip && prefix ? hash(`subnet:${ip.length}:${prefix.join('.')}`) : null,
  ])
  return { p_device: device, p_agent: ua, p_subnet: subnet }
}

export async function registerDevice(request: Request, user: string, installation: unknown): Promise<string> {
  const signals = await deviceSignals(requireEnv('MOCHI_DEVICE_HASH_KEY'), installation,
    request.headers.get('user-agent'), trustedIP(request, Deno.env.get('MOCHI_TRUSTED_IP_HEADER')))
  if (!await rpc<boolean>('mochi_register_device', { p_user: user, ...signals })) {
    throw new HttpError(403, 'device_limit_reached')
  }
  return signals.p_device
}
