// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { EvalBar, formatScore, whiteWinProbability } from './EvalBar'

it('formats a centipawn score in pawns with a sign', () => {
  expect(formatScore({ type: 'cp', value: 616 })).toBe('+6.16')
  expect(formatScore({ type: 'cp', value: -34 })).toBe('-0.34')
  expect(formatScore({ type: 'cp', value: 0 })).toBe('0.00')
})

it('formats a mate score', () => {
  expect(formatScore({ type: 'mate', value: 1 })).toBe('M1')
  expect(formatScore({ type: 'mate', value: -3 })).toBe('-M3')
})

it('maps scores to a white win probability between 0 and 1', () => {
  expect(whiteWinProbability({ type: 'cp', value: 0 })).toBeCloseTo(0.5, 5)
  expect(whiteWinProbability({ type: 'mate', value: 2 })).toBe(1)
  expect(whiteWinProbability({ type: 'mate', value: -2 })).toBe(0)
  expect(whiteWinProbability({ type: 'cp', value: 300 })).toBeGreaterThan(0.7)
  expect(whiteWinProbability({ type: 'cp', value: -300 })).toBeLessThan(0.3)
})

it('renders a placeholder when there is no score yet', () => {
  render(<EvalBar score={null} orientation="white" />)
  expect(screen.getByTestId('eval-bar')).toHaveTextContent('…')
})

it('renders the score text', () => {
  render(<EvalBar score={{ type: 'cp', value: 50 }} orientation="white" />)
  expect(screen.getByTestId('eval-bar')).toHaveTextContent('+0.50')
})
