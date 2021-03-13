import React, { useCallback, useEffect, useState } from 'react'
import { Container, Header } from 'semantic-ui-react'

import * as AccountService from 'services/accounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(undefined)

  const refreshAccounts = () =>
    AccountService.fetchAdminAccounts().then(accounts =>
      setAccounts(accounts)
    )

  // Initial load
  useEffect(() => {
    refreshAccounts().finally(() => setLoading(false))
  }, [])

  const onSelectAccount = useCallback(account => setSelectedAccount(account), [
    setSelectedAccount
  ])

  return (
    <Container fluid style={{ padding: '2em' }}>
      <Header as='h1'>Admin accounts</Header>
      <AccountsTable.AccountsTable
        accounts={accounts}
        columns={[
          AccountsTableColumns.EmailAddress,
          AccountsTableColumns.DatePromoted,
          AccountsTableColumns.Promoter
        ]}
        loading={loading}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
      />
    </Container>
  )
}
export default AdminAccounts
