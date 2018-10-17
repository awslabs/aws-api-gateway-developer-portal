import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Image } from 'semantic-ui-react'

import { isAuthenticated } from 'services/self'
import logo from 'logo.png'

// components
import SignIn from './SignIn'
import Register from './Register'
import SignOut from './SignOut'

export const NavBar = () => {
  let authed = isAuthenticated()
  return (
    <Menu inverted borderless attached style={{ flex: "0 0 auto" }}>
      <Menu.Item as={Link} to="/">
        <Image size='mini' src={logo} />
        Developer Portal
      </Menu.Item>
      <Menu.Item as={Link} to="/getting-started">Getting Started</Menu.Item>
      <Menu.Item as={Link} to="/apis">APIs</Menu.Item>
      <Menu.Menu position="right">
        { authed ? (
          <React.Fragment>
            <SignOut trigger={<Menu.Item as="a" key="logout">Sign Out</Menu.Item>} />
            <Menu.Item as={Link} to="/dashboard" key="dashboard">My Dashboard</Menu.Item>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SignIn trigger={<Menu.Item as="a" key="login">Sign In</Menu.Item>} />
            <Register trigger={<Menu.Item as="a" key="register">Register</Menu.Item>} /> 
          </React.Fragment>
        )}
      </Menu.Menu>
    </Menu>
  )
}

export default NavBar
