import { checkProviderResult, rpc } from '../_shared/database.ts'
import { allowedIP, trustedIP } from '../_shared/device.ts'
import { bodyBytes, HttpError, object, parseObject, requireEnv, route } from '../_shared/http.ts'
import { verifyOfferwall } from '../_shared/provider.ts'
import { integer, token, uuid } from '../_shared/validation.ts'

export const handler = route(['POST'], async request => {
  const allowlist = Deno.env.get('OFFERWALL_IP_ALLOWLIST') ?? ''
  const source = trustedIP(request, Deno.env.get('MOCHI_TRUSTED_IP_HEADER'))
  if (!allowedIP(source, allowlist)) throw new HttpError(403, 'ip_not_allowed')
  const bytes = await bodyBytes(request, 16384)
  await verifyOfferwall(requireEnv('OFFERWALL_HMAC_SECRET'), request.headers.get('x-offerwall-timestamp'),
    request.headers.get('x-offerwall-signature'), bytes, Date.now())
  const body = parseObject(bytes)
  const offer = token(body.offer_id, /^[a-zA-Z0-9_-]{1,64}$/)
  const event = token(body.transaction_id, /^[a-zA-Z0-9._:-]{1,128}$/)
  const user = uuid(body.user_id)
  let configured: Record<string, unknown>
  try {
    configured = object(JSON.parse(requireEnv('OFFERWALL_REWARDS')))
  } catch {
    throw new HttpError(503, 'server_not_configured')
  }
  if (!Object.hasOwn(configured, offer)) throw new HttpError(403, 'unknown_offer')
  const points = integer(configured[offer], 1, 1000000)
  return checkProviderResult(await rpc('mochi_credit_provider', {
    p_user: user, p_source: 'offerwall', p_event: event, p_points: points,
  }))
})

if (import.meta.main) Deno.serve(handler)
