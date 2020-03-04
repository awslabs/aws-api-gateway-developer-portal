import React from 'react'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import { renderWithRouter } from 'utils/test-utils'

import { fragments } from 'services/get-fragments'

import { HomePage } from 'pages/Home'

beforeEach(() => {
  // Mock fragment
  fragments.Home = { jsx: () => <p>Home mock</p> }
})

afterEach(cleanup)

test('Page renders', async () => {
  const { baseElement } = renderWithRouter(<HomePage />)
  expect(baseElement).toBeTruthy()
})

test('Get Started link is visible', async () => {
  const rendered = renderWithRouter(<HomePage />)
  const gettingStartedLink = await rendered.findByTestId('gettingStartedLink')
  expect(gettingStartedLink).toBeVisible()
})
