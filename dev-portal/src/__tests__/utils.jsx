import React from 'react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { render } from '@testing-library/react'

/*
 * Jest requires at least one test per file in __tests__.
 */
test('', () => {})

/*
 * Wrapper around react-testing-library's `render` function, providing a dummy
 * Router. Implementation taken from the react-testing-library docs [1].
 *
 * [1]: https://testing-library.com/docs/example-react-router
 */
export const renderWithRouter = (ui, {
  route = '/',
  history = createMemoryHistory({ initialEntries: [route] })
} = {}) => ({
  ...render(<Router history={history}>{ui}</Router>),
  history
})
