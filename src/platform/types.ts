export type AdType = 'midgame' | 'rewarded'

export interface Platform {
  readonly name: 'crazygames' | 'mock'
  init(): Promise<void>
  gameplayStart(): void
  gameplayStop(): void
  /** Resolves true if the ad finished (rewarded granted), false if unavailable/adblock/skipped. */
  requestAd(type: AdType): Promise<boolean>
  hasAdblock(): Promise<boolean>
  /** Cross-device persistent storage on CrazyGames; localStorage in the mock. */
  getData<T>(key: string): T | null
  setData<T>(key: string, value: T): void
  /** Share link for a ghost duel. */
  inviteLink(params: Record<string, string>): string
  isTouch(): boolean
}
