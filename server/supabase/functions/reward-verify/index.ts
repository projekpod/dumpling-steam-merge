import { authenticate, checkProviderResult, limit, rpc } from '../_shared/database.ts'
import { registerDevice } from '../_shared/device.ts'
import { json, requireEnv, route } from '../_shared/http.ts'
import { googleKey, verifyAdMob } from '../_shared/provider.ts'
import { choice } from '../_shared/validation.ts'

export const handler = route(['GET', 'POST'], async request => {
  if (request.method === 'POST') {
    const user = await authenticate(request)
    await limit(user, 'ad_ticket', 10, 3600)
    const body = await json(request)
    choice(body.action, ['ticket'])
    const device = await registerDevice(request, user, body.device_id)
    return await rpc('mochi_ad_ticket', { p_user: user, p_device: device })
  }
  const verified = await verifyAdMob(request.url, {
    unit: requireEnv('ADMOB_SSV_AD_UNIT'), item: requireEnv('ADMOB_SSV_REWARD_ITEM'),
    amount: requireEnv('ADMOB_SSV_REWARD_AMOUNT'),
  }, googleKey, Date.now())
  return checkProviderResult(await rpc('mochi_credit_admob', verified))
})

if (import.meta.main) Deno.serve(handler)
