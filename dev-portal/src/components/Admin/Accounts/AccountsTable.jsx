import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Container,
  Dropdown,
  Icon,
  Input,
  Pagination,
  Placeholder,
  Table
} from 'semantic-ui-react'

import styles from './AccountsTable.module.css'

export const DEFAULT_PAGE_SIZE = 10

const FILLER_ACCOUNT = Symbol('FILLER_ACCOUNT')

const NO_FILTER_COLUMN = Symbol('NO_FILTER_COLUMN')
const NO_FILTER_VALUE = ''
const NO_ORDER_COLUMN = Symbol('NO_ORDER_COLUMN')

const ORDER_DIRECTIONS = [
  {
    lodashDirection: undefined,
    iconName: 'sort'
  },
  {
    lodashDirection: 'asc',
    iconName: 'sort up'
  },
  {
    lodashDirection: 'desc',
    iconName: 'sort down'
  }
]

const nextDirectionIndex = index => (index + 1) % ORDER_DIRECTIONS.length

export const ACCOUNT_ROW_PLACEHOLDER_TESTID = 'accountRowPlaceholder'
export const FILTER_DROPDOWN_TESTID = 'filterDropdown'
export const ACCOUNTS_TABLE_TESTID = 'accountsTable'
export const ACCOUNT_COLUMN_ID_DATA_ATTR = 'data-account-column-id'

/**
 * A paginated table whose rows represent accounts.
 *
 * @param {Object} props
 * @param {Object[]} props.accounts
 *    all Account objects to display (before filtering)
 * @param {AccountsTableColumns~Descriptor[]} props.columns
 *    column descriptors
 * @param {boolean} props.loading
 *    if true, the table displays a loading state; if false, the table displays
 *    the given accounts
 * @param {Object} props.selectedAccount
 *    an Account object to highlight
 * @param onSelectAccount
 *    when the row corresponding to `account` is clicked, AccountsTable calls
 *    `onSelectAccount(account)`
 * @param children
 *    components to be placed in the actions section above the table
 */
export const AccountsTable = ({
  accounts,
  columns,
  loading,
  selectedAccount,
  onSelectAccount,
  children: toolbarActions
}) => {
  const pageSize = DEFAULT_PAGE_SIZE

  const [accountsView, setAccountsView] = useState(accounts)
  const [activePage, setActivePage] = useState(0)
  const [activePageAccounts, setActivePageAccounts] = useState(
    [...Array(pageSize)].fill(FILLER_ACCOUNT)
  )

  const [filterableColumns, setFilterableColumns] = useState([])
  const [filter, setFilter] = useState({
    column: NO_FILTER_COLUMN,
    value: NO_FILTER_VALUE
  })
  const [order, setOrder] = useState({
    column: NO_ORDER_COLUMN,
    directionIndex: 0
  })

  /* eslint-disable brace-style */
  useEffect(() => {
    const filterableColumns = columns.filter(column => column.filtering)
    setFilterableColumns(filterableColumns)

    // Reset filtering state if no columns are filterable
    if (filterableColumns.length === 0) {
      setFilter({
        column: NO_FILTER_COLUMN,
        value: NO_FILTER_VALUE
      })
    }

    // Pick the first filterable column if one is available
    else if (filter.column === NO_FILTER_COLUMN) {
      setFilter(filter => ({ ...filter, column: filterableColumns[0] }))
    }

    // Reset filterColumn if it's no longer among the available columns
    else if (!filterableColumns.includes(filter.column)) {
      setFilter(filter => ({ ...filter, column: NO_FILTER_COLUMN }))
    }
  }, [columns, filter])
  /* eslint-enable brace-style */

  /**
   * Sets `accountsView` to the filtered and sorted subset of `props.accounts`.
   */
  useEffect(() => {
    let view = _(accounts)

    if (filter.value !== '' && filter.column !== NO_FILTER_COLUMN) {
      const filterAccessor = filter.column.filtering.accessor
      if (typeof filterAccessor === 'string') {
        view = view.filter(
          item =>
            !!item[filterAccessor] &&
            item[filterAccessor].toString().includes(filter.value)
        )
      } else if (typeof filterAccessor === 'function') {
        view = view.filter(item => filterAccessor(item).includes(filter.value))
      } else {
        throw new Error(
          `Invalid filtering accessor on column ${filter.column.id}`
        )
      }
    }

    if (order.column !== NO_ORDER_COLUMN) {
      view = view.orderBy(
        [order.column.ordering.iteratee],
        [ORDER_DIRECTIONS[order.directionIndex].lodashDirection]
      )
    }

    setAccountsView(view.value())
  }, [accounts, filter, order])

  /**
   * Returns a page of accounts from `accountView` according to the given page
   * number.
   */
  const computeAccountsPage = useCallback(
    activePage => {
      const start = activePage * pageSize
      const pageItems = accountsView.slice(start, start + pageSize)
      const fillerCount = pageSize - pageItems.length
      if (fillerCount) {
        pageItems.push(...Array(fillerCount).fill(FILLER_ACCOUNT))
      }
      return pageItems
    },
    [accountsView, pageSize]
  )

  const totalPages = Math.ceil(accountsView.length / pageSize)

  const onPageChange = useCallback(
    (_event, { activePage: newActivePage }) => {
      // SemanticUI uses 1-indexing in Pagination. We prefer sanity.
      --newActivePage
      setActivePage(newActivePage)
      setActivePageAccounts(computeAccountsPage(newActivePage, accountsView))
      onSelectAccount(undefined)
    },
    [accountsView, onSelectAccount, computeAccountsPage]
  )

  useEffect(() => {
    loading || onPageChange(undefined, { activePage: 1 })
  }, [accounts, loading, onPageChange])

  const tableRows = _.range(pageSize).map(index => {
    if (loading) {
      return <LoadingAccountRow key={index} columnCount={columns.length} />
    }

    const account = activePageAccounts[index]
    return account === FILLER_ACCOUNT ? (
      <FillerAccountRow key={index} columnCount={columns.length} />
    ) : (
      <AccountRow
        account={account}
        columns={columns}
        isSelected={account === selectedAccount}
        onSelect={onSelectAccount}
        key={index}
      />
    )
  })

  const filterColumnDropdownOptions = filterableColumns.map(
    ({ title, id }, index) => ({ key: index, text: title, value: id })
  )

  const onFilterColumnDropdownChange = (_event, { value }) =>
    setFilter(filter => ({
      ...filter,
      column:
        filterableColumns.find(column => column.id === value) ||
        NO_FILTER_COLUMN
    }))
  const onSearchInputChange = (_event, { value }) =>
    setFilter(filter => ({ ...filter, value }))

  const toolbar = (
    <>
      <div
        style={{ float: 'left', marginBottom: '1rem', paddingRight: '1rem' }}
      >
        {filterableColumns.length > 0 && (
          <Input
            iconPosition='left'
            icon='search'
            placeholder='Search by...'
            value={filter.value}
            onChange={onSearchInputChange}
            style={{ maxWidth: '24em' }}
          />
        )}
      </div>
      <div
        style={{ float: 'left', marginBottom: '1rem', paddingRight: '1rem' }}
      >
        <Dropdown
          onChange={onFilterColumnDropdownChange}
          options={filterColumnDropdownOptions}
          selection
          value={filter.column.id}
          data-testid={FILTER_DROPDOWN_TESTID}
        />
      </div>
      <div style={{ float: 'right', marginBottom: '1rem' }}>
        {toolbarActions}
      </div>
    </>
  )

  const table = (
    <Table selectable={!loading} data-testid={ACCOUNTS_TABLE_TESTID}>
      <TableHeader columns={columns} order={order} setOrder={setOrder} />
      <Table.Body>{tableRows}</Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.HeaderCell colSpan={columns.length}>
            <Container fluid textAlign='right'>
              <Pagination
                // SemanticUI uses 1-indexing in Pagination. We prefer sanity.
                activePage={activePage + 1}
                onPageChange={onPageChange}
                totalPages={totalPages}
              />
            </Container>
          </Table.HeaderCell>
        </Table.Row>
      </Table.Footer>
    </Table>
  )

  return (
    <Container fluid>
      {toolbar}
      {table}
    </Container>
  )
}

const TableHeader = React.memo(({ columns, order, setOrder }) => {
  // Clicking on a column makes it the "order column". If that column was
  // already the "order column", cycle between order directions (none,
  // ascending, descending). Otherwise, start at the beginning of the cycle
  // (ascending).
  const onToggleOrder = column => () => {
    const nextOrder = { ...order }

    if (column === order.column) {
      const nextIndex = nextDirectionIndex(order.directionIndex)
      if (nextIndex === 0) {
        nextOrder.column = NO_ORDER_COLUMN
      }
      nextOrder.directionIndex = nextIndex
    } else {
      nextOrder.column = column
      nextOrder.directionIndex = nextDirectionIndex(0)
    }

    setOrder(nextOrder)
  }

  const orderDirection = ORDER_DIRECTIONS[order.directionIndex]
  return (
    <Table.Header>
      <Table.Row className={styles.headerRow}>
        {columns.map((column, index) => (
          <Table.HeaderCell
            key={index}
            onClick={column.ordering && onToggleOrder(column)}
          >
            {column.title}
            {column === order.column && <Icon name={orderDirection.iconName} />}
            {column.ordering && column !== order.column && (
              <Icon name={ORDER_DIRECTIONS[0].iconName} disabled />
            )}
          </Table.HeaderCell>
        ))}
      </Table.Row>
    </Table.Header>
  )
})

const LoadingAccountRow = React.memo(({ columnCount }) => (
  <Table.Row>
    {Array.from({ length: columnCount }).map((_value, index) => (
      <Table.Cell key={index}>
        <Placeholder data-testid={ACCOUNT_ROW_PLACEHOLDER_TESTID} fluid>
          &nbsp;
        </Placeholder>
      </Table.Cell>
    ))}
  </Table.Row>
))

const FillerAccountRow = React.memo(({ columnCount }) => (
  <Table.Row>
    {Array.from({ length: columnCount }).map((_value, index) => (
      <Table.Cell key={index}>&nbsp;</Table.Cell>
    ))}
  </Table.Row>
))

const AccountRow = React.memo(({ account, columns, isSelected, onSelect }) => {
  return (
    <Table.Row active={isSelected} onClick={() => onSelect(account)}>
      {columns.map(({ id, render }, index) => (
        <Table.Cell {...{ [ACCOUNT_COLUMN_ID_DATA_ATTR]: id }} key={index}>
          {render(account)}
        </Table.Cell>
      ))}
    </Table.Row>
  )
})
