import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import {login} from '../../js/devportal'

 export default class SignIn extends React.Component {
  constructor(props){
    super(props)

    this.handleLogin = this.handleLogin.bind(this)
  }

  handleLogin(event, serializedForm) {
    event.preventDefault()
    login(serializedForm.email, serializedForm.password)
  }

  render() {
    const errorMessage = ''
    const isSubmitting = false

    return (
      <Modal size='small' trigger={<Button primary fluid>Sign In</Button>}>
        <Modal.Header>Sign in</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Form onSubmit={this.handleLogin} error={errorMessage !== ''} loading={isSubmitting}>
              <Form.Input label='Email' name='email' />
              <Form.Input type='password' label='Password' name='password' autoComplete='false' />
              <Button primary type='submit'>Sign In</Button>
              <Message
                error
                header='Action Forbidden'
                content={errorMessage}
              />
            </Form>
          </Modal.Description>
        </Modal.Content>
      </Modal>)
  }
}
