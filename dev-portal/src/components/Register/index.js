import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import { Redirect } from 'react-router'
import { register } from '../../services/self'

 export default class Register extends React.Component {
  state = {
    isSubmitting: false,
    signedIn: false,
    errorMessage: '',
    isOpen: false
  }

  open = () => this.setState({ isSubmitting: false, errorMessage: '', isOpen: true })
  close = () => this.setState({ isOpen: false })
  handleRegister = (...args) => this._handleRegister(...args)

  _handleRegister(event, serializedForm) {
    event.preventDefault()
    this.setState({isSubmitting: true})
    register(serializedForm.email, serializedForm.password)
    .then(() => this.setState({signedIn: true, isSubmitting: false, errorMessage: ''}))
    .catch((e) => this.setState({errorMessage: e.message, isSubmitting: false}))
  }

  render() {
    const { isOpen } = this.state

    return this.state.signedIn ? <Redirect to='/apis' /> : (
      <Modal
        size='small'
        open={isOpen}
        onOpen={this.open}
        onClose={this.close}
        trigger={<Button secondary fluid>Register</Button>}
      >
        <Modal.Header>Register</Modal.Header>
        <Modal.Content>
          <Form onSubmit={this.handleRegister} error={!!this.state.errorMessage} loading={this.state.isSubmitting}>
            <Form.Input label='Email' name='email' />
            <Form.Input type='password' label='Password' name='password' autoComplete='false' />
            <Message error content={this.state.errorMessage} />
            <Modal.Actions style={{textAlign: 'right'}}>
              <Button type='button' onClick={this.close}>Close</Button>
              <Button primary type='submit'>Register</Button>
            </Modal.Actions>
          </Form>
        </Modal.Content>
      </Modal>)
    }
}
