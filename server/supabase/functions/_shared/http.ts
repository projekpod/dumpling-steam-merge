export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
}

export function route(methods: readonly string[], run: (request: Request) => Promise<unknown>) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    try {
      if (!methods.includes(request.method)) throw new HttpError(405, 'method_not_allowed')
      return Response.json(await run(request), { headers })
    } catch (error) {
      const fault = error instanceof HttpError ? error : new HttpError(500, 'internal_error')
      return Response.json({ error: fault.code }, { status: fault.status, headers })
    }
  }
}

export async function bodyBytes(request: Request, max: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!request.body) throw new HttpError(400, 'body_required')
  if (Number(request.headers.get('content-length')) > max) throw new HttpError(413, 'body_too_large')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > max) {
        void reader.cancel().catch(() => {})
        throw new HttpError(413, 'body_too_large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const output = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'invalid_object')
  }
  return value as Record<string, unknown>
}

export function parseObject(bytes: Uint8Array): Record<string, unknown> {
  try {
    return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } catch {
    throw new HttpError(400, 'invalid_json')
  }
}

export async function json(request: Request, max = 4096) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new HttpError(415, 'json_required')
  }
  return parseObject(await bodyBytes(request, max))
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new HttpError(503, 'server_not_configured')
  return value
}
