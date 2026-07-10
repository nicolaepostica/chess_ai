// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { DepthBadge } from './DepthBadge'

it('shows progress towards the requested depth', () => {
  render(<DepthBadge reached={12} target={18} />)
  expect(screen.getByTestId('depth-badge')).toHaveTextContent('depth 12/18')
})

it('shows a dash while the engine has not reported a depth yet', () => {
  render(<DepthBadge reached={0} target={18} />)
  expect(screen.getByTestId('depth-badge')).toHaveTextContent('depth —/18')
})

it('does not exceed the target when the engine overshoots', () => {
  render(<DepthBadge reached={20} target={18} />)
  expect(screen.getByTestId('depth-badge')).toHaveTextContent('depth 18/18')
})
