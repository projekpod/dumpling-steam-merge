import { HttpError, requireEnv } from './http.ts'
import { uuid } from './validation.ts'

function supabaseUrl(path: string): string {
  return requireEnv('SUPABASE_URL').replace(/\/$/, '') + path
}

export async function authenticate(request: Request): Promise<string> {
  const authorization = request.headers.get('authorization')
  if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/i.test(authorization)) {
    throw new HttpError(401, 'sign_in_required')
  }
  const response = await fetch(supabaseUrl('/auth/v1/user'), {
    headers: { authorization, apikey: requireEnv('SUPABASE_ANON_KEY') },
    signal: AbortSignal.timeout(5000),
  })
  if (response.status === 401 || response.status === 403) throw new HttpError(401, 'invalid_session')
  if (!response.ok) throw new HttpError(503, 'auth_unavailable')
  return uuid((await response.json()).id)
}

export async function rpc<T = unknown>(identifier: `mochi_${string}`, parameters: Record<string, unknown>): Promise<T> {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const response = await fetch(supabaseUrl('/rest/v1/rpc/' + identifier), {
    method: 'POST',
    headers: { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify(parameters),
  })
  if (response.ok) return await response.json() as T
  const error = await response.json().catch(() => null)
  if (typeof error?.code === 'string' && /^PT(400|403|404|409|422)$/.test(error.code) &&
      typeof error.message === 'string' && /^[a-z0-9_]+$/.test(error.message)) {
    throw new HttpError(Number(error.code.slice(2)), error.message)
  }
  throw new HttpError(503, 'database_unavailable')
}

export async function limit(user: string, action: string, attempts: number, seconds: number) {
  const allowed = await rpc<boolean>('mochi_take_limit', {
    p_user: user, p_action: action, p_max: attempts, p_window: seconds,
  })
  if (!allowed) throw new HttpError(429, 'rate_limited')
}

export function checkProviderResult(result: { status: string }) {
  if (result.status === 'rate_limited') throw new HttpError(429, 'rate_limited')
  return result
}
