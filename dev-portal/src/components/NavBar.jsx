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
import { apiGatewayClient } from "../services/api";

async function tryAdminCall() {
    let client = await apiGatewayClient()
    let response = await client.get('/admin/catalog/visibility', {}, {})
    console.log(response)
    return response
}

export const NavBar = observer(
  class NavBar extends React.Component {
    insertAuthMenu(authenticated) {
      if (authenticated) {
        return (
          <Menu.Menu position="right">
            <Menu.Item key="signout" as="a" onClick={logout}>Sign Out</Menu.Item>
            <Menu.Item key="dashboard" as={Link} to="/dashboard">My Dashboard</Menu.Item>
          </Menu.Menu>
        )
      } else {
          return (
            <Menu.Menu position="right">
              <SignIn
                  key="signin"
                  trigger={<Menu.Item as="a">Sign In</Menu.Item>} />
              <Register/>
            </Menu.Menu>
          )
      }
    }

    render() {
      return <Menu inverted borderless attached style={{ flex: "0 0 auto" }}>
        <Menu.Item as={Link} to="/">
          <Image size='mini' src="/custom-content/nav-logo.png" style={{ paddingRight: "10px" }} />
          {fragments.Home.title}
        </Menu.Item>

        <Menu.Item as={Link} to="/getting-started">{fragments.GettingStarted.title}</Menu.Item>
        <Menu.Item as={Link} to="/apis">{fragments.APIs.title}</Menu.Item>
        <Menu.Item onClick={tryAdminCall}>Test Admin API</Menu.Item>

        {this.insertAuthMenu(isAuthenticated())}
      </Menu>
    }
  }
)

export default NavBar
