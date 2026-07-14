import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const loadWhyPage = () => {
  const html = readFileSync(join(process.cwd(), 'WHY.html'), 'utf8')
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/WHY.html',
  })
  const { window } = dom
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false })
  }
  const scriptSource = [...window.document.querySelectorAll('script')]
    .map((script) => script.textContent)
    .join('\n')
  window.eval(scriptSource)
  return window
}

describe('WHY.html interactive page', () => {
  it('boots without throwing and highlights code', () => {
    const window = loadWhyPage()
    expect(window.document.querySelectorAll('pre code.js .tok-kw').length).toBeGreaterThan(10)
    expect(window.document.querySelectorAll('pre code.js .tok-com').length).toBeGreaterThan(3)
  })

  it('populates the cost calculator on load and reacts to input', () => {
    const window = loadWhyPage()
    const raw = window.document.getElementById('costRaw')
    expect(raw.textContent).toBe('57,600') // 8 players * 20Hz * 60s * 6min
    expect(window.document.getElementById('costBilled').textContent).toBe('2,880')
    // Event-driven cadence: 8 players * 2.5Hz * 60s * 6min / 20 = 360
    expect(window.document.getElementById('costCadence').textContent).toBe('360 billed')
    const players = window.document.getElementById('costPlayers')
    players.value = '20'
    players.dispatchEvent(new window.Event('input'))
    expect(raw.textContent).toBe('144,000')
  })

  it('steps through the lobby flow', () => {
    const window = loadWhyPage()
    const next = window.document.getElementById('stepNext')
    next.click()
    next.click()
    const steps = window.document.querySelectorAll('#lobbyStepper li')
    expect(steps[0].className).toContain('done')
    expect(steps[1].className).toContain('current')
    window.document.getElementById('stepReset').click()
    expect(steps[0].className).not.toContain('done')
  })

  it('switches the before/after bug tabs', () => {
    const window = loadWhyPage()
    const tabs = window.document.querySelector('[data-tabs]')
    const buttons = tabs.querySelectorAll('.tab-row button')
    const panels = tabs.querySelectorAll('.tab-panel')
    buttons[1].click()
    expect(panels[0].className).not.toContain('active')
    expect(panels[1].className).toContain('active')
  })

  it('runs the juice demo without audio support and toggles the racer', () => {
    const window = loadWhyPage()
    window.document.getElementById('juiceShoot').click()
    expect(window.document.getElementById('juiceRacer').className).toContain('dead')
    expect(window.document.getElementById('juiceKo').className).toContain('on')
    window.document.getElementById('juiceReset').click()
    expect(window.document.getElementById('juiceRacer').className).not.toContain('dead')
  })

  it('starts and pauses the dead reckoning demo', () => {
    const window = loadWhyPage()
    const toggle = window.document.getElementById('drToggle')
    toggle.click()
    expect(toggle.textContent).toBe('Pause')
    toggle.click()
    expect(toggle.textContent).toBe('Start')
  })

  it('toggles the architecture diagram boxes', () => {
    const window = loadWhyPage()
    const box = window.document.querySelector('.arch-box')
    box.click()
    expect(box.className).toContain('open')
  })
})
