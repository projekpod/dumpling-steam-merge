import { handler as save } from '../supabase/functions/save-sync/index.ts'
import { handler as missions } from '../supabase/functions/missions/index.ts'
import { handler as leaderboard } from '../supabase/functions/leaderboard/index.ts'
import { handler as referral } from '../supabase/functions/referral/index.ts'
import { handler as ticket } from '../supabase/functions/reward-verify/index.ts'
import { handler as redeem } from '../supabase/functions/redeem/index.ts'
import { handler as offerwall } from '../supabase/functions/offerwall-postback/index.ts'

const player = '55c2b170-f0af-4a51-8c59-797dc7c68abd'
const impostor = '65c2b170-f0af-4a51-8c59-797dc7c68abd'
const base = 'https://test.invalid/'
const encoder = new TextEncoder()

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function post(body: Record<string, unknown>, authorized = true) {
  return new Request(base, { method: 'POST', headers: {
    'content-type': 'application/json',
    ...(authorized ? { authorization: 'Bearer test-session-token-01234' } : {}),
  }, body: JSON.stringify(body) })
}

Deno.test('handler HTTP tidak percaya user_id dan menerapkan deny, throttling serta error SQL', async () => {
  const calls: string[] = []
  const original = globalThis.fetch
  const env = {
    SUPABASE_URL: 'https://test.invalid',
    SUPABASE_ANON_KEY: 'test-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service',
    MOCHI_DEVICE_HASH_KEY: 'test-key-32-bytes-that-is-not-secret',
  }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, Deno.env.get(key)]))
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value)

  let deny = false
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    calls.push(url.pathname)
    const headers = new Headers(init?.headers)
    if (url.pathname === '/auth/v1/user') {
      same(headers.get('apikey'), 'test-anon')
      return Response.json({ id: player })
    }
    same(headers.get('authorization'), 'Bearer test-service')
    const body = JSON.parse(String(init?.body))
    same(body.p_user, player)
    if (url.pathname.endsWith('mochi_take_limit')) return Response.json(!deny)
    if (url.pathname.endsWith('mochi_register_device')) {
      if (!/^[0-9a-f]{64}$/.test(body.p_device) || JSON.stringify(body).includes(impostor)) {
        throw new Error('sent unhashed installation ID to Postgres')
      }
      return Response.json(true)
    }
    if (url.pathname.endsWith('mochi_save_sync')) same(body.p_actions, [{ type: 'spawn', to: 0 }])
    if (url.pathname.endsWith('mochi_claim_mission')) {
      return Response.json({ code: 'PT422', message: 'mission_not_claimable', details: 'must stay private' }, { status: 422 })
    }
    return Response.json({ ok: true })
  }
  try {
    for (const endpoint of [save, missions, leaderboard, referral, ticket, redeem]) {
      same((await endpoint(post({}, false))).status, 401)
    }
    same(calls.length, 0)
    const accepted = await save(post({
      action: 'save', user_id: impostor, device_id: impostor, revision: 0, coins: 0,
      save: {}, actions: [{ type: 'spawn', to: 0, level: 12 }], request_id: player,
    }))
    same(accepted.status, 200)
    same((await leaderboard(post({ action: 'submit', score: 12999, scope: 'wrong' }))).status, 400)
    same((await referral(post({ action: 'apply', device_id: impostor, code: 'bad code' }))).status, 400)
    same((await redeem(post({ action: 'request', points: -5, request_id: player }))).status, 400)
    const claim = await missions(post({ action: 'claim', mission_id: 'daily-merge', period_start: '2026-11-23', progress: 123 }))
    same(claim.status, 422)
    same(await claim.json(), { error: 'mission_not_claimable' })
    deny = true
    same((await redeem(post({ action: 'request', points: 5, request_id: player }))).status, 429)
    same(calls.some(path => path.endsWith('mochi_redeem')), false)
  } finally {
    globalThis.fetch = original
    for (const [key, value] of Object.entries(previous)) value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value)
  }
})

Deno.test('postback hanya membayar tarif offer di server, memakai IP tepercaya dan HMAC sebelum RPC', async () => {
  const original = globalThis.fetch
  const env = {
    SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-service',
    OFFERWALL_HMAC_SECRET: 'postback-signing-test-only-secret-32',
    OFFERWALL_REWARDS: '{"alpha":25}', OFFERWALL_IP_ALLOWLIST: '192.0.2.0/24', MOCHI_TRUSTED_IP_HEADER: 'x-test-ip',
  }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, Deno.env.get(key)]))
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value)
  let credits = 0
  globalThis.fetch = async (_input, init) => {
    same(JSON.parse(String(init?.body)), { p_user: player, p_source: 'offerwall', p_event: 'event-1', p_points: 25 })
    credits++
    return Response.json({ status: 'credited', points: 25 })
  }
  try {
    const body = JSON.stringify({ user_id: player, offer_id: 'alpha', transaction_id: 'event-1', points: 999999 })
    const timestamp = String(Math.floor(Date.now() / 1000))
    const key = await crypto.subtle.importKey('raw', encoder.encode(env.OFFERWALL_HMAC_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp + '.' + body)))
    const signature = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const request = (ip: string, signature: string) => new Request(base, { method: 'POST', body, headers: {
      'x-test-ip': ip, 'x-offerwall-timestamp': timestamp, 'x-offerwall-signature': signature,
    } })
    same((await offerwall(request('203.0.113.2', signature))).status, 403)
    same((await offerwall(request('192.0.2.2', '0'.repeat(64)))).status, 403)
    same(credits, 0)
    same((await offerwall(request('192.0.2.2', signature))).status, 200)
    same(credits, 1)
  } finally {
    globalThis.fetch = original
    for (const [key, value] of Object.entries(previous)) value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value)
  }
})
