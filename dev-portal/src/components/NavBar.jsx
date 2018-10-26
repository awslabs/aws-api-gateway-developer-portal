import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Image } from 'semantic-ui-react'

import { isAuthenticated } from 'services/self'

// mobx
import { observer } from 'mobx-react'

// fragments
import { fragments } from 'services/get-fragments'

// components
import SignIn from './SignIn'
import Register from './Register'
import SignOut from './SignOut'

export const NavBar = observer(() => {
  let authed = isAuthenticated()
  return (
    <Menu inverted borderless attached style={{ flex: "0 0 auto" }}>
      <Menu.Item as={Link} to="/">
        <Image size='mini' src="/custom-content/nav-logo.png" style={{ paddingRight: "10px" }} />
        {fragments.Home.title}
      </Menu.Item>
      <Menu.Item as={Link} to="/getting-started">{fragments.GettingStarted.title}</Menu.Item>
      <Menu.Item as={Link} to="/apis">{fragments.APIs.title}</Menu.Item>
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
})

export default NavBar
