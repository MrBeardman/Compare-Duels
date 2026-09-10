import type { Platform, AdType } from './types'
import { mockPlatform } from './mock'

// Minimal typing of the parts of the CrazyGames SDK v3 we use. https://docs.crazygames.com/sdk/html5/
interface CGSDK {
  init(): Promise<void>
  game: { gameplayStart(): void; gameplayStop(): void; inviteLink(p: Record<string, string>): string }
  ad: {
    requestAd(type: AdType, cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }): void
    hasAdblock(): Promise<boolean>
  }
  data: { getItem(k: string): string | null; setItem(k: string, v: string): void }
}
declare global { interface Window { CrazyGames?: { SDK: CGSDK } } }

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true
    s.onload = () => res(); s.onerror = () => rej(new Error('sdk load failed')); document.head.appendChild(s)
  })
}

let sdk: CGSDK | null = null
const listeners = { onAdStart: [] as (() => void)[], onAdEnd: [] as (() => void)[] }
export const adEvents = {
  onAdStart(fn: () => void) { listeners.onAdStart.push(fn) },
  onAdEnd(fn: () => void) { listeners.onAdEnd.push(fn) },
}

export const crazyGamesPlatform: Platform = {
  name: 'crazygames',
  async init() {
    await loadScript(SDK_URL)
    if (!window.CrazyGames) throw new Error('CrazyGames SDK missing')
    sdk = window.CrazyGames.SDK
    await sdk.init()
  },
  gameplayStart() { sdk?.game.gameplayStart() },
  gameplayStop() { sdk?.game.gameplayStop() },
  requestAd(type) {
    return new Promise(res => {
      if (!sdk) return res(false)
      sdk.ad.requestAd(type, {
        adStarted: () => listeners.onAdStart.forEach(f => f()),
        adFinished: () => { listeners.onAdEnd.forEach(f => f()); res(true) },
        adError: () => { listeners.onAdEnd.forEach(f => f()); res(false) },
      })
    })
  },
  hasAdblock: () => sdk ? sdk.ad.hasAdblock() : Promise.resolve(false),
  getData<T>(key: string): T | null {
    try { const v = sdk?.data.getItem(key); return v ? (JSON.parse(v) as T) : mockPlatform.getData<T>(key) } catch { return null }
  },
  setData<T>(key: string, value: T) {
    try { sdk?.data.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
    mockPlatform.setData(key, value)
  },
  inviteLink: (p) => sdk ? sdk.game.inviteLink(p) : mockPlatform.inviteLink(p),
  isTouch: mockPlatform.isTouch,
}

/** Pick the platform: CrazyGames when embedded there, mock otherwise (falls back to mock if the SDK fails). */
export async function createPlatform(): Promise<Platform> {
  const onCG = /crazygames\.|1001juegos|crazygames\.com/.test(location.hostname) || new URLSearchParams(location.search).has('cg')
  if (!onCG) return mockPlatform
  try { await crazyGamesPlatform.init(); return crazyGamesPlatform } catch { return mockPlatform }
}
