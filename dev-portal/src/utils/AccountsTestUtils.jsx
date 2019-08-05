import _ from 'lodash'
import * as rtl from '@testing-library/react'

import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

export const waitForAccountsToLoad = page =>
  rtl.waitForElementToBeRemoved(() =>
    page.queryAllByTestId(AccountsTable.ACCOUNT_ROW_PLACEHOLDER_TESTID),
  )

export const queryAllByColumnText = (container, columnId, text) =>
  rtl
    .queryAllByText(container, text)
    .filter(
      el =>
        el.getAttribute(AccountsTable.ACCOUNT_COLUMN_ID_DATA_ATTR) === columnId,
    )

export const queryByColumnText = (container, columnId, text) =>
  _.get(queryAllByColumnText(container, columnId, text), [0], null)

export const expectEmailIn = (email, container) =>
  expect(
    queryByColumnText(container, AccountsTableColumns.EmailAddress.id, email),
  ).toBeInTheDocument()
