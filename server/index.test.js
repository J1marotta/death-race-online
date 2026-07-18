import { afterEach, describe, expect, it } from 'vitest'
import { startGameServer } from './index.js'

let runningServer

afterEach(async () => {
  if (runningServer) {
    await runningServer.gameServer.gracefullyShutdown(false)
    runningServer = undefined
  }
})

describe('Colyseus server process', () => {
  it('starts on an available port and exposes a health endpoint', async () => {
    runningServer = await startGameServer({ port: 0 })
    const address = runningServer.transport.server.address()
    const response = await fetch(`http://127.0.0.1:${address.port}/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      service: 'death-race-colyseus',
    })
  })
})
