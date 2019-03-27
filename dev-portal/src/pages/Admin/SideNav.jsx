import React from 'react'

import { isAdmin } from 'services/self'

import { observer } from 'mobx-react'

import { Link } from 'react-router-dom'
import { Menu } from 'semantic-ui-react'


export const SideNav = observer(() => (
  isAdmin() &&
  (<Menu inverted vertical borderless attached style={{ flex: "0 0 auto" }}>
    <Menu.Item as={Link} to="/admin/apis">APIs</Menu.Item>
  </Menu>)
))
