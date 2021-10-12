// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

import { isAdmin } from 'services/self'

import { observer } from 'mobx-react'

import { Menu } from 'semantic-ui-react'
import Sidebar from 'components/Sidebar/Sidebar'
import SidebarHeader from 'components/Sidebar/SidebarHeader'
import MenuLink from 'components/MenuLink'

export const SideNav = observer(() => isAdmin() && (
  <Sidebar>
    <SidebarHeader>Admin</SidebarHeader>
    <MenuLink to='/admin/apis'>APIs</MenuLink>
    <MenuLink>
      Accounts
      <Menu.Menu>
        <MenuLink to='/admin/accounts'>Users</MenuLink>
        <MenuLink to='/admin/accounts/admins'>Admins</MenuLink>
        <MenuLink to='/admin/accounts/invites'>Invites</MenuLink>
        {/* <MenuLink to='/admin/accounts/requests'>Requests</MenuLink> */}
      </Menu.Menu>
    </MenuLink>
  </Sidebar>
))
