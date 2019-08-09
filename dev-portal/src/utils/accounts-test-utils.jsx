import _ from 'lodash'
import * as rtl from '@testing-library/react'

import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

/**
 * A promise that waits for `AccountsTable.LoadingAccountRow` elements to be
 * removed. Has the same operating restriction as `waitForElementToBeRemoved`;
 * namely, that such an element must be present when this function is first
 * called.
 *
 * @param container
 *    the element in which to search for `LoadingAccountRow` elements
 */
export const waitForAccountsToLoad = container =>
  rtl.waitForElementToBeRemoved(() =>
    container.queryAllByTestId(AccountsTable.ACCOUNT_ROW_PLACEHOLDER_TESTID),
  )

/**
 * Like a `queryAll` from RTL, but searches within the `container` element for
 * `text` within the column identified by `columnId`.
 *
 * @param container
 *    the element in which to search for `text`
 * @param columnId
 *    the `id` of a column descriptor (see `AccountsTableColumns`)
 * @param text
 *    the `TextMatch` for which to search
 */
export const queryAllByColumnText = (container, columnId, text) =>
  rtl
    .queryAllByText(container, text)
    .filter(
      el =>
        el.getAttribute(AccountsTable.ACCOUNT_COLUMN_ID_DATA_ATTR) === columnId,
    )

/**
 * Like `queryAllByColumnText`, but returns only one element if found, or
 * `null` if no elements are found.
 */
export const queryByColumnText = (container, columnId, text) =>
  _.get(queryAllByColumnText(container, columnId, text), [0], null)

/**
 * Expects that `email` appears in the `EmailAddress` column of the
 * `container`.
 *
 * @param email
 *    the `TextMatch` representing an email address, for which to search
 * @param container
 *    the element in which to search
 */
export const expectEmailIn = (email, container) =>
  expect(
    queryByColumnText(container, AccountsTableColumns.EmailAddress.id, email),
  ).toBeInTheDocument()
