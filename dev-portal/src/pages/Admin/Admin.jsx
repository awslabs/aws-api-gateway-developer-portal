import React, { Component } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

import { ApiManagement, SideNav } from './'
import { AdminRoute } from './../../';

export class Admin extends Component {
  render() {
    return (
      <Router>
        <div style={{ display: "flex", flex: "1 1 auto", overflow: "hidden" }}>
          <SideNav style={{ flex: "0 0 auto" }} />
          <div style={{ flex: "1 1 auto", overflow: 'auto' }}>
            <AdminRoute exact path="/admin" component={ApiManagement} />
            <AdminRoute path="/admin/apis" component={ApiManagement} />
          </div>
        </div>
      </Router>
    )
  }
}
