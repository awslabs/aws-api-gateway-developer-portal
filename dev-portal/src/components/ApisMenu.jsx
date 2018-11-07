// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Link } from 'react-router-dom'

// semantic-ui
import { Menu, Loader } from 'semantic-ui-react'

// store
import { observer } from 'mobx-react'
import { store } from 'services/state'

const MenuHeader = ({ children }) => <Menu.Header style={{ padding: "13px 5px 13px 16px", color: 'lightsteelblue' }} >
  {children}</Menu.Header>

export default observer(class ApisMenu extends React.Component {
  state = {
    selectedApi: ''
  }

  componentDidMount() {
    if (this.props.path.params)
      this.setState(prev => ({
        ...prev,
        selectedApi: this.props.path.params.apiId
      }))
  }

  handleClick = (id) => {
    console.log(`${id}`)
    this.setState(prev => ({...prev, selectedApi: id}))
  }

  isActive = (apiId) => apiId === this.state.selectedApi

  render() {
    const { path, ...props } = this.props
    return (
      <Menu inverted vertical attached style={{ margin: 0, borderRadius: 0 }} {...props}>
        <MenuHeader>Subscribable</MenuHeader>
        {
          !store.apiList ? (<Loader active />) : (
            store.apiList.apiGateway && (
              store.apiList.apiGateway.length ? store.apiList.apiGateway.map((api) => (
                <Menu.Item
                  key={api.id}
                  as={Link}
                  to={`/apis/${api.id}`}
                  active={this.isActive(api.id.toString())}
                  onClick={() => this.handleClick(api.id)}
                >
                  {api.swagger.info.title}
                </Menu.Item>
              )) : (
                  <p style={{ padding: "13px 16px", color: "whitesmoke" }}>No APIs Published</p>
                )
            )
          )
        }
        {store.apiList && store.apiList.generic && <MenuHeader>Not Subscribable</MenuHeader>}
        {
          store.apiList && store.apiList.generic ?
            store.apiList.generic.map(({ id, swagger }) => (
              <Menu.Item
                key={id}
                as={Link}
                to={`/apis/${id}`}
                active={this.isActive(id.toString())}
                onClick={() => this.handleClick(id)}
              >
                {swagger.info.title}
              </Menu.Item>
            )) : undefined
        }
      </Menu>
    )
  }
})
