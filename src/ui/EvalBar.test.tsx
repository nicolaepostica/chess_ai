// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { EvalBar, formatScore, readoutOnFill, whiteWinProbability } from './EvalBar'

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

it('puts the readout on the fill when White owns the bottom of the bar', () => {
  expect(readoutOnFill(1, 'white')).toBe(true)
  expect(readoutOnFill(0.5, 'white')).toBe(true)
})

it('keeps the readout off the fill when White has collapsed', () => {
  expect(readoutOnFill(0, 'white')).toBe(false)
  expect(readoutOnFill(0.01, 'white')).toBe(false)
})

it('flips the rule when the board is oriented for Black', () => {
  expect(readoutOnFill(0.5, 'black')).toBe(false)
  expect(readoutOnFill(1, 'black')).toBe(true)
})

it('colours the readout light when it does not sit on the fill', () => {
  render(<EvalBar score={{ type: 'mate', value: -1 }} orientation="white" />)
  expect(screen.getByTestId('eval-bar').querySelector('span')).toHaveClass('text-fg')
})

it('colours the readout dark when it sits on the fill', () => {
  render(<EvalBar score={{ type: 'mate', value: 1 }} orientation="white" />)
  expect(screen.getByTestId('eval-bar').querySelector('span')).toHaveClass('text-bg')
})
