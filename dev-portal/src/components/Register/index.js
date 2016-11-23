import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import {start, register} from '../../js/devportal'

 export default class SignIn extends React.Component {
  constructor(props){
    super(props)

    this.handleRegister = this.handleRegister.bind(this);
  }

  componentDidMount() {
    start()
  }

  handleRegister(event, serializedForm) {
    event.preventDefault()
    register(serializedForm.email, serializedForm.password)
  }

  render() {
    const errorMessage = ''
    const isSubmitting = false

    return (
      <Modal size='small' trigger={<Button secondary fluid>Register</Button>}>
        <Modal.Header>Register</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Form onSubmit={this.handleRegister} error={errorMessage !== ''} loading={isSubmitting}>
              <Form.Input label='Email' name='email' />
              <Form.Input type='password' label='Password' name='password' autoComplete='false' />
              <Button primary type='submit'>Register</Button>
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
