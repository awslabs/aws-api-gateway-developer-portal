// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Image } from 'semantic-ui-react'

import { isAuthenticated, logout } from 'services/self'

// mobx
import { observer } from 'mobx-react'

// fragments
import { fragments } from 'services/get-fragments'

// components
import SignIn from './SignIn'
import Register from './Register'

// data
import { cognitoDomain, cognitoClientId } from '../services/api'

export const NavBar = observer(() => {
  return (
    <Menu inverted borderless attached style={{ flex: "0 0 auto" }}>
      <Menu.Item as={Link} to="/">
        <Image size='mini' src="/custom-content/nav-logo.png" style={{ paddingRight: "10px" }} />
        {fragments.Home.title}
      </Menu.Item>

      <Menu.Item as={Link} to="/getting-started">{fragments.GettingStarted.title}</Menu.Item>
      <Menu.Item as={Link} to="/apis">{fragments.APIs.title}</Menu.Item>
      
      {insertAuthMenu(isAuthenticated(), cognitoDomain)}
    </Menu>
  )
})

function insertAuthMenu(authenticated, cognitoDomain) {
  let redirectUri = `${window.location.protocol}//${window.location.host}/login`

  if (authenticated) {
    return (
      <Menu.Menu position="right">
        <Menu.Item key="signout" as="a" onClick={logout}>Sign Out</Menu.Item>
        <Menu.Item key="dashboard" as={Link} to="/dashboard">My Dashboard</Menu.Item>
      </Menu.Menu>
    )
  } else {
    if (cognitoDomain) {
      return (
        <Menu.Menu position="right">
          <Menu.Item key="signin" as="a" href={`${cognitoDomain}/login?response_type=token&client_id=${cognitoClientId}&redirect_uri=${redirectUri}`}>Sign In</Menu.Item>
          <Menu.Item key="register" as="a" href={`${cognitoDomain}/signup?response_type=token&client_id=${cognitoClientId}&redirect_uri=${redirectUri}`}>Register</Menu.Item>
        </Menu.Menu>
      )
    } 
    
    else {
      return (
        <Menu.Menu position="right">
          <SignIn key="signin" trigger={<Menu.Item as="a">Sign In</Menu.Item>} />
          <Register key="register" trigger={<Menu.Item as="a">Register</Menu.Item>} />
        </Menu.Menu>
      )
    }
  }
}

export default NavBar
