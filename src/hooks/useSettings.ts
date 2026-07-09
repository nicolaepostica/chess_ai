import { useCallback, useState } from 'react'
import type { AnalyzeOptions } from '../engine/engine'

const STORAGE_KEY = 'chess-analyzer:settings'

export const DEFAULT_SETTINGS: AnalyzeOptions = {
  depth: 18,
  multiPV: 3,
  chess960: false,
}

const LIMITS = {
  depth: { min: 1, max: 30 },
  multiPV: { min: 1, max: 5 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function sanitize(raw: unknown): AnalyzeOptions {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS
  const candidate = raw as Partial<AnalyzeOptions>
  return {
    depth: Number.isInteger(candidate.depth)
      ? clamp(candidate.depth!, LIMITS.depth.min, LIMITS.depth.max)
      : DEFAULT_SETTINGS.depth,
    multiPV: Number.isInteger(candidate.multiPV)
      ? clamp(candidate.multiPV!, LIMITS.multiPV.min, LIMITS.multiPV.max)
      : DEFAULT_SETTINGS.multiPV,
    chess960: typeof candidate.chess960 === 'boolean' ? candidate.chess960 : DEFAULT_SETTINGS.chess960,
  }
}

function read(): AnalyzeOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? sanitize(JSON.parse(stored)) : DEFAULT_SETTINGS
  } catch {
    // Corrupt JSON or unavailable storage is not a reason to crash.
    return DEFAULT_SETTINGS
  }
}

export function useSettings(): [AnalyzeOptions, (patch: Partial<AnalyzeOptions>) => void] {
  const [settings, setSettings] = useState<AnalyzeOptions>(read)

  const update = useCallback((patch: Partial<AnalyzeOptions>) => {
    setSettings((current) => {
      const next = sanitize({ ...current, ...patch })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Browser private mode. Settings simply won't survive a reload.
      }
      return next
    })
  }, [])

  return [settings, update]
}
