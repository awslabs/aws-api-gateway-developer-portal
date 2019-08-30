import _ from 'lodash'
import React from 'react'
import * as rtl from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as testUtils from 'utils/test-utils'
import * as accountsTestUtils from 'utils/accounts-test-utils'

import AdminAccounts from 'pages/Admin/Accounts/AdminAccounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountService from 'services/accounts'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

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
    expect(
      page.queryAllByTestId(AccountsTable.ACCOUNT_ROW_PLACEHOLDER_TESTID),
    ).not.toHaveLength(0)
  })

  it('shows the accounts after loading', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)
    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    _.take(MOCK_ADMINS, AccountsTable.DEFAULT_PAGE_SIZE).forEach(
      ({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, page.baseElement),
    )
  })

  it('orders pages for all accounts', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const pagination = page.getByRole('navigation')

    const page1Button = rtl.queryByText(pagination, '1')
    expect(page1Button).not.toBeNull()

    const page2Button = rtl.queryByText(pagination, '2')
    expect(page2Button).not.toBeNull()
    rtl.fireEvent.click(page2Button)
    accountsTestUtils.expectEmailIn('150@example.com', page.baseElement)
  })

  it('orders accounts by email address', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    const emailAddressHeader = rtl.getByText(table, 'Email address')
    rtl.fireEvent.click(emailAddressHeader)

    // Check that first page is correct
    _(MOCK_ADMINS)
      .orderBy(['EmailAddress'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )

    // Check that last page is correct
    const pagination = page.getByRole('navigation')
    const lastPageButton = rtl.getByLabelText(pagination, 'Last item')
    rtl.fireEvent.click(lastPageButton)
    _(MOCK_ADMINS)
      .orderBy(['EmailAddress'])
      .drop(
        Math.floor(MOCK_ADMINS.length / AccountsTable.DEFAULT_PAGE_SIZE) *
          AccountsTable.DEFAULT_PAGE_SIZE,
      )
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )

    // Order descending, go back to first page
    rtl.fireEvent.click(emailAddressHeader)
    const firstPageButton = rtl.getByLabelText(pagination, 'First item')
    rtl.fireEvent.click(firstPageButton)

    // Check that first page is correct
    _(MOCK_ADMINS)
      .orderBy(['EmailAddress'], ['desc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )
  })

  it('orders accounts by date promoted', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    const dateRegisteredHeader = rtl.getByText(table, 'Date promoted')
    rtl.fireEvent.click(dateRegisteredHeader)

    // Check that first page is correct
    _(MOCK_ADMINS)
      .orderBy(['DatePromoted'], ['asc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )
  })

  it('filters accounts by email address', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)

    rtl.fireEvent.change(filterInput, { target: { value: '1' } })
    _(MOCK_ADMINS)
      .filter(({ EmailAddress }) => EmailAddress.includes('1'))
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )

    rtl.fireEvent.change(filterInput, { target: { value: '9' } })
    expect(
      accountsTestUtils
        .queryAllByColumnText(
          table,
          AccountsTableColumns.EmailAddress.id,
          /@example\.com/,
        )
        .map(el => el.textContent),
    ).toEqual(['90@example.com'])
  })

  it('filters accounts by promoter email address', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const filterDropdown = page.getByTestId(
      AccountsTable.FILTER_DROPDOWN_TESTID,
    )
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)

    rtl.fireEvent.click(filterDropdown)
    const filterByApiKeyIdOption = rtl.getByText(filterDropdown, 'Promoter')
    rtl.fireEvent.click(filterByApiKeyIdOption)

    rtl.fireEvent.change(filterInput, { target: { value: '20@example.com' } })
    _(MOCK_ADMINS)
      .filter({ promoterEmailAddress: '20@example.com' })
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )
    expect(
      accountsTestUtils.queryAllByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        /@example\.com/,
      ),
    ).toHaveLength(3)

    rtl.fireEvent.change(filterInput, { target: { value: '30@example.com' } })
    expect(
      accountsTestUtils.queryAllByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        /@example\.com/,
      ),
    ).toHaveLength(0)
  })

  it('filters accounts by promoter user ID', async () => {
    AccountService.fetchAdminAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ADMINS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const filterDropdown = page.getByTestId(
      AccountsTable.FILTER_DROPDOWN_TESTID,
    )
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)

    rtl.fireEvent.click(filterDropdown)
    const filterByApiKeyIdOption = rtl.getByText(filterDropdown, 'Promoter')
    rtl.fireEvent.click(filterByApiKeyIdOption)

    rtl.fireEvent.change(filterInput, { target: { value: 'userId20' } })
    const expectedEmails = _(MOCK_ADMINS)
      .filter(({ PromoterUserId }) =>
        (PromoterUserId || '').includes('userId20'),
      )
      .map(({ EmailAddress }) => EmailAddress)
      .sortBy()
      .value()
    expect(
      _.sortBy(
        accountsTestUtils
          .queryAllByColumnText(
            table,
            AccountsTableColumns.EmailAddress.id,
            /@example\.com/,
          )
          .map(el => el.textContent),
      ),
    ).toEqual(expectedEmails)

    rtl.fireEvent.change(filterInput, { target: { value: 'userId30' } })
    expect(
      accountsTestUtils.queryAllByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        /@example\.com/,
      ),
    ).toHaveLength(0)
  })
})

const NUM_MOCK_ACCOUNTS = 157 // should be prime

const MOCK_PROMOTERS = _.range(NUM_MOCK_ACCOUNTS).map(index => {
  if (_.inRange(index, 20, 90)) {
    return 10
  } else if (_.inRange(index, 90, 120)) {
    return 20
  } else if (_.inRange(index, 120, NUM_MOCK_ACCOUNTS)) {
    return 100
  }
  return null
})

const MOCK_DATES_PROMOTED = (() => {
  const now = Date.now()
  return _.range(NUM_MOCK_ACCOUNTS).map(
    index =>
      MOCK_PROMOTERS[index] &&
      new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000),
  )
})()

const MOCK_ADMIN_STEP = 10

const MOCK_ACCOUNTS = _.range(0, NUM_MOCK_ACCOUNTS, MOCK_ADMIN_STEP).map(
  index => {
    const promoter = MOCK_PROMOTERS[index]
    return {
      IdentityId: `identityId${index}`,
      UserId: `userId${index}`,
      EmailAddress: `${index}@example.com`,
      DatePromoted: MOCK_DATES_PROMOTED[index],
      PromoterEmailAddress: promoter && `${promoter}@example.com`,
      PromoterUserId: promoter && `userId${promoter}`,
      isAdmin: index % MOCK_ADMIN_STEP === 0,
    }
  },
)

const MOCK_ADMINS = MOCK_ACCOUNTS.filter(account => account.isAdmin)
