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

export const NavBar = observer(() => {
  return (
    <Menu inverted borderless attached style={{ flex: "0 0 auto" }}>
      <Menu.Item as={Link} to="/">
        <Image size='mini' src="/custom-content/nav-logo.png" style={{ paddingRight: "10px" }} />
        {fragments.Home.title}
      </Menu.Item>
      <Menu.Item as={Link} to="/getting-started">{fragments.GettingStarted.title}</Menu.Item>
      <Menu.Item as={Link} to="/apis">{fragments.APIs.title}</Menu.Item>
      <Menu.Menu position="right">
        { isAuthenticated() ? (
          <React.Fragment>
            <Menu.Item as="a" onClick={logout}>Sign Out</Menu.Item>
            <Menu.Item as={Link} to="/dashboard">My Dashboard</Menu.Item>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SignIn trigger={<Menu.Item as="a">Sign In</Menu.Item>} />
            <Register trigger={<Menu.Item as="a">Register</Menu.Item>} /> 
          </React.Fragment>
        )}
      </Menu.Menu>
    </Menu>
  )
})

export default NavBar
