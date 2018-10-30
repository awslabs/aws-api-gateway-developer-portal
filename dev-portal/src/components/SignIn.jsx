// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'
import { Redirect } from 'react-router-dom'
import { login } from 'services/self'
import { confirmMarketplaceSubscription } from 'services/api-catalog'

 export default class SignIn extends React.Component {
   state = {
     isSubmitting: false,
     signedIn: false,
     errorMessage: '',
     isOpen: false
   }
   open = () => this.setState({ isSubmitting: false, errorMessage: '', isOpen: true })
   close = () => this.setState({ isOpen: false })

   handleChange = (event, { name, value }) => this.setState({ [name]: value })
   handleLogin = (event) => {
    event.preventDefault()
    this.setState({isSubmitting: true})

    login(this.state.email, this.state.password)
    .then(() => {
        this.setState({signedIn: true, isSubmitting: false, errorMessage: ''})

        const { usagePlanId, token } = this.props

        if (usagePlanId && token) {
   	       return confirmMarketplaceSubscription(usagePlanId, token)
        }
    })
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
        trigger={this.props.trigger}
      >
        <Modal.Header>Sign in</Modal.Header>
        <Modal.Content>
          <Form onSubmit={this.handleLogin} error={!!this.state.errorMessage} loading={this.state.isSubmitting}>
            <Form.Input label='Email' name='email' onChange={this.handleChange} />
            <Form.Input type='password' label='Password' name='password' autoComplete='false' onChange={this.handleChange} />
            <Message error content={this.state.errorMessage} />
            <Modal.Actions style={{textAlign: 'right'}}>
              <Button type='button' onClick={this.close}>Close</Button>
              <Button primary type='submit'>Sign In</Button>
            </Modal.Actions>
          </Form>
        </Modal.Content>
      </Modal>)
  }
}
