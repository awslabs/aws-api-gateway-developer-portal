// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Button, Popup } from 'semantic-ui-react'
import { Redirect } from 'react-router-dom'
import { login } from 'services/self'
import { confirmMarketplaceSubscription } from 'services/api-catalog'

import { cognitoDomain, cognitoClientId, cognitoAdminDomain, cognitoAdminClientId } from '../services/api'

export default class SignIn extends React.Component {
  redirectUri = `${window.location.protocol}//${window.location.host}/login`

  userSignIn = () => {
    window.location = `${cognitoDomain}/login?response_type=token&client_id=${cognitoClientId}&redirect_uri=${this.redirectUri}`
  }

  adminSignIn = () => {
    window.location = `${cognitoAdminDomain}/login?response_type=token&client_id=${cognitoAdminClientId}&redirect_uri=${this.redirectUri}`
  }

  render() {
    return this.props.signedIn ? <Redirect to='/apis' /> : (
      <Popup
        inverted
        wide
        trigger={ this.props.trigger }
        content={
          <div>
            <Button.Group>
              <Button size='small' onClick={this.adminSignIn}>Admin</Button>
              <Button.Or />
              <Button primary size='small' onClick={this.userSignIn}>User</Button>
            </Button.Group>
          </div>
        }
        on='click'
        position='bottom right'
      />)
  }
}
