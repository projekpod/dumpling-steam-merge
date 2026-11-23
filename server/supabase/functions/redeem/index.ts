import { authenticate, limit, rpc } from '../_shared/database.ts'
import { json, route } from '../_shared/http.ts'
import { choice, integer, uuid } from '../_shared/validation.ts'

export const handler = route(['GET', 'POST'], async request => {
  const user = await authenticate(request)
  if (request.method === 'GET') {
    await limit(user, 'wallet_read', 60, 60)
    return { points: await rpc('mochi_wallet', { p_user: user }) }
  }
  await limit(user, 'redeem', 4, 3600)
  const body = await json(request)
  choice(body.action, ['request'])
  return await rpc('mochi_redeem', {
    p_user: user, p_request: uuid(body.request_id), p_points: integer(body.points, 1, 1000000000),
  })
})

if (import.meta.main) Deno.serve(handler)
