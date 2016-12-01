import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import { Redirect } from 'react-router'
import { login } from '../../services/self'

 export default class SignIn extends React.Component {
   state = {
     isSubmitting: false,
     signedIn: false,
     errorMessage: '',
     isOpen: false
   }
   open = () => this.setState({ isSubmitting: false, errorMessage: '', isOpen: true })
   close = () => this.setState({ isOpen: false })
   handleLogin = (...args) => this._handleLogin(...args)

  _handleLogin(event, serializedForm) {
    event.preventDefault()
    this.setState({isSubmitting: true})
    login(serializedForm.email, serializedForm.password)
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
        trigger={<Button primary fluid>Sign In</Button>}
      >
        <Modal.Header>Sign in</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Form onSubmit={this.handleLogin} error={!!this.state.errorMessage} loading={this.state.isSubmitting}>
              <Form.Input label='Email' name='email' />
              <Form.Input type='password' label='Password' name='password' autoComplete='false' />
              <Message error content={this.state.errorMessage} />
            </Form>
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={this.close}>Close</Button>
          <Button primary onClick={this.handleLogin}>Sign In</Button>
        </Modal.Actions>
      </Modal>)
  }
}
