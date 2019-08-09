import React, { Component } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

import { ApiManagement, SideNav } from './'
import { AdminRoute } from './../../';

import PageWithSidebar from 'components/PageWithSidebar'

export class Admin extends Component {
  render() {
    return (
      <Router>
        <PageWithSidebar sidebarContent={<SideNav />}>
          <React.Fragment>
            <AdminRoute exact path="/admin" component={ApiManagement} />
            <AdminRoute path="/admin/apis" component={ApiManagement} />
          </React.Fragment>
        </PageWithSidebar>
      </Router>
    )
  }
}
