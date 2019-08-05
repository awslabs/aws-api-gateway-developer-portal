import React, { useCallback, useEffect, useState } from 'react'
import { Button, Container, Header, Message, Modal } from 'semantic-ui-react'

import * as MessageList from 'components/MessageList'
import * as AccountService from 'services/accounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

const DELETE_SUCCESS = Symbol('DELETE_SUCCESS')
const DELETE_FAILURE = Symbol('DELETE_FAILURE')
const PROMOTE_SUCCESS = Symbol('PROMOTE_SUCCESS')
const PROMOTE_FAILURE = Symbol('PROMOTE_FAILURE')

const RegisteredAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(undefined)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [promoteModalOpen, setPromoteModalOpen] = useState(false)
  const [messages, sendMessage, dismissMessage] = MessageList.useMessageQueue()

  const refreshAccounts = () =>
    AccountService.fetchRegisteredAccounts().then(accounts =>
      setAccounts(accounts),
    )

  // Initial load
  useEffect(() => {
    refreshAccounts().finally(() => setLoading(false))
  }, [])

  const onSelectAccount = useCallback(account => setSelectedAccount(account), [
    setSelectedAccount,
  ])

  const onConfirmDelete = useCallback(async () => {
    setLoading(true)
    setDeleteModalOpen(false)
    try {
      await AccountService.deleteAccountByIdentityPoolId(
        selectedAccount.identityPoolId,
      )
      sendMessage({ type: DELETE_SUCCESS, account: selectedAccount })
      await refreshAccounts()
    } catch (error) {
      sendMessage({
        type: DELETE_FAILURE,
        account: selectedAccount,
        errorMessage: error.message,
      })
    } finally {
      setLoading(false)
    }
  }, [sendMessage, selectedAccount])

  const onConfirmPromote = useCallback(async () => {
    setLoading(true)
    setPromoteModalOpen(false)
    try {
      await AccountService.promoteAccountByIdentityPoolId(
        selectedAccount.identityPoolId,
      )
      sendMessage({ type: PROMOTE_SUCCESS, account: selectedAccount })
    } catch (error) {
      sendMessage({
        type: PROMOTE_FAILURE,
        account: selectedAccount,
        errorMessage: error.message,
      })
    } finally {
      setLoading(false)
    }
  }, [sendMessage, selectedAccount])


  return (
    <Container fluid style={{ padding: '2em' }}>
      <Header as='h1'>Registered accounts</Header>
      <MessageList.MessageList
        messages={messages}
        dismissMessage={dismissMessage}
        renderers={MESSAGE_RENDERERS}
      />
      <AccountsTable.AccountsTable
        accounts={accounts}
        columns={[
          AccountsTableColumns.EmailAddress,
          AccountsTableColumns.DateRegistered,
          AccountsTableColumns.RegistrationMethod,
          AccountsTableColumns.ApiKeyId,
        ]}
        loading={loading}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
      >
        <TableActions
          canDelete={!loading && selectedAccount}
          onClickDelete={() => setDeleteModalOpen(true)}
          canPromote={!loading && selectedAccount}
          onClickPromote={() => setPromoteModalOpen(true)}
        />
      </AccountsTable.AccountsTable>
      <DeleteAccountModal
        account={selectedAccount}
        onConfirm={onConfirmDelete}
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
      <PromoteAccountModal
        account={selectedAccount}
        onConfirm={onConfirmPromote}
        open={promoteModalOpen}
        onClose={() => setPromoteModalOpen(false)}
      />
    </Container>
  )
}
export default RegisteredAccounts

const TableActions = React.memo(
  ({ canDelete, onClickDelete, canPromote, onClickPromote }) => (
    <Button.Group>
      <Button content='Delete' disabled={!canDelete} onClick={onClickDelete} />
      <Button
        content='Promote to Admin'
        disabled={!canPromote}
        onClick={onClickPromote}
      />
    </Button.Group>
  ),
)

const DeleteAccountModal = React.memo(
  ({ account, onConfirm, open, onClose }) =>
    account && (
      <Modal size='small' open={open} onClose={onClose}>
        <Modal.Header>Confirm deletion</Modal.Header>
        <Modal.Content>
          <p>
            Are you sure you want to delete the account{' '}
            <strong>{account.emailAddress}</strong>, and de-activate the
            associated API key? This action is irreversible.
          </p>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button negative onClick={onConfirm}>
            Delete
          </Button>
        </Modal.Actions>
      </Modal>
    ),
)

const PromoteAccountModal = React.memo(
  ({ account, onConfirm, open, onClose }) =>
    account && (
      <Modal size='small' open={open} onClose={onClose}>
        <Modal.Header>Confirm promotion</Modal.Header>
        <Modal.Content>
          <p>
            Are you sure you want to promote the account{' '}
            <strong>{account.emailAddress}</strong> to Admin? This will allow
            the account to perform any Admin actions, including deleting and
            promoting other accounts.
          </p>
          <p>
            Only the owner of the Developer Portal can demote the account,
            through the Cognito console.
          </p>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button negative onClick={onConfirm}>
            Promote
          </Button>
        </Modal.Actions>
      </Modal>
    ),
)

const MESSAGE_RENDERERS = {
  [DELETE_SUCCESS]: ({ account }, onDismiss) => (
    <DeleteSuccessMessage account={account} onDismiss={onDismiss} />
  ),
  [DELETE_FAILURE]: ({ account, errorMessage }, onDismiss) => (
    <DeleteFailureMessage
      account={account}
      errorMessage={errorMessage}
      onDismiss={onDismiss}
    />
  ),
  [PROMOTE_SUCCESS]: ({ account }, onDismiss) => (
    <PromoteSuccessMessage account={account} onDismiss={onDismiss} />
  ),
  [PROMOTE_FAILURE]: ({ account, errorMessage }, onDismiss) => (
    <PromoteFailureMessage
      account={account}
      errorMessage={errorMessage}
      onDismiss={onDismiss}
    />
  ),
}

const DeleteSuccessMessage = React.memo(({ account, onDismiss }) => (
  <Message onDismiss={onDismiss} positive>
    <Message.Content>
      Deleted account <strong>{account.emailAddress}</strong>.
    </Message.Content>
  </Message>
))

const DeleteFailureMessage = React.memo(
  ({ account, errorMessage, onDismiss }) => (
    <Message onDismiss={onDismiss} negative>
      <Message.Content>
        <p>
          Failed to delete account <strong>{account.emailAddress}</strong>.
        </p>
        {errorMessage && <p>Error message: {errorMessage}</p>}
      </Message.Content>
    </Message>
  ),
)

const PromoteSuccessMessage = React.memo(({ account, onDismiss }) => (
  <Message onDismiss={onDismiss} positive>
    <Message.Content>
      Promoted account <strong>{account.emailAddress}</strong>.
    </Message.Content>
  </Message>
))

const PromoteFailureMessage = React.memo(
  ({ account, errorMessage, onDismiss }) => (
    <Message onDismiss={onDismiss} negative>
      <Message.Content>
        <p>
          Failed to promote account <strong>{account.emailAddress}</strong>.
        </p>
        {errorMessage && <p>Error message: {errorMessage}</p>}
      </Message.Content>
    </Message>
  ),
)
