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

/**
 * Suppress React 16.8 act() warnings globally.
 * The React team's fix won't be out of alpha until 16.9.0.
 *
 * See <https://github.com/facebook/react/issues/14769#issuecomment-514589856>
 */
export const suppressReact16Dot8ActWarningsGlobally = () => {
  const consoleError = console.error
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      if (
        !args[0].includes(
          'Warning: An update to %s inside a test was not wrapped in act',
        )
      ) {
        consoleError(...args)
      }
    })
  })
}
