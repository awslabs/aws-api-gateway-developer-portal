import React from 'react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { render } from '@testing-library/react'

if (typeof jest !== 'object') {
  console.warn('test-utils used outside of tests!')
}

/*
 * Wrapper around react-testing-library's `render` function, providing a dummy
 * Router. Implementation taken from the react-testing-library docs [1].
 *
 * [1]: https://testing-library.com/docs/example-react-router
 */
export const renderWithRouter = (
  ui,
  {
    route = '/',
    history = createMemoryHistory({ initialEntries: [route] }),
  } = {},
) => ({
  ...render(<Router history={history}>{ui}</Router>),
  history,
})

/**
 * Returns a Promise that resolves after `ms` milliseconds with the value `resolution`.
 */
export const resolveAfter = (ms, resolution) =>
  new Promise(resolve => setTimeout(() => resolve(resolution), ms))
