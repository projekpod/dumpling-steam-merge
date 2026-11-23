import { authenticate, limit, rpc } from '../_shared/database.ts'
import { registerDevice } from '../_shared/device.ts'
import { choice, validateSave } from '../_shared/validation.ts'
import { json, route } from '../_shared/http.ts'

export const handler = route(['GET', 'POST'], async request => {
  const user = await authenticate(request)
  if (request.method === 'GET') {
    await limit(user, 'save_read', 60, 60)
    return await rpc('mochi_read_save', { p_user: user })
  }
  await limit(user, 'save_sync', 30, 60)
  const body = await json(request, 65536)
  choice(body.action, ['save'])
  const data = validateSave(body)
  const device = await registerDevice(request, user, body.device_id)
  return await rpc('mochi_save_sync', { p_user: user, p_device: device, ...data })
})

if (import.meta.main) Deno.serve(handler)
