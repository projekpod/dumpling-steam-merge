import { authenticate, limit, rpc } from '../_shared/database.ts'
import { json, route } from '../_shared/http.ts'
import { choice, integer } from '../_shared/validation.ts'

const scopes = ['weekly', 'all_time'] as const

export const handler = route(['GET', 'POST'], async request => {
  const user = await authenticate(request)
  if (request.method === 'GET') {
    await limit(user, 'leaderboard_read', 60, 60)
    const scope = choice(new URL(request.url).searchParams.get('scope'), scopes)
    return await rpc('mochi_leaderboard', { p_user: user, p_scope: scope })
  }
  await limit(user, 'score_submit', 10, 60)
  const body = await json(request)
  choice(body.action, ['submit'])
  return await rpc('mochi_leaderboard', {
    p_user: user, p_scope: choice(body.scope, scopes), p_score: integer(body.score, 1001, 12999),
  })
})

if (import.meta.main) Deno.serve(handler)
