// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Image } from 'semantic-ui-react'

import {
  isAdmin,
  isAuthenticated,
  isRegistered,
  logout,
  getLoginRedirectUrl
} from 'services/self'

import { cognitoDomain, cognitoClientId } from '../services/api'

// mobx
import { observer } from 'mobx-react'

// fragments
import { fragments } from 'services/get-fragments'

// components
import Register from './Register'

export const NavBar = observer(
  class NavBar extends React.Component {
    getCognitoUrl (type) {
      const redirectUri = getLoginRedirectUrl()
      return `${cognitoDomain}/${type}?response_type=token&client_id=${cognitoClientId}&redirect_uri=${redirectUri}`
    }

    insertAuthMenu () {
      return isAuthenticated() ? (
        <Menu.Menu position='right'>
          {isAdmin() && (
            <Menu.Item as={Link} to='/admin/apis'>
              Admin Panel
            </Menu.Item>
          )}
          {isRegistered() && (
            <Menu.Item key='dashboard' as={Link} to='/dashboard'>
              My Dashboard
            </Menu.Item>
          )}
          <Menu.Item key='signout' as='a' onClick={logout}>
            Sign Out
          </Menu.Item>
        </Menu.Menu>
      ) : (
        <Menu.Menu position='right'>
          <Menu.Item key='register' as='a' href={this.getCognitoUrl('login')}>
            Sign In
          </Menu.Item>
          <Register />
        </Menu.Menu>
      )
    }

    render () {
      /* eslint-disable react/jsx-closing-tag-location */
      return <Menu inverted borderless attached style={{ flex: '0 0 auto' }} stackable>
        <Menu.Item as={Link} to='/'>
          <Image size='mini' src='/custom-content/nav-logo.png' style={{ paddingRight: '10px' }} />
          {fragments.Home.title}
        </Menu.Item>

        <Menu.Item as={Link} to='/getting-started'>{fragments.GettingStarted.title}</Menu.Item>
        <Menu.Item as={Link} to='/apis'>{fragments.APIs.title}</Menu.Item>

        {this.insertAuthMenu()}
      </Menu>
      /* eslint-enable react/jsx-closing-tag-location */
    }
  }
)

export default NavBar
