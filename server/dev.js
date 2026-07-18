import { spawn } from 'node:child_process'

const frontendCommand = process.platform === 'win32'
  ? [process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm run dev']]
  : ['npm', ['run', 'dev']]
const children = [
  spawn(frontendCommand[0], frontendCommand[1], { stdio: 'inherit' }),
  spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' }),
]

let stopping = false
const stop = signal => {
  if (stopping) {
    return
  }
  stopping = true
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

for (const child of children) {
  child.once('exit', code => {
    if (!stopping) {
      process.exitCode = code ?? 1
      stop('SIGTERM')
    }
  })
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))
