import React, { Component } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

import { ApiManagement, SideNav } from './'
import { AdminRoute } from './../../'
import PageWithSidebar from 'components/PageWithSidebar'

import RegisteredAccounts from 'pages/Admin/Accounts/RegisteredAccounts'
import AdminAccounts from 'pages/Admin/Accounts/AdminAccounts'
import AccountInvites from 'pages/Admin/Accounts/AccountInvites'
import PendingRequests from 'pages/Admin/Accounts/PendingRequests'

export class Admin extends Component {
  render () {
    return (
      <Router>
        <PageWithSidebar sidebarContent={<SideNav />}>
          <>
            <AdminRoute exact path='/admin' component={ApiManagement} />
            <AdminRoute path='/admin/apis' component={ApiManagement} />
            <AdminRoute exact path='/admin/accounts' component={RegisteredAccounts} />
            <AdminRoute exact path='/admin/accounts/admins' component={AdminAccounts} />
            <AdminRoute exact path='/admin/accounts/invites' component={AccountInvites} />
            <AdminRoute exact path='/admin/accounts/requests' component={PendingRequests} />
          </>
        </PageWithSidebar>
      </Router>
    )
  }
}
