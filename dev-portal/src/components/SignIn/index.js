import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import { Redirect } from 'react-router'
import { login } from '../../services/self'

 export default class SignIn extends React.Component {
  constructor(props){
    super(props)

    this.state = {
      isSubmitting: false,
      signedIn: false,
      errorMessage: ''
    }

    this.handleLogin = this.handleLogin.bind(this)
  }

  handleLogin(event, serializedForm) {
    event.preventDefault()
    this.setState({isSubmitting: true})
    login(serializedForm.email, serializedForm.password)
    .then(() => this.setState({signedIn: true, isSubmitting: false, errorMessage: ''}))
    .catch((e) => this.setState({errorMessage: e, isSubmitting: false}))
  }

  render() {
    return this.state.signedIn ? <Redirect to='/apis' /> : (
      <Modal size='small' trigger={<Button primary fluid>Sign In</Button>}>
        <Modal.Header>Sign in</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Form onSubmit={this.handleLogin} error={!!this.state.errorMessage} loading={this.state.isSubmitting}>
              <Form.Input label='Email' name='email' />
              <Form.Input type='password' label='Password' name='password' autoComplete='false' />
              <Button primary type='submit'>Sign In</Button>
              <Message error content={this.state.errorMessage.toString()} />
            </Form>
          </Modal.Description>
        </Modal.Content>
      </Modal>)
  }
}
