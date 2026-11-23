import { HttpError, object } from './http.ts'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const devicePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function uuid(value: unknown): string {
  return token(value, uuidPattern).toLowerCase()
}

export function deviceId(value: unknown): string {
  return token(value, devicePattern).toLowerCase()
}

export function token(value: unknown, pattern: RegExp): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new HttpError(400, 'invalid_field')
  return value
}

export function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new HttpError(400, 'invalid_integer')
  }
  return value
}

export function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.some(option => option === value)) {
    throw new HttpError(400, 'invalid_action_or_scope')
  }
  return value as T
}

export function period(value: unknown): string {
  const date = token(value, /^\d{4}-\d{2}-\d{2}$/)
  const time = new Date(date + 'T00:00:00Z')
  if (!Number.isFinite(time.getTime()) || time.toISOString().slice(0, 10) !== date || date.startsWith('0000')) {
    throw new HttpError(400, 'invalid_period')
  }
  return date
}

export type ProofAction = { type: 'spawn' | 'release'; to: number } | { type: 'move'; from: number; to: number }

export function proofActions(input: unknown): ProofAction[] {
  if (!Array.isArray(input) || input.length > 128) throw new HttpError(400, 'invalid_actions')
  return input.map(value => {
    const action = object(value)
    const type = choice(action.type, ['spawn', 'move', 'release'])
    const to = integer(action.to, 0, 29)
    return type === 'move' ? { type, from: integer(action.from, 0, 29), to } : { type, to }
  })
}

const counters: Record<string, [number, number]> = {
  version: [1, 5], highest: [0, 12], freeCharges: [0, 3],
  settledAt: [0, Number.MAX_SAFE_INTEGER], freeAt: [0, Number.MAX_SAFE_INTEGER],
  boostUntil: [0, Number.MAX_SAFE_INTEGER],
}
const upgrades = ['speed', 'capacity', 'bonus', 'magic', 'saver', 'free', 'special', 'squish']

function sequence(value: unknown, max: number, read: (item: unknown) => unknown, exact = true): unknown[] {
  if (!Array.isArray(value) || value.length > max || (exact && value.length !== max)) {
    throw new HttpError(400, 'invalid_save_array')
  }
  return value.map(read)
}

export function savePayload(data: unknown, coins: number): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(object(data))) {
    if (Object.hasOwn(counters, field)) {
      result[field] = integer(value, ...counters[field])
    } else if (field === 'board' || field === 'cells') {
      result[field] = sequence(value, 30, cell => integer(cell, 0, 12))
    } else if (field === 'variants') {
      result[field] = sequence(value, 30, item => choice(item, ['normal', 'glitter', 'rainbow', 'gold', 'pink']))
    } else if (field === 'discovered') {
      result[field] = sequence(value, 12, mask => integer(mask, 0, 31))
    } else if (field === 'squishedAt') {
      result[field] = sequence(value, 3, time => integer(time, 0, Number.MAX_SAFE_INTEGER), false)
    } else if (field === 'lastSpawnAt') {
      result[field] = value === null ? null : integer(value, 0, Number.MAX_SAFE_INTEGER)
    } else if (field === 'levels') {
      result[field] = Object.fromEntries(Object.entries(object(value)).map(([kind, level]) => [
        choice(kind, upgrades), integer(level, 0, kind === 'capacity' ? 18 : Number.MAX_SAFE_INTEGER),
      ]))
    } else if (field === 'coins') {
      if (value !== coins) throw new HttpError(400, 'conflicting_coins')
    } else {
      throw new HttpError(400, 'unsupported_save_field')
    }
  }
  return result
}

export function validateSave(body: Record<string, unknown>) {
  if (typeof body.coins !== 'number' || !Number.isFinite(body.coins) ||
      body.coins < 0 || body.coins > Number.MAX_SAFE_INTEGER) throw new HttpError(400, 'invalid_coins')
  return {
    p_request: uuid(body.request_id),
    p_revision: integer(body.revision, 0, Number.MAX_SAFE_INTEGER - 1),
    p_coins: body.coins,
    p_save: savePayload(body.save, body.coins),
    p_actions: proofActions(body.actions),
  }
}
