// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Redirect } from 'react-router-dom'

import { getLoginRedirectUrl } from 'services/self'
import { cognitoDomain, cognitoClientId } from 'services/api'
import MenuLink from 'components/MenuLink'

export default function Register () {
  return this.props.signedIn ? <Redirect to='/apis' /> : (
    <MenuLink to={`${cognitoDomain}/signup?response_type=token&client_id=${cognitoClientId}&redirect_uri=${getLoginRedirectUrl()}`}>
      Register
    </MenuLink>
  )
}
