import _ from 'lodash'
import React from 'react'
import * as rtl from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as testUtils from 'utils/test-utils'
import * as accountsTestUtils from 'utils/accounts-test-utils'

import PendingRequests from 'pages/Admin/Accounts/PendingRequests'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountService from 'services/accounts'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

jest.mock('services/accounts')

//: remove when React 16.9 is released
testUtils.suppressReact16Dot8ActWarningsGlobally()

afterEach(rtl.cleanup)

const renderPage = () => testUtils.renderWithRouter(<PendingRequests />)

describe('PendingRequests page', () => {
  it('renders', async () => {
    AccountService.fetchPendingRequestAccounts = jest.fn().mockResolvedValue([])
    const page = renderPage()
    expect(page.baseElement).toBeTruthy()
  })

  it('initially shows the loading state', async () => {
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockReturnValue(new Promise(() => {}))

    const page = renderPage()
    expect(
      page.queryAllByTestId(AccountsTable.ACCOUNT_ROW_PLACEHOLDER_TESTID),
    ).not.toHaveLength(0)
  })

  it('shows the accounts after loading', async () => {
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    _.take(MOCK_ACCOUNTS, AccountsTable.DEFAULT_PAGE_SIZE).forEach(
      ({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, page.baseElement),
    )
  })

  it('orders pages for all accounts', async () => {
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const pagination = page.getByRole('navigation')

    const page1Button = rtl.queryByText(pagination, '1')
    expect(page1Button).not.toBeNull()

    const page16Button = rtl.queryByText(pagination, '16')
    expect(page16Button).not.toBeNull()
    rtl.fireEvent.click(page16Button)
    accountsTestUtils.expectEmailIn('150@example.com', page.baseElement)
  })

  it('orders accounts by email address', async () => {
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    const emailAddressHeader = rtl.getByText(table, 'Email address')
    rtl.fireEvent.click(emailAddressHeader)

    // Check that first page is correct
    _(MOCK_ACCOUNTS)
      .orderBy(['EmailAddress'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )

    // Check that last page is correct
    const pagination = page.getByRole('navigation')
    const lastPageButton = rtl.getByLabelText(pagination, 'Last item')
    rtl.fireEvent.click(lastPageButton)
    _(MOCK_ACCOUNTS)
      .orderBy(['EmailAddress'])
      .drop(
        Math.floor(MOCK_ACCOUNTS.length / AccountsTable.DEFAULT_PAGE_SIZE) *
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
    _(MOCK_ACCOUNTS)
      .orderBy(['EmailAddress'], ['desc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )
  })

  it('orders accounts by date requested', async () => {
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    const dateRegisteredHeader = rtl.getByText(table, 'Date requested')
    rtl.fireEvent.click(dateRegisteredHeader)

    // Check that first page is correct
    _(MOCK_ACCOUNTS)
      .orderBy(['DateRequested'], ['asc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )
  })

  it('filters accounts by email address', async () => {
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)

    rtl.fireEvent.change(filterInput, { target: { value: '1' } })
    _(MOCK_ACCOUNTS)
      .filter(({ EmailAddress }) => EmailAddress.includes('1'))
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )

    rtl.fireEvent.change(filterInput, { target: { value: '90' } })
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

  it('denies multiple accounts', async () => {
    const deletedEmails = []
    AccountService.fetchPendingRequestAccounts = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          MOCK_ACCOUNTS.filter(
            account =>
              !deletedEmails.some(
                deletedEmail => account.EmailAddress === deletedEmail,
              ),
          ),
        ),
      )
    AccountService.denyAccountRequestByUserId = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)

    // Select and delete 3@example.com
    const targetCell1 = rtl.getByText(table, '3@example.com')
    rtl.fireEvent.click(targetCell1)

    const denyButton = page.getByText('Deny')
    expect(denyButton.disabled).toEqual(false)
    rtl.fireEvent.click(denyButton)

    let modal = rtl
      .getByText(document, 'Confirm request denial')
      .closest('.modal')
    let confirmDenyButton = rtl.getByText(modal, 'Deny')
    deletedEmails.push('3@example.com')
    rtl.fireEvent.click(confirmDenyButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    accountsTestUtils.expectEmailIn('0@example.com', table)
    expect(
      accountsTestUtils.queryByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        '3@example.com',
      ),
    ).toBeNull()

    // Select and delete 4@example.com
    expect(denyButton.disabled).toEqual(true)
    const targetCell2 = rtl.getByText(table, '4@example.com')
    rtl.fireEvent.click(targetCell2)
    expect(denyButton.disabled).toEqual(false)
    rtl.fireEvent.click(denyButton)

    modal = rtl.getByText(document, 'Confirm request denial').closest('.modal')
    await rtl.wait(() => rtl.getByText(modal, /4@example\.com/))
    deletedEmails.push('4@example.com')
    confirmDenyButton = rtl.getByText(modal, 'Deny')
    rtl.fireEvent.click(confirmDenyButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    expect(
      accountsTestUtils.queryByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        '3@example.com',
      ),
    ).toBeNull()
    expect(
      accountsTestUtils.queryByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        '4@example.com',
      ),
    ).toBeNull()
  })
})

const NUM_MOCK_ACCOUNTS = 157 // should be prime

const MOCK_DATES_REQUESTED = (() => {
  const now = Date.now()
  return _.range(NUM_MOCK_ACCOUNTS).map(
    index => new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000),
  )
})()

const MOCK_ACCOUNTS = (() => {
  return Array.from({ length: NUM_MOCK_ACCOUNTS }).map((_value, index) => {
    return {
      IdentityId: `identityId${index}`,
      UserId: `userId${index}`,
      EmailAddress: `${index}@example.com`,
      DateRequested: MOCK_DATES_REQUESTED[index],
    }
  })
})()
