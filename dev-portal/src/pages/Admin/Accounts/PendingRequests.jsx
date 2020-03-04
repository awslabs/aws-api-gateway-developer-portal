import React, { useCallback, useEffect, useState } from 'react'
import { Button, Container, Header, Message, Modal } from 'semantic-ui-react'

import * as MessageList from 'components/MessageList'
import * as AccountService from 'services/accounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

const PendingRequests = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(undefined)
  const [denyModalOpen, setDenyModalOpen] = useState(false)
  const [messages, sendMessage] = MessageList.useMessages()

  const refreshAccounts = () =>
    AccountService.fetchPendingRequestAccounts().then(accounts =>
      setAccounts(accounts),
    )

  // Initial load
  useEffect(() => {
    refreshAccounts().finally(() => setLoading(false))
  }, [])

  const onSelectAccount = useCallback(account => setSelectedAccount(account), [
    setSelectedAccount,
  ])

  const onConfirmApprove = useCallback(async () => {
    setLoading(true)
    try {
      await AccountService.approveAccountRequestByUserId(selectedAccount.UserId)
      sendMessage(dismiss => (
        <ApproveSuccessMessage account={selectedAccount} dismiss={dismiss} />
      ))
      await refreshAccounts()
    } catch (error) {
      sendMessage(dismiss => (
        <ApproveFailureMessage
          account={selectedAccount}
          dismiss={dismiss}
          errorMessage={error.message}
        />
      ))
    } finally {
      setLoading(false)
    }
  }, [sendMessage, selectedAccount])

  const onConfirmDeny = useCallback(async () => {
    setLoading(true)
    setDenyModalOpen(false)
    try {
      await AccountService.denyAccountRequestByUserId(selectedAccount.UserId)
      sendMessage(dismiss => (
        <DenySuccessMessage account={selectedAccount} dismiss={dismiss} />
      ))
      await refreshAccounts()
    } catch (error) {
      sendMessage(dismiss => (
        <DenyFailureMessage
          account={selectedAccount}
          dismiss={dismiss}
          errorMessage={error.message}
        />
      ))
    } finally {
      setLoading(false)
    }
  }, [sendMessage, selectedAccount])

  return (
    <Container fluid style={{ padding: '2em' }}>
      <Header as='h1'>Pending requests</Header>
      <MessageList.MessageList messages={messages} />
      <AccountsTable.AccountsTable
        accounts={accounts}
        columns={[
          AccountsTableColumns.EmailAddress,
          AccountsTableColumns.DateRequested,
        ]}
        loading={loading}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
      >
        <TableActions
          canApprove={!loading && selectedAccount}
          onClickApprove={onConfirmApprove}
          canDeny={!loading && selectedAccount}
          onClickDeny={() => setDenyModalOpen(true)}
        />
      </AccountsTable.AccountsTable>
      <DenyAccountModal
        account={selectedAccount}
        onConfirm={onConfirmDeny}
        open={denyModalOpen}
        onClose={() => setDenyModalOpen(false)}
      />
    </Container>
  )
}
export default PendingRequests

const TableActions = React.memo(
  ({ canApprove, onClickApprove, canDeny, onClickDeny }) => (
    <Button.Group>
      <Button
        content='Approve'
        disabled={!canApprove}
        onClick={onClickApprove}
      />
      <Button content='Deny' disabled={!canDeny} onClick={onClickDeny} />
    </Button.Group>
  ),
)

const DenyAccountModal = React.memo(
  ({ account, onConfirm, open, onClose }) =>
    account && (
      <Modal size='small' open={open} onClose={onClose}>
        <Modal.Header>Confirm request denial</Modal.Header>
        <Modal.Content>
          <p>
            Are you sure you want to deny this account request? The request will
            be permanently deleted, and <strong>{account.EmailAddress}</strong>{' '}
            will need to sign up again in order to request an account.
          </p>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button negative onClick={onConfirm}>
            Deny
          </Button>
        </Modal.Actions>
      </Modal>
    ),
)

const ApproveSuccessMessage = React.memo(({ account, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Approved account request for <strong>{account.EmailAddress}</strong>.
    </Message.Content>
  </Message>
))

const ApproveFailureMessage = React.memo(
  ({ account, errorMessage, dismiss }) => (
    <Message onDismiss={dismiss} negative>
      <Message.Content>
        <p>
          Failed to approve account request for{' '}
          <strong>{account.EmailAddress}</strong>.
        </p>
        {errorMessage && <p>Error message: {errorMessage}</p>}
      </Message.Content>
    </Message>
  ),
)

const DenySuccessMessage = React.memo(({ account, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Denied account request for <strong>{account.EmailAddress}</strong>.
    </Message.Content>
  </Message>
))

const DenyFailureMessage = React.memo(({ account, errorMessage, dismiss }) => (
  <Message onDismiss={dismiss} negative>
    <Message.Content>
      <p>
        Failed to deny account request for{' '}
        <strong>{account.EmailAddress}</strong>.
      </p>
      {errorMessage && <p>Error message: {errorMessage}</p>}
    </Message.Content>
  </Message>
))
