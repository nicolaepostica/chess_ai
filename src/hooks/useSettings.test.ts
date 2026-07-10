// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, useSettings } from './useSettings'

beforeEach(() => localStorage.clear())

it('starts from the defaults when storage is empty', () => {
  const { result } = renderHook(() => useSettings())
  expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
})

it('persists a patch to localStorage', () => {
  const { result } = renderHook(() => useSettings())
  act(() => result.current[1]({ depth: 22 }))
  expect(result.current[0].depth).toBe(22)
  expect(JSON.parse(localStorage.getItem('chess-analyzer:settings')!).depth).toBe(22)
})

it('restores persisted settings on mount', () => {
  localStorage.setItem('chess-analyzer:settings', JSON.stringify({ ...DEFAULT_SETTINGS, multiPV: 5 }))
  const { result } = renderHook(() => useSettings())
  expect(result.current[0].multiPV).toBe(5)
})

it('falls back to the defaults when storage holds garbage', () => {
  localStorage.setItem('chess-analyzer:settings', 'not json')
  const { result } = renderHook(() => useSettings())
  expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
})

it('clamps out-of-range values from storage', () => {
  localStorage.setItem('chess-analyzer:settings', JSON.stringify({ depth: 999, multiPV: 0, chess960: false }))
  const { result } = renderHook(() => useSettings())
  expect(result.current[0].depth).toBe(30)
  expect(result.current[0].multiPV).toBe(1)
})
