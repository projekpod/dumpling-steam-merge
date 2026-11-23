import { authenticate, limit, rpc } from '../_shared/database.ts'
import { json, route } from '../_shared/http.ts'
import { choice, period, token } from '../_shared/validation.ts'

export const handler = route(['GET', 'POST'], async request => {
  const user = await authenticate(request)
  if (request.method === 'GET') {
    await limit(user, 'missions_read', 60, 60)
    return await rpc('mochi_missions', { p_user: user })
  }
  await limit(user, 'mission_claim', 10, 60)
  const body = await json(request)
  choice(body.action, ['claim'])
  return await rpc('mochi_claim_mission', {
    p_user: user, p_mission: token(body.mission_id, /^[a-z][a-z0-9-]{0,63}$/), p_period: period(body.period_start),
  })
})

if (import.meta.main) Deno.serve(handler)
