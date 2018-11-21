// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Link } from 'react-router-dom'

// semantic-ui
import { Menu, Loader } from 'semantic-ui-react'

// store
import { observer } from 'mobx-react'
import { store } from 'services/state'

// utilities
import _ from 'lodash'

function isActive (apiId, selectedApiId) {
  return (selectedApiId) ? apiId === selectedApiId : false
}

export default observer(function ApisMenu() {
  const { path, ...props } = this.props

  console.log(store)

  const loadingApis = !store.apiList.loaded
  const hasGatewayApis = !!_.get(store, 'apiList.apiGateway.length')
  const hasGenericApis = !!_.get(store, 'apiList.generic.length')

  // either grab the selectedApiId from the path OR
  // grab it from the first apiGateway api OR
  // grab it from the first generic api
  const selectedApiId = (
    this.props.path.params.apiId ||
    (hasGatewayApis && store.apiList.apiGateway[0].id) ||
    (hasGenericApis && store.apiList.generic[0].id)
  )

  // If we're still loading, display a spinner.
  // If we're not loading, and we don't have any apis, display a message.
  // If we're not loading, and we have some apis, render the appropriate api subsections for apiGateway and generic apis 
  return (
    <Menu inverted vertical attached style={{ margin: 0, borderRadius: 0 }} {...props}>
      {loadingApis ? (
        <Loader active />
      ) : (
        (hasGatewayApis || hasGenericApis) ? (
          <React.Fragment>
            {hasGatewayApis && <ApiSubsection title="Subscribable" listOfApis={store.apiList.apiGateway} selectedApiId={selectedApiId} />}
            {hasGenericApis && <ApiSubsection title="Not Subscribable" listOfApis={store.apiList.generic} selectedApiId={selectedApiId} />}
          </React.Fragment>
        ) : (
          <p style={{ padding: "13px 16px", color: "whitesmoke" }}>No APIs Published</p>
        )
      )}
    </Menu>
  )
})

function ApiSubsection({ title, listOfApis, selectedApiId }) {
  return (
    <React.Fragment>
      <Menu.Header
        style={{
          padding: "13px 5px 13px 16px",
          color: 'lightsteelblue'
        }}
      >
        {title}
      </Menu.Header>
      {listOfApis.map(api => (
        <Menu.Item
          key={api.id}
          as={Link}
          to={`/apis/${api.id}`}
          active={isActive(api.id.toString(), selectedApiId.toString())}
        >
          {api.swagger.info.title}
        </Menu.Item>
      ))}
    </React.Fragment>
  )
}