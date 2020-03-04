// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Menu } from 'semantic-ui-react'
import { Redirect } from 'react-router-dom'

import { getLoginRedirectUrl } from 'services/self'
import { cognitoDomain, cognitoClientId } from '../services/api'

export default class Register extends React.Component {
  constructor (props) {
    super(props)
    this.redirectUri = getLoginRedirectUrl()
  }

  render () {
    return this.props.signedIn ? <Redirect to='/apis' /> : (
      <Menu.Item
        key='register' as='a'
        href={`${cognitoDomain}/signup?response_type=token&client_id=${cognitoClientId}&redirect_uri=${this.redirectUri}`}
      >
          Register
      </Menu.Item>
    )
  }
}
