// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Fly deployment package', () => {
  it('runs the production-only Colyseus server as an unprivileged user', async () => {
    const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8')
    expect(dockerfile).toContain('npm ci --omit=dev')
    expect(dockerfile).toContain('COPY server ./server')
    expect(dockerfile).toContain('COPY src/multiplayer/protocol.js')
    expect(dockerfile).toContain('USER node')
    expect(dockerfile).toContain('CMD ["npm", "run", "start:colyseus"]')
  })

  it('uses one small scale-to-zero Sydney machine with health checks', async () => {
    const config = await readFile(new URL('../fly.toml', import.meta.url), 'utf8')
    expect(config).toContain('primary_region = "syd"')
    expect(config).toContain('auto_stop_machines = "stop"')
    expect(config).toContain('min_machines_running = 0')
    expect(config).toContain('type = "connections"')
    expect(config).toContain('path = "/health"')
    expect(config).toContain('memory = "256mb"')
  })
})
