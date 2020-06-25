import React, { useCallback, useEffect, useState } from 'react'
import { Button, Container, Header, Message, Modal } from 'semantic-ui-react'

import * as MessageList from 'components/MessageList'
import * as AccountService from 'services/accounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'
import { store } from 'services/state'
import _ from 'lodash'

const RegisteredAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(undefined)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [promoteModalOpen, setPromoteModalOpen] = useState(false)
  const [messages, sendMessage] = MessageList.useMessages()

  const refreshAccounts = async () => {
    const [all, admins] = await Promise.all([
      AccountService.fetchRegisteredAccounts(),
      AccountService.fetchAdminAccounts()
    ])

    const allMap = {}

    all.forEach(user => { allMap[user.UserId] = user })
    admins.forEach(admin => {
      admin.IsAdmin = true
      if (admin.EmailAddress === store.user.email) {
        admin.EmailAddress += ' (you)'
      }
      allMap[admin.UserId] = admin
    })

    return setAccounts(Object.values(allMap))
  }

  const isYou = (user) => {
    return (_.get(store, 'user.email') + ' (you)') === user.EmailAddress
  }

  // Initial load
  useEffect(() => {
    refreshAccounts().finally(() => setLoading(false))
  }, [])

  const onSelectAccount = useCallback(account => setSelectedAccount(account), [
    setSelectedAccount
  ])

  const onConfirmDelete = useCallback(async () => {
    setLoading(true)
    setDeleteModalOpen(false)
    try {
      await AccountService.deleteAccountByUserId(selectedAccount.UserId)
      sendMessage(dismiss => (
        <DeleteSuccessMessage account={selectedAccount} dismiss={dismiss} />
      ))
      await refreshAccounts()
    } catch (error) {
      sendMessage(dismiss => (
        <DeleteFailureMessage
          account={selectedAccount}
          dismiss={dismiss}
          errorMessage={error.message}
        />
      ))
    } finally {
      setLoading(false)
    }
  }, [sendMessage, selectedAccount])

  const onConfirmPromote = useCallback(async () => {
    setLoading(true)
    setPromoteModalOpen(false)
    try {
      await AccountService.promoteAccountByUserId(selectedAccount.UserId)
      sendMessage(dismiss => (
        <PromoteSuccessMessage account={selectedAccount} dismiss={dismiss} />
      ))
      await refreshAccounts()
    } catch (error) {
      sendMessage(dismiss => (
        <PromoteFailureMessage
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
      <Header as='h1'>Registered accounts</Header>
      <MessageList.MessageList messages={messages} />
      <AccountsTable.AccountsTable
        accounts={accounts}
        columns={[
          AccountsTableColumns.EmailAddress,
          AccountsTableColumns.IsAdmin,
          AccountsTableColumns.DateRegistered,
          AccountsTableColumns.RegistrationMethod,
          AccountsTableColumns.ApiKeyId
        ]}
        loading={loading}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
      >
        <TableActions
          canDelete={!loading && selectedAccount && !isYou(selectedAccount)}
          onClickDelete={() => setDeleteModalOpen(true)}
          canPromote={!loading && selectedAccount}
          isAdmin={selectedAccount && selectedAccount.IsAdmin}
          onClickPromote={() => setPromoteModalOpen(true)}
        />
      </AccountsTable.AccountsTable>
      <DeleteAccountModal
        account={selectedAccount}
        onConfirm={onConfirmDelete}
        open={deleteModalOpen}
        isAdmin={selectedAccount && selectedAccount.IsAdmin}
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
  ({ canDelete, onClickDelete, canPromote, onClickPromote, isAdmin }) => (
    <Button.Group>
      <Button content='Delete' disabled={!canDelete} onClick={onClickDelete} />
      <Button
        content='Promote to Admin'
        disabled={!canPromote || isAdmin}
        onClick={onClickPromote}
      />
    </Button.Group>
  )
)

const DeleteAccountModal = React.memo(
  ({ account, onConfirm, open, onClose, isAdmin }) =>
    account && (
      <Modal size='small' open={open} onClose={onClose}>
        <Modal.Header>Delete account</Modal.Header>
        <Modal.Content>
          {isAdmin && (
            <Message negative>
              <Message.Header>Danger! This is an admin account.</Message.Header>
              <p><strong>Deleting an admin account could cause temporary loss of access and temporary inability to configure the developer portal.</strong></p>
            </Message>
          )}
          <p>
            Are you sure you want to delete the account <strong>{account.EmailAddress}</strong>, and de-activate the             associated API key? This action is irreversible.
          </p>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button negative onClick={onConfirm}>
            Delete
          </Button>
        </Modal.Actions>
      </Modal>
    )
)

const PromoteAccountModal = React.memo(
  ({ account, onConfirm, open, onClose }) =>
    account && (
      <Modal size='small' open={open} onClose={onClose}>
        <Modal.Header>Confirm promotion</Modal.Header>
        <Modal.Content>
          <p>
            Are you sure you want to promote the account{' '}
            <strong>{account.EmailAddress}</strong> to Admin? This will allow
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
    )
)

const DeleteSuccessMessage = React.memo(({ account, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Deleted account <strong>{account.EmailAddress}</strong>.
    </Message.Content>
  </Message>
))

const DeleteFailureMessage = React.memo(
  ({ account, errorMessage, dismiss }) => (
    <Message onDismiss={dismiss} negative>
      <Message.Content>
        <p>
          Failed to delete account <strong>{account.EmailAddress}</strong>.
        </p>
        {errorMessage && <p>Error message: {errorMessage}</p>}
      </Message.Content>
    </Message>
  )
)

const PromoteSuccessMessage = React.memo(({ account, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Promoted account <strong>{account.EmailAddress}</strong>.
    </Message.Content>
  </Message>
))

const PromoteFailureMessage = React.memo(
  ({ account, errorMessage, dismiss }) => (
    <Message onDismiss={dismiss} negative>
      <Message.Content>
        <p>
          Failed to promote account <strong>{account.EmailAddress}</strong>.
        </p>
        {errorMessage && <p>Error message: {errorMessage}</p>}
      </Message.Content>
    </Message>
  )
)
