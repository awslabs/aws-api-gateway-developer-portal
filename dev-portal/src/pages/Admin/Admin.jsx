import React, { Component } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

import { ApiManagement, SideNav } from './'
import { AdminRoute } from './../../'

import RegisteredAccounts from 'pages/Admin/Accounts/RegisteredAccounts'
import AdminAccounts from 'pages/Admin/Accounts/AdminAccounts'
import AccountInvites from 'pages/Admin/Accounts/AccountInvites'
import AccountRequests from 'pages/Admin/Accounts/AccountRequests'

export class Admin extends Component {
  render() {
    return (
      <Router>
        <div style={{ display: "flex", flex: "1 1 auto", overflow: "hidden" }}>
          <SideNav style={{ flex: "0 0 auto" }} />
          <div style={{ flex: "1 1 auto", overflow: 'auto' }}>
            <AdminRoute exact path="/admin" component={ApiManagement} />
            <AdminRoute path="/admin/apis" component={ApiManagement} />
            <AdminRoute exact path="/admin/accounts" component={RegisteredAccounts} />
            <AdminRoute exact path="/admin/accounts/admins" component={AdminAccounts} />
            <AdminRoute exact path="/admin/accounts/invites" component={AccountInvites} />
            <AdminRoute exact path="/admin/accounts/requests" component={AccountRequests} />
          </div>
        </div>
      </Router>
    )
  }
}
