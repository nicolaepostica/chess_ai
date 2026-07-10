// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { PositionInput } from './PositionInput'

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'

it('loads a valid FEN', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('FEN'), MATE_IN_ONE)
  await userEvent.click(screen.getByRole('button', { name: 'Load FEN' }))

  expect(onLoad).toHaveBeenCalledTimes(1)
  expect(onLoad.mock.calls[0][0].fen()).toBe(MATE_IN_ONE)
})

it('shows an error for an invalid FEN and does not load it', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('FEN'), 'garbage')
  await userEvent.click(screen.getByRole('button', { name: 'Load FEN' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Invalid FEN')
  expect(onLoad).not.toHaveBeenCalled()
})

it('loads a valid PGN', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('PGN'), '1. e4 e5 2. Nf3')
  await userEvent.click(screen.getByRole('button', { name: 'Load PGN' }))

  expect(onLoad).toHaveBeenCalledTimes(1)
  expect(onLoad.mock.calls[0][0].history()).toEqual(['e4', 'e5', 'Nf3'])
})

it('shows an error for an unparsable PGN', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('PGN'), '1. Qxq9 ##')
  await userEvent.click(screen.getByRole('button', { name: 'Load PGN' }))

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(onLoad).not.toHaveBeenCalled()
})
