import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Container,
  Header,
  Input,
  Message,
  Modal,
} from 'semantic-ui-react'

import * as MessageList from 'components/MessageList'
import * as AccountService from 'services/accounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountsTableColumns from 'components/Admin/Accounts/AccountsTableColumns'

import { useBoolean } from 'utils/use-boolean'

const PendingInvites = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(undefined)
  const [isCreateModalOpen, openCreateModal, closeCreateModal] = useBoolean(
    false,
  )
  const [isDeleteModalOpen, openDeleteModal, closeDeleteModal] = useBoolean(
    false,
  )
  const [messages, sendMessage] = MessageList.useMessages()
  const [
    createModalMessages,
    sendCreateModalMessage,
    clearCreateModalMessages,
  ] = MessageList.useMessages()

  const refreshAccounts = () =>
    AccountService.fetchPendingInviteAccounts().then(accounts =>
      setAccounts(accounts),
    )

  // Initial load
  useEffect(() => {
    refreshAccounts().finally(() => setLoading(false))
  }, [])

  const onSelectAccount = useCallback(
    account => setSelectedAccount(account),
    [],
  )

  const onConfirmCreate = useCallback(
    async emailAddress => {
      setLoading(true)
      clearCreateModalMessages()
      try {
        await AccountService.createInviteByEmail(emailAddress)
      } catch (error) {
        sendCreateModalMessage(dismiss => (
          <CreateFailureMessage
            emailAddress={emailAddress}
            dismiss={dismiss}
            errorMessage={error.message}
          />
        ))
        setLoading(false)
        return false
      }
      closeCreateModal()
      clearCreateModalMessages()
      sendMessage(dismiss => (
        <CreateSuccessMessage emailAddress={emailAddress} dismiss={dismiss} />
      ))
      // Don't need to wait for this
      refreshAccounts().then(() => setLoading(false))
      return true
    },
    [
      sendMessage,
      sendCreateModalMessage,
      clearCreateModalMessages,
      closeCreateModal,
    ],
  )

  const onConfirmResend = useCallback(async () => {
    setLoading(true)
    try {
      await AccountService.resendInviteByEmail(selectedAccount.EmailAddress)
      sendMessage(dismiss => (
        <ResendSuccessMessage account={selectedAccount} dismiss={dismiss} />
      ))
    } catch (error) {
      sendMessage(dismiss => (
        <ResendFailureMessage account={selectedAccount} dismiss={dismiss} />
      ))
    } finally {
      setLoading(false)
    }
  }, [sendMessage, selectedAccount])

  const onConfirmDelete = useCallback(async () => {
    setLoading(true)
    closeDeleteModal()
    try {
      await AccountService.deleteInviteByUserId(selectedAccount.UserId)
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
  }, [sendMessage, selectedAccount, closeDeleteModal])

  return (
    <Container fluid style={{ padding: '2em' }}>
      <Header as='h1'>Pending invites</Header>
      <MessageList.MessageList messages={messages} />
      <AccountsTable.AccountsTable
        accounts={accounts}
        columns={[
          AccountsTableColumns.EmailAddress,
          AccountsTableColumns.DateInvited,
          AccountsTableColumns.Inviter,
        ]}
        loading={loading}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
      >
        <TableActions
          canCreate={!loading}
          onClickCreate={openCreateModal}
          canResend={!loading && selectedAccount}
          onClickResend={onConfirmResend}
          canDelete={!loading && selectedAccount}
          onClickDelete={openDeleteModal}
        />
      </AccountsTable.AccountsTable>
      <CreateInviteModal
        onConfirm={onConfirmCreate}
        open={isCreateModalOpen}
        onClose={closeCreateModal}
        messages={createModalMessages}
      />
      <DeleteInviteModal
        account={selectedAccount}
        onConfirm={onConfirmDelete}
        open={isDeleteModalOpen}
        onClose={closeDeleteModal}
      />
    </Container>
  )
}
export default PendingInvites

const TableActions = ({
  canCreate,
  onClickCreate,
  canResend,
  onClickResend,
  canDelete,
  onClickDelete,
}) => (
  <Button.Group>
    <Button
      content='Create invite...'
      disabled={!canCreate}
      onClick={onClickCreate}
    />
    <Button content='Resend' disabled={!canResend} onClick={onClickResend} />
    <Button content='Delete' disabled={!canDelete} onClick={onClickDelete} />
  </Button.Group>
)

/*
 * Note: `onConfirm` should return a boolean indicating whether the creation
 * succeeded.
 */
const CreateInviteModal = ({ onConfirm, open, onClose, messages }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const isEmailValid = useMemo(() => /^[^@\s]+@[^@\s]+$/.test(email), [email])
  const onChangeEmailAddress = useCallback(
    (_event, { value }) => setEmail(value),
    [],
  )
  const onClickCreate = useCallback(async () => {
    setLoading(true)
    if (await onConfirm(email)) {
      setEmail('')
    }
    setLoading(false)
  }, [onConfirm, email])

  return (
    <Modal open={open} onClose={onClose} size={'small'}>
      <Modal.Header>Create invite</Modal.Header>
      <Modal.Content>
        <p>
          Enter an email address below and select <strong>Create</strong> to
          send an invitation to create an account.
        </p>
        <MessageList.MessageList messages={messages} />
        <Message hidden={isEmailValid || loading} warning>
          Please enter a valid email address.
        </Message>
        <Input
          placeholder='Email address'
          value={email}
          onChange={onChangeEmailAddress}
          disabled={loading}
          style={{ width: '100%' }}
        />
      </Modal.Content>
      <Modal.Actions>
        <Button disabled={loading} loading={loading} onClick={onClose}>
          Cancel
        </Button>
        <Button
          positive
          disabled={!isEmailValid}
          loading={loading}
          onClick={onClickCreate}
        >
          Create
        </Button>
      </Modal.Actions>
    </Modal>
  )
}

const DeleteInviteModal = ({ account, onConfirm, open, onClose }) =>
  account ? (
    <Modal size='small' open={open} onClose={onClose}>
      <Modal.Header>Confirm invite deletion</Modal.Header>
      <Modal.Content>
        <p>
          Are you sure you want to delete this account invite for{' '}
          <strong>{account.EmailAddress}</strong>? This action is irreversible.
        </p>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button negative onClick={onConfirm}>
          Delete
        </Button>
      </Modal.Actions>
    </Modal>
  ) : null

const CreateSuccessMessage = ({ emailAddress, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Sent account invite to <strong>{emailAddress}</strong>.
    </Message.Content>
  </Message>
)

const CreateFailureMessage = ({ emailAddress, errorMessage, dismiss }) => (
  <Message onDismiss={dismiss} negative>
    <Message.Content>
      <p>
        Failed to send account invite to <strong>{emailAddress}</strong>.
      </p>
      {errorMessage && <p>Error message: {errorMessage}</p>}
    </Message.Content>
  </Message>
)

const ResendSuccessMessage = ({ account, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Resent account invite to <strong>{account.EmailAddress}</strong>.
    </Message.Content>
  </Message>
)

const ResendFailureMessage = ({ account, errorMessage, dismiss }) => (
  <Message onDismiss={dismiss} negative>
    <Message.Content>
      <p>
        Failed to resend account invite to{' '}
        <strong>{account.EmailAddress}</strong>.
      </p>
      {errorMessage && <p>Error message: {errorMessage}</p>}
    </Message.Content>
  </Message>
)

const DeleteSuccessMessage = ({ account, dismiss }) => (
  <Message onDismiss={dismiss} positive>
    <Message.Content>
      Deleted account invite for <strong>{account.EmailAddress}</strong>.
    </Message.Content>
  </Message>
)

const DeleteFailureMessage = ({ account, errorMessage, dismiss }) => (
  <Message onDismiss={dismiss} negative>
    <Message.Content>
      <p>
        Failed to delete account invite for{' '}
        <strong>{account.EmailAddress}</strong>.
      </p>
      {errorMessage && <p>Error message: {errorMessage}</p>}
    </Message.Content>
  </Message>
)
