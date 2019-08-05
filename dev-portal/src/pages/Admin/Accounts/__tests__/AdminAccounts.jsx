import _ from 'lodash'
import React from 'react'
import * as rtl from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as testUtils from 'utils/test-utils'
import * as AccountsTestUtils from 'utils/AccountsTestUtils'

import AdminAccounts from 'pages/Admin/Accounts/AdminAccounts'
import * as AccountService from 'services/accounts'

jest.mock('services/accounts')

// TODO: remove when React 16.9 is released
testUtils.suppressReact16Dot8ActWarningsGlobally()

afterEach(rtl.cleanup)

const renderPage = () => testUtils.renderWithRouter(<AdminAccounts />)

describe('AdminAccounts page', () => {
  it('renders', async () => {
    AccountService.fetchAdminAccounts = jest.fn().mockResolvedValue([])
    const page = renderPage()
    expect(page.baseElement).toBeTruthy()
  })

  it('initially shows the loading state', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockReturnValue(new Promise(() => {}))

    const page = renderPage()
    expect(page.queryAllByTestId('accountRowPlaceholder')).not.toHaveLength(0)
  })

  it('shows the accounts after loading', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)
    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)

    _.take(_.range(0, NUM_MOCK_ACCOUNTS, 10), 10).forEach(index =>
      AccountsTestUtils.expectEmailIn(`${index}@example.com`, page.baseElement),
    )
  })

  it('orders pages for all accounts', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)
    const pagination = page.getByRole('navigation')

    const page1Button = rtl.queryByText(pagination, '1')
    expect(page1Button).not.toBeNull()

    const page2Button = rtl.queryByText(pagination, '2')
    expect(page2Button).not.toBeNull()
    rtl.fireEvent.click(page2Button)
    AccountsTestUtils.expectEmailIn('150@example.com', page.baseElement)
  })

  it('orders accounts by email address', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId('accountsTable')
    const emailAddressHeader = rtl.getByText(table, 'Email address')
    rtl.fireEvent.click(emailAddressHeader)

    // Check that first page is correct
    ;[0, 100, 10, 110, 120, 130, 140, 150, 20, 30]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )

    // Check that last page is correct
    const pagination = page.getByRole('navigation')
    const lastPageButton = rtl.getByLabelText(pagination, 'Last item')
    rtl.fireEvent.click(lastPageButton)
    ;[40, 50, 60, 70, 80, 90]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )

    // Order descending, go back to first page
    rtl.fireEvent.click(emailAddressHeader)
    const firstPageButton = rtl.getByLabelText(pagination, 'First item')
    rtl.fireEvent.click(firstPageButton)

    // Check that first page is correct
    ;[90, 80, 70, 60, 50, 40, 30, 20, 150, 140]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )
  })

  it('orders accounts by date promoted', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId('accountsTable')
    const dateRegisteredHeader = rtl.getByText(table, 'Date promoted')
    rtl.fireEvent.click(dateRegisteredHeader)

    // Check that first page is correct
    ;[110, 60, 120, 70, 20, 130, 80, 30, 140, 90]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )
  })

  it('filters accounts by email address', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId('accountsTable')

    rtl.fireEvent.change(filterInput, { target: { value: '1' } })
    ;[110, 120, 130, 140, 150, 100, 10]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )

    rtl.fireEvent.change(filterInput, { target: { value: '9' } })
    rtl.getByText(table, '90@example.com')
    expect(
      AccountsTestUtils.queryAllByColumnText(
        table,
        'emailAddress',
        /@example\.com/,
      ),
    ).toHaveLength(1)
  })

  it('filters accounts by promoter email address', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const filterDropdown = page.getByTestId('filterDropdown')
    const table = page.getByTestId('accountsTable')

    rtl.fireEvent.click(filterDropdown)
    const filterByApiKeyIdOption = rtl.getByText(filterDropdown, 'Promoter')
    rtl.fireEvent.click(filterByApiKeyIdOption)

    rtl.fireEvent.change(filterInput, { target: { value: '20@example.com' } })
    ;[90, 100, 110]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )
    expect(
      AccountsTestUtils.queryAllByColumnText(
        table,
        'emailAddress',
        /@example\.com/,
      ),
    ).toHaveLength(3)

    rtl.fireEvent.change(filterInput, { target: { value: '30@example.com' } })
    expect(
      AccountsTestUtils.queryAllByColumnText(
        table,
        'emailAddress',
        /@example\.com/,
      ),
    ).toHaveLength(0)
  })

  it('filters accounts by promoter identity pool ID', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await AccountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const filterDropdown = page.getByTestId('filterDropdown')
    const table = page.getByTestId('accountsTable')

    rtl.fireEvent.click(filterDropdown)
    const filterByApiKeyIdOption = rtl.getByText(filterDropdown, 'Promoter')
    rtl.fireEvent.click(filterByApiKeyIdOption)

    rtl.fireEvent.change(filterInput, { target: { value: 'identityPoolId20' } })
    ;[90, 100, 110]
      .map(index => `${index}@example.com`)
      .forEach(emailAddress =>
        AccountsTestUtils.expectEmailIn(emailAddress, table),
      )
    expect(
      AccountsTestUtils.queryAllByColumnText(
        table,
        'emailAddress',
        /@example\.com/,
      ),
    ).toHaveLength(3)

    rtl.fireEvent.change(filterInput, { target: { value: 'identityPoolId30' } })
    expect(
      AccountsTestUtils.queryAllByColumnText(
        table,
        'emailAddress',
        /@example\.com/,
      ),
    ).toHaveLength(0)
  })
})

const NUM_MOCK_ACCOUNTS = 157 // should be prime

const MOCK_ACCOUNTS = (() => {
  const now = Date.now()
  const adminStep = 10
  return Array.from({ length: NUM_MOCK_ACCOUNTS }).map((_value, index) => {
    let promoter = null
    if (_.inRange(index, 20, 90)) {
      promoter = 10
    } else if (_.inRange(index, 90, 120)) {
      promoter = 20
    } else if (_.inRange(index, 120, NUM_MOCK_ACCOUNTS)) {
      promoter = 100
    }

    return {
      identityPoolId: `identityPoolId${index}`,
      userPoolId: `userPoolId${index}`,
      emailAddress: `${index}@example.com`,
      datePromoted:
        promoter &&
        new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000).toJSON(),
      promoterEmailAddress: promoter && `${promoter}@example.com`,
      promoterIdentityPoolId: promoter && `identityPoolId${promoter}`,
      isAdmin: index % adminStep === 0,
    }
  })
})()

const MOCK_ADMINS = () => MOCK_ACCOUNTS.filter(account => account.isAdmin)
