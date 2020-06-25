import _ from 'lodash'
import React from 'react'
import * as rtl from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as testUtils from 'utils/test-utils'
import * as accountsTestUtils from 'utils/accounts-test-utils'

import PendingInvites from 'pages/Admin/Accounts/PendingInvites'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountService from 'services/accounts'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

jest.mock('services/accounts')

//: remove when React 16.9 is released
testUtils.suppressReact16Dot8ActWarningsGlobally()

afterEach(rtl.cleanup)

const renderPage = () => testUtils.renderWithRouter(<PendingInvites />)

describe('PendingInvites page', () => {
  afterEach(() => {
    jest.useRealTimers()
  })
  
  it('renders', async () => {
    AccountService.fetchPendingInviteAccounts = jest.fn().mockResolvedValue([])
    const page = renderPage()
    expect(page.baseElement).toBeTruthy()
  })

  it('initially shows the loading state', async () => {
    AccountService.fetchPendingInviteAccounts = jest
      .fn()
      .mockReturnValue(new Promise(() => {}))

    const page = renderPage()
    expect(
      page.queryAllByTestId(AccountsTable.ACCOUNT_ROW_PLACEHOLDER_TESTID),
    ).not.toHaveLength(0)
  })

  it('shows the accounts after loading', async () => {
    AccountService.fetchPendingInviteAccounts = jest
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
    AccountService.fetchPendingInviteAccounts = jest
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
    AccountService.fetchPendingInviteAccounts = jest
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

  it('orders accounts by date invited', async () => {
    AccountService.fetchPendingInviteAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    const dateInvitedHeader = rtl.getByText(table, 'Date invited')
    rtl.fireEvent.click(dateInvitedHeader)

    // Check that first page is correct
    _(MOCK_ACCOUNTS)
      .orderBy(['DateInvited'], ['asc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )
  })

  it('filters accounts by email address', async () => {
    AccountService.fetchPendingInviteAccounts = jest
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

  it('filters accounts by inviter email address', async () => {
    AccountService.fetchPendingInviteAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const filterDropdown = page.getByTestId(
      AccountsTable.FILTER_DROPDOWN_TESTID,
    )
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)

    rtl.fireEvent.click(filterDropdown)
    const filterByInviterOption = rtl.getByText(filterDropdown, 'Inviter')
    rtl.fireEvent.click(filterByInviterOption)

    rtl.fireEvent.change(filterInput, { target: { value: '20@example.com' } })
    _(MOCK_ACCOUNTS)
      .filter({ inviterEmailAddress: '20@example.com' })
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ EmailAddress }) =>
        accountsTestUtils.expectEmailIn(EmailAddress, table),
      )

    rtl.fireEvent.change(filterInput, { target: { value: '30@example.com' } })
    expect(
      accountsTestUtils.queryAllByColumnText(
        table,
        'emailAddress',
        /@example\.com/,
      ),
    ).toHaveLength(0)
  })

  it('creates an invite', async () => {
    const createdAccounts = []
    AccountService.fetchPendingInviteAccounts = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve([...MOCK_ACCOUNTS, ...createdAccounts]),
      )
    AccountService.createInviteByEmail = jest
      .fn()
      .mockImplementation(emailAddress => {
        createdAccounts.push({
          IdentityId: `createdIdentityId${createdAccounts.length}`,
          UserId: `createdUserId${createdAccounts.length}`,
          EmailAddress: emailAddress,
          DateInvited: new Date(),
          InviterEmailAddress: 'you@example.com',
          InviterUserId: 'me',
        })
      })

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    const startCreateButton = page.getByText(/Create invite/)
    rtl.fireEvent.click(startCreateButton)
    const createModal = await rtl.waitForElement(() =>
      rtl.getByText(document, 'Create invite').closest('.modal'),
    )

    const emailInput = rtl.getByPlaceholderText(createModal, 'Email address')
    const confirmCreateButton = rtl
      .getAllByRole(createModal, 'button')
      .filter(el => el.textContent === 'Create')[0]
    expect(confirmCreateButton).toBeInTheDocument()

    rtl.fireEvent.change(emailInput, {
      target: { value: '000@example.com' },
    })
    rtl.fireEvent.click(confirmCreateButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    expect(
      page.getAllByText(
        (_content, element) =>
          element.textContent === 'Sent account invite to 000@example.com.',
      )[0],
    ).toBeInTheDocument()

    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    rtl.fireEvent.change(filterInput, { target: { value: '000' } })
    accountsTestUtils.expectEmailIn('000@example.com', table)
  })

  it('prevents creating an invite for an invalid email address', async () => {
    AccountService.fetchPendingInviteAccounts = jest.fn().mockResolvedValue([])

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    // Wait for the full page to render first, *then* enable the fake timers. (Otherwise, the test
    // will time out.)
    jest.useFakeTimers()

    const startCreateButton = page.getByText(/Create invite/)
    rtl.fireEvent.click(startCreateButton)
    console.error('run all timers'); jest.runAllTimers()
    const createModal = await rtl.waitForElement(() =>
      rtl.getByText(document, 'Create invite').closest('.modal'),
    )

    const emailInput = rtl.getByPlaceholderText(createModal, 'Email address')
    const confirmCreateButton = rtl
      .getAllByRole(createModal, 'button')
      .filter(el => el.textContent === 'Create')[0]
    expect(confirmCreateButton).toBeInTheDocument()

    const pleaseEnterAValidEmail = rtl.queryByText(
      createModal,
      'Please enter a valid email address.',
    )
    const pleaseEnterAValidEmailIsVisible = () =>
      !pleaseEnterAValidEmail.classList.contains('hidden')

    expect(confirmCreateButton.disabled).toBe(true)
    expect(pleaseEnterAValidEmailIsVisible()).toBe(false)

    rtl.fireEvent.change(emailInput, { target: { value: '000' } })
    console.error('run all timers'); jest.runAllTimers()
    expect(confirmCreateButton.disabled).toBe(true)
    expect(pleaseEnterAValidEmailIsVisible()).toBe(true)

    rtl.fireEvent.change(emailInput, { target: { value: '000@' } })
    console.error('run all timers'); jest.runAllTimers()
    expect(confirmCreateButton.disabled).toBe(true)
    expect(pleaseEnterAValidEmailIsVisible()).toBe(true)

    rtl.fireEvent.change(emailInput, { target: { value: '000@example.com' } })
    console.error('run all timers'); jest.runAllTimers()
    expect(confirmCreateButton.disabled).toBe(false)
    expect(pleaseEnterAValidEmailIsVisible()).toBe(false)

    rtl.fireEvent.change(emailInput, { target: { value: '000' } })
    console.error('run all timers'); jest.runAllTimers()
    expect(confirmCreateButton.disabled).toBe(true)
    expect(pleaseEnterAValidEmailIsVisible()).toBe(true)

    rtl.fireEvent.change(emailInput, { target: { value: '' } })
    console.error('run all timers'); jest.runAllTimers()
    expect(confirmCreateButton.disabled).toBe(true)
    expect(pleaseEnterAValidEmailIsVisible()).toBe(true)
  })

  it('shows a message when creation fails', async () => {
    AccountService.fetchPendingInviteAccounts = jest.fn().mockResolvedValue([])
    AccountService.createInviteByEmail = jest
      .fn()
      .mockRejectedValue(new Error('You must construct additional pylons'))

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    const startCreateButton = page.getByText(/Create invite/)
    rtl.fireEvent.click(startCreateButton)
    const createModal = await rtl.waitForElement(() =>
      rtl.getByText(document, 'Create invite').closest('.modal'),
    )

    const emailInput = rtl.getByPlaceholderText(createModal, 'Email address')
    const confirmCreateButton = rtl
      .getAllByRole(createModal, 'button')
      .filter(el => el.textContent === 'Create')[0]
    expect(confirmCreateButton).toBeInTheDocument()
    rtl.fireEvent.change(emailInput, {
      target: { value: '000@example.com' },
    })
    rtl.fireEvent.click(confirmCreateButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    rtl.getAllByText(createModal, (_content, element) =>
      element.textContent.startsWith(
        'Failed to send account invite to 000@example.com',
      ),
    )
    rtl.getAllByText(createModal, (_content, element) =>
      element.textContent.startsWith(
        'Error message: You must construct additional pylons',
      ),
    )
  })

  it('deletes an invite', async () => {
    const deletedUserIds = []
    AccountService.fetchPendingInviteAccounts = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          MOCK_ACCOUNTS.filter(
            ({ UserId }) => !deletedUserIds.includes(UserId),
          ),
        ),
      )
    AccountService.deleteInviteByUserId = jest
      .fn()
      .mockImplementation(userId => {
        deletedUserIds.push(userId)
      })

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    const startDeleteButton = page.getByText('Delete')
    expect(startDeleteButton.disabled).toBe(true)

    const targetAccountEmailCell = accountsTestUtils.queryByColumnText(
      page.baseElement,
      AccountsTableColumns.EmailAddress.id,
      '5@example.com',
    )
    expect(targetAccountEmailCell).toBeInTheDocument()
    rtl.fireEvent.click(targetAccountEmailCell)
    expect(startDeleteButton.disabled).toBe(false)

    rtl.fireEvent.click(startDeleteButton)
    const deleteModal = await rtl.waitForElement(() =>
      rtl.getByText(document, 'Confirm invite deletion').closest('.modal'),
    )
    rtl.queryAllByText(deleteModal, (_content, element) =>
      element.textContent.startsWith(
        'Are you sure you want to delete this account invite for 5@example.com?',
      ),
    )

    const confirmDeleteButton = rtl
      .getAllByRole(deleteModal, 'button')
      .filter(el => el.textContent === 'Delete')[0]
    expect(confirmDeleteButton).toBeInTheDocument()
    rtl.fireEvent.click(confirmDeleteButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    expect(
      page.getAllByText(
        (_content, element) =>
          element.textContent === 'Deleted account invite for 5@example.com.',
      )[0],
    ).toBeInTheDocument()

    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId(AccountsTable.ACCOUNTS_TABLE_TESTID)
    rtl.fireEvent.change(filterInput, { target: { value: '5@' } })
    expect(
      accountsTestUtils.queryByColumnText(
        table,
        AccountsTableColumns.EmailAddress.id,
        '5@example.com',
      ),
    ).toBeNull()
  })

  it('shows a message when deletion fails', async () => {
    AccountService.fetchPendingInviteAccounts = jest
      .fn()
      .mockResolvedValue(MOCK_ACCOUNTS)
    AccountService.deleteInviteByUserId = jest
      .fn()
      .mockRejectedValue(new Error('Target lost.'))

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    const targetAccountEmailCell = accountsTestUtils.queryByColumnText(
      page.baseElement,
      AccountsTableColumns.EmailAddress.id,
      '2@example.com',
    )
    expect(targetAccountEmailCell).toBeInTheDocument()
    rtl.fireEvent.click(targetAccountEmailCell)

    const startDeleteButton = page.getByText('Delete')
    rtl.fireEvent.click(startDeleteButton)
    const createModal = await rtl.waitForElement(() =>
      rtl.getByText(document, 'Confirm invite deletion').closest('.modal'),
    )
    const confirmDeleteButton = rtl
      .getAllByRole(createModal, 'button')
      .filter(el => el.textContent === 'Delete')[0]
    expect(confirmDeleteButton).toBeInTheDocument()
    rtl.fireEvent.click(confirmDeleteButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    page.getAllByText((_content, element) =>
      element.textContent.startsWith(
        'Failed to delete account invite for 2@example.com',
      ),
    )
    page.getAllByText((_content, element) =>
      element.textContent.startsWith('Error message: Target lost.'),
    )
  })
})

const NUM_MOCK_ACCOUNTS = 157 // should be prime

const MOCK_INVITERS = _.range(NUM_MOCK_ACCOUNTS).map(index => {
  if (_.inRange(index, 20, 90)) {
    return 10
  } else if (_.inRange(index, 90, 120)) {
    return 20
  } else if (_.inRange(index, 120, NUM_MOCK_ACCOUNTS)) {
    return 100
  }
  return null
})

const MOCK_DATES_INVITED = (() => {
  const now = Date.now()
  return _.range(NUM_MOCK_ACCOUNTS).map(
    index => new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000),
  )
})()

const MOCK_ACCOUNTS = MOCK_INVITERS.map((inviter, index) => ({
  IdentityId: `identityId${index}`,
  UserId: `userId${index}`,
  EmailAddress: `${index}@example.com`,
  DateInvited: MOCK_DATES_INVITED[index],
  InviterEmailAddress: inviter && `${inviter}@example.com`,
  InviterUserId: inviter && `userId${inviter}`,
}))
