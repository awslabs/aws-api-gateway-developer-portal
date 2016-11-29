import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import { Redirect } from 'react-router'
import { register } from '../../services/self'

 export default class Register extends React.Component {
  constructor(props){
    super(props)

    this.state = {
      isSubmitting: false,
      signedIn: false,
      errorMessage: ''
    }

    this.handleRegister = this.handleRegister.bind(this);
  }

  handleRegister(event, serializedForm) {
    event.preventDefault()
    this.setState({isSubmitting: true})
    register(serializedForm.email, serializedForm.password)
    .then(() => this.setState({signedIn: true, isSubmitting: false, errorMessage: ''}))
    .catch((e) => this.setState({errorMessage: e.message, isSubmitting: false}))
  }

  render() {
    console.log('this.state.signedIn', this.state.signedIn)
    return this.state.signedIn ? <Redirect to='/apis' /> : (
      <Modal size='small' trigger={<Button secondary fluid>Register</Button>}>
        <Modal.Header>Register</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Form onSubmit={this.handleRegister} error={!!this.state.errorMessage} loading={this.state.isSubmitting}>
              <Form.Input label='Email' name='email' />
              <Form.Input type='password' label='Password' name='password' autoComplete='false' />
              <Button primary type='submit'>Register</Button>
              <Message error content={this.state.errorMessage} />
            </Form>
          </Modal.Description>
        </Modal.Content>
      </Modal>)
    }
}
