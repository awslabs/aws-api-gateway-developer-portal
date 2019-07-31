import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Container,
  Dropdown,
  Icon,
  Input,
  Pagination,
  Placeholder,
  Table,
} from 'semantic-ui-react'

import styles from './AccountsTable.module.css'

const FILLER_ACCOUNT = Symbol('FILLER_ACCOUNT')

const NO_FILTER_COLUMN = Symbol('NO_FILTER_COLUMN')
const NO_FILTER_VALUE = ''
const NO_ORDER_COLUMN = Symbol('NO_ORDER_COLUMN')
const NO_ORDER_DIRECTION = Symbol('NO_ORDER_DIRECTION')

const NEXT_DIRECTION = {
  [NO_ORDER_DIRECTION]: 'asc',
  asc: 'desc',
  desc: NO_ORDER_DIRECTION,
}

const DIRECTION_ICON = {
  [NO_ORDER_DIRECTION]: 'sort',
  asc: 'sort up',
  desc: 'sort down',
}

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
  children: toolbarActions,
}) => {
  const pageSize = 10

  const [accountsView, setAccountsView] = useState(accounts)
  const [activePage, setActivePage] = useState(0)
  const [activePageAccounts, setActivePageAccounts] = useState(
    [...Array(pageSize)].fill(FILLER_ACCOUNT),
  )

  const [filterableColumns, setFilterableColumns] = useState([])
  const [filterColumn, setFilterColumn] = useState(NO_FILTER_COLUMN)
  const [filterValue, setFilterValue] = useState(NO_FILTER_VALUE)
  const [orderColumn, setOrderColumn] = useState(NO_ORDER_COLUMN)
  const [orderDirection, setOrderDirection] = useState(NO_ORDER_DIRECTION)

  useEffect(() => {
    const filterableColumns = columns.filter(column => column.filtering)
    setFilterableColumns(filterableColumns)

    // Reset filtering state if no columns are filterable
    if (filterableColumns.length === 0) {
      setFilterColumn(NO_FILTER_COLUMN)
      setFilterValue(NO_FILTER_VALUE)
    }

    // Pick the first filterable column if one is available
    else if (filterColumn === NO_FILTER_COLUMN) {
      setFilterColumn(filterableColumns[0])
    }

    // Reset filterColumn if it's no longer among the available columns
    else if (!filterableColumns.includes(filterColumn)) {
      setFilterColumn(NO_FILTER_COLUMN)
    }
  }, [
    columns,
    filterColumn,
    setFilterColumn,
    setFilterValue,
    setFilterableColumns,
  ])

  /**
   * Sets `accountsView` to the filtered and sorted subset of `props.accounts`.
   */
  useEffect(() => {
    let view = _(accounts)
    if (filterColumn !== NO_FILTER_COLUMN) {
      const filterKey = filterColumn.filtering.accessor
      view = view.filter(
        item =>
          !!item[filterKey] && item[filterKey].toString().includes(filterValue),
      )
    }
    if (orderColumn !== NO_ORDER_COLUMN) {
      view = view.orderBy([orderColumn.ordering.iteratee], [orderDirection])
    }
    setAccountsView(view.value())
  }, [accounts, filterColumn, filterValue, orderColumn, orderDirection])

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
    [accountsView],
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
    [accountsView, onSelectAccount, computeAccountsPage],
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
    ({ title, id }, index) => ({ key: index, text: title, value: id }),
  )

  const onFilterColumnDropdownChange = (_event, { value }) =>
    setFilterColumn(
      filterableColumns.find(column => column.id === value) || NO_FILTER_COLUMN,
    )
  const onSearchInputChange = (_event, { value }) => setFilterValue(value)

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
            value={filterValue}
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
          value={filterColumn.id}
          data-testid='filterDropdown'
        />
      </div>
      <div style={{ float: 'right', marginBottom: '1rem' }}>
        {toolbarActions}
      </div>
    </>
  )

  const table = (
    <Table selectable={!loading} data-testid='accountsTable'>
      <TableHeader
        columns={columns}
        orderColumn={orderColumn}
        setOrderColumn={setOrderColumn}
        orderDirection={orderDirection}
        setOrderDirection={setOrderDirection}
      />
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

const TableHeader = React.memo(
  ({
    columns,
    orderColumn,
    setOrderColumn,
    orderDirection,
    setOrderDirection,
  }) => {
    // Clicking on a column makes it the "orderColumn". If that column was
    // already the "orderColumn", cycle between order directions (none,
    // ascending, descending). Otherwise, start at the beginning of the cycle
    // (ascending).
    const onToggleOrder = column => () => {
      if (column === orderColumn) {
        const nextDirection = NEXT_DIRECTION[orderDirection]
        if (nextDirection === NO_ORDER_DIRECTION) {
          setOrderColumn(NO_ORDER_COLUMN)
        }
        setOrderDirection(nextDirection)
      } else {
        setOrderColumn(column)
        setOrderDirection(NEXT_DIRECTION[NO_ORDER_DIRECTION])
      }
    }

    return (
      <Table.Header>
        <Table.Row className={styles.headerRow}>
          {columns.map((column, index) => (
            <Table.HeaderCell
              key={index}
              onClick={column.ordering && onToggleOrder(column)}
            >
              {column.title}
              {column === orderColumn && (
                <Icon name={DIRECTION_ICON[orderDirection]} />
              )}
              {column.ordering && column !== orderColumn && (
                <Icon name={DIRECTION_ICON[NO_ORDER_DIRECTION]} disabled />
              )}
            </Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
    )
  },
)

const LoadingAccountRow = React.memo(({ columnCount }) => (
  <Table.Row>
    {Array.from({ length: columnCount }).map((_value, index) => (
      <Table.Cell key={index}>
        <Placeholder data-testid='accountRowPlaceholder' fluid>
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
      {columns.map(({ render }, index) => (
        <Table.Cell key={index}>{render(account)}</Table.Cell>
      ))}
    </Table.Row>
  )
})
