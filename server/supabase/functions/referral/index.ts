import { authenticate, limit, rpc } from '../_shared/database.ts'
import { registerDevice } from '../_shared/device.ts'
import { json, route } from '../_shared/http.ts'
import { choice, token } from '../_shared/validation.ts'

export const handler = route(['POST'], async request => {
  const user = await authenticate(request)
  await limit(user, 'referral', 10, 60)
  const body = await json(request)
  const action = choice(body.action, ['create', 'apply', 'status'])
  if (action === 'status') return await rpc('mochi_referral_status', { p_user: user })
  const code = action === 'apply' ? token(body.code, /^[0-9a-f]{16}$/i).toUpperCase() : null
  await registerDevice(request, user, body.device_id)
  if (code === null) return await rpc('mochi_referral_code', { p_user: user })
  return await rpc('mochi_apply_referral', { p_user: user, p_code: code })
})

if (import.meta.main) Deno.serve(handler)
