import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL does not auto-clean up under vitest unless globals are enabled. Each
// component test renders into the same document, so clear the DOM between tests
// or queries like getByTestId become ambiguous.
afterEach(() => {
  cleanup()
})
