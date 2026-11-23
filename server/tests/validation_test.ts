import { allowedIP, deviceSignals, hmacKey, parseIP, trustedIP } from '../supabase/functions/_shared/device.ts'
import { bodyBytes, HttpError, parseObject } from '../supabase/functions/_shared/http.ts'
import { derToRaw, verifyAdMob, verifyOfferwall } from '../supabase/functions/_shared/provider.ts'
import { deviceId, period, proofActions, validateSave } from '../supabase/functions/_shared/validation.ts'

const player = '6c64b170-f0af-4a51-8c59-797dc7c68abd'
const ticket = 'a964b170-f0af-4a51-8c59-797dc7c68abd'
const secret = 'a deliberately non-secret test key 12345'
const now = 1_800_000_000_000
const encoder = new TextEncoder()

function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

async function reject(fn: () => unknown, code: string) {
  try { await fn() } catch (error) {
    if (error instanceof HttpError && error.code === code) return
    throw error
  }
  throw new Error(`Expected ${code}`)
}

Deno.test('sinkron menerima pecahan dan menolak pemalsuan angka, ukuran, dan jenis aksi', async () => {
  const valid = { request_id: ticket, revision: 4, coins: 3.5, save: { highest: 12, coins: 3.5 }, actions: [] }
  equal(validateSave(valid).p_coins, 3.5)
  equal(validateSave(valid).p_save, { highest: 12 })
  await reject(() => validateSave({ ...valid, save: { installation: player } }), 'unsupported_save_field')
  await reject(() => validateSave({ ...valid, save: { coins: 99 } }), 'conflicting_coins')
  await reject(() => validateSave({ ...valid, save: { board: [12] } }), 'invalid_save_array')
  for (const coins of [NaN, Infinity, -1, '50', Number.MAX_SAFE_INTEGER + 1]) {
    await reject(() => validateSave({ ...valid, coins }), 'invalid_coins')
  }
  for (const revision of [-1, 2.2, '4', Number.MAX_SAFE_INTEGER]) {
    await reject(() => validateSave({ ...valid, revision }), 'invalid_integer')
  }
  equal(proofActions([{ type: 'spawn', to: 0, level: 12, rare: true }, { type: 'move', from: 0, to: 29 }]), [
    { type: 'spawn', to: 0 }, { type: 'move', from: 0, to: 29 },
  ])
  await reject(() => proofActions([{ type: 'score', to: 0 }]), 'invalid_action_or_scope')
  await reject(() => proofActions([{ type: 'spawn', to: 30 }]), 'invalid_integer')
  await reject(() => proofActions(Array(129).fill({ type: 'spawn', to: 1 })), 'invalid_actions')
  await reject(() => bodyBytes(new Request('https://test.invalid/', { method: 'POST', body: '12345' }), 4), 'body_too_large')
  await reject(() => parseObject(encoder.encode('null')), 'invalid_json')
  await reject(() => parseObject(encoder.encode('{')), 'invalid_json')
})

Deno.test('tanggal periode, installation ID, subnet IPv4/IPv6 dan allowlist divalidasi', async () => {
  equal(period('2028-02-29'), '2028-02-29')
  for (const date of ['2026-02-29', '2026-11-31', '0000-01-01']) await reject(() => period(date), 'invalid_period')
  await reject(() => period('2026-01-01T00:00Z'), 'invalid_field')
  equal(deviceId(player.toUpperCase()), player)
  await reject(() => deviceId(player.replace('-4a51-', '-1a51-')), 'invalid_field')
  const ipv4 = parseIP('192.0.2.26')
  equal(ipv4, [192, 0, 2, 26])
  equal(parseIP('::ffff:c000:021a'), ipv4)
  equal(parseIP('::ffff:192.0.2.26'), ipv4)
  equal(parseIP('2001:db8::abcd')?.length, 16)
  for (const address of ['192.0.2.026', '999.0.0.1', '1.2.3.4, 5.6.7.8', '2001:::1', 'fe80::1%eno1']) {
    equal(parseIP(address), null)
  }
  equal(allowedIP(ipv4, '192.0.2.0/24,2001:db8::/64'), true)
  equal(allowedIP(parseIP('2001:db8::abcd'), '2001:db8::/64'), true)
  equal(allowedIP(ipv4, '192.0.2.128/25'), false)
  equal(allowedIP(null, '192.0.2.26'), false)
  equal(allowedIP(null, ''), true)
  await reject(() => allowedIP(ipv4, '192.0.2.26/33'), 'invalid_ip_allowlist')
  const request = new Request('https://test.invalid/', { headers: { 'x-forwarded-for': '192.0.2.26' } })
  equal(trustedIP(request, undefined), null)
})

Deno.test('sinyal memakai hash terpisah dan menyamakan perangkat/subnet yang sama', async () => {
  const a = await deviceSignals(secret, player, ' SAMPLE Agent ', parseIP('192.0.2.10'))
  const b = await deviceSignals(secret, player, 'sample agent', parseIP('192.0.2.255'))
  equal(a, b)
  const v6a = await deviceSignals(secret, player, null, parseIP('2001:db8:aa:bb::1'))
  const v6b = await deviceSignals(secret, player, null, parseIP('2001:db8:aa:bb::f00d'))
  equal(v6a, v6b)
  const changed = await deviceSignals(secret + '!', player, 'sample agent', parseIP('192.0.2.10'))
  equal(changed.p_device === a.p_device, false)
  equal(Object.values(a).every(value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)), true)
  equal((await deviceSignals(secret, ticket, player, null)).p_subnet, null)
  await reject(() => deviceSignals('weak', player, null, null), 'server_not_configured')
})

function der(raw: Uint8Array) {
  const components = [raw.subarray(0, 32), raw.subarray(32)]
  const integers = components.flatMap(value => {
    let bytes = Array.from(value)
    while (bytes.length > 1 && bytes[0] === 0) bytes = bytes.slice(1)
    if (bytes[0] >= 128) bytes.unshift(0)
    return [2, bytes.length, ...bytes]
  })
  return Uint8Array.from([0x30, integers.length, ...integers])
}

Deno.test('AdMob memverifikasi ECDSA P-256 dengan format Tink dan menolak callback curang', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
  const config = { unit: '1234', item: 'game points', amount: '10' }
  const getKey = async (id: string) => id === '777' ? pair.publicKey : undefined
  const prefix = 'ad_network=45&ad_unit=1234&custom_data=' + ticket
    + '&reward_amount=10&reward_item=game%20points&timestamp=' + now + '&transaction_id=abcd&user_id=' + player
  async function signed(query: string) {
    const bytes = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey,
      encoder.encode(decodeURIComponent(query))))
    equal([...derToRaw(der(bytes))], [...bytes])
    const signature = btoa(String.fromCharCode(...der(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
    return `https://test.invalid/?${query}&signature=${signature}&key_id=777`
  }
  const callback = await signed(prefix)
  equal(await verifyAdMob(callback, config, getKey, now), {
    p_user: player, p_ticket: ticket, p_event: 'abcd', p_occurred: new Date(now).toISOString(),
  })
  const micros = await signed(prefix.replace(String(now), String(now * 1000)))
  equal((await verifyAdMob(micros, config, getKey, now)).p_occurred, new Date(now).toISOString())
  await reject(() => verifyAdMob(callback.replace('abcd', 'abce'), config, getKey, now), 'invalid_signature')
  await reject(() => verifyAdMob(callback.replace('key_id=777', 'key_id=776'), config, getKey, now), 'invalid_signature')
  await reject(() => verifyAdMob(callback.replace('ad_unit=1234', 'ad_unit=9999'), config, getKey, now), 'unexpected_ad_reward')
  await reject(() => verifyAdMob(callback, config, getKey, now + 8 * 86_400_000), 'expired_callback')
  await reject(() => verifyAdMob(callback + '&extra=1', config, getKey, now), 'malformed_callback')
  await reject(() => verifyAdMob(callback.replace('&signature=', '&transaction_id=abc&signature='), config, getKey, now),
    'malformed_callback')
  await reject(() => verifyAdMob(callback.replace('game%20points', 'game%26points'), config, getKey, now), 'malformed_callback')
  await reject(() => derToRaw(Uint8Array.from([0x30, 6, 2, 1, 0x80, 2, 1, 3])), 'invalid_ecdsa_der')
})

Deno.test('HMAC offerwall melindungi byte mentah dan menolak tanda tangan maupun timestamp palsu', async () => {
  const data = '{"offer_id":"alpha","transaction_id":"one"}'
  const stamp = String(now / 1000)
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(stamp + '.' + data)))
  const hex = Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('')
  await verifyOfferwall(secret, stamp, hex, encoder.encode(data), now)
  await reject(() => verifyOfferwall(secret, stamp, hex, encoder.encode(data + ' '), now), 'invalid_signature')
  await reject(() => verifyOfferwall(secret, stamp, hex, encoder.encode(data), now + 301_000), 'expired_callback')
  await reject(() => verifyOfferwall(secret, stamp, '0'.repeat(64), encoder.encode(data), now), 'invalid_signature')
  await reject(() => verifyOfferwall(secret, null, hex, encoder.encode(data), now), 'expired_callback')
})
