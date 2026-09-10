import type { Platform, AdType } from './types'

/** Dev/offline platform. Ads "play" for 800 ms and always succeed. */
export const mockPlatform: Platform = {
  name: 'mock',
  async init() {},
  gameplayStart() {},
  gameplayStop() {},
  async requestAd(_type: AdType) { await new Promise(r => setTimeout(r, 800)); return true },
  async hasAdblock() { return false },
  getData<T>(key: string): T | null {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null }
  },
  setData<T>(key: string, value: T) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  },
  inviteLink(params) {
    const u = new URL(location.href); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v)); return u.toString()
  },
  isTouch() { return typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches },
}
