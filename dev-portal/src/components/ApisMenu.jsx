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

function isActive (apiId, selectedApiId, stage, selectedStage) {
  if (!selectedStage) return (selectedApiId) ? apiId === selectedApiId : false
  return (selectedApiId) ? apiId === selectedApiId && stage === selectedStage : false
}

export default observer(function ApisMenu (props) {
  const loadingApis = !store.apiList.loaded
  const hasGatewayApis = !!_.get(store, 'apiList.apiGateway.length')
  const hasGenericApis = !!_.get(store, 'apiList.generic.length')

  // either grab the selectedApiId from the path OR
  // grab it from the first apiGateway api OR
  // grab it from the first generic api
  let selectedApiId = (
    props.path.params.apiId ||
    (hasGatewayApis && store.apiList.apiGateway[0].id) ||
    (hasGenericApis && store.apiList.generic[0].id)
  )

  if (props.path.url === '/apis/search') {
    selectedApiId = false
  }

  const selectedStage = (props.path.params.stage || (hasGatewayApis && store.apiList.apiGateway[0].stage))

  // If we're still loading, display a spinner.
  // If we're not loading, and we don't have any apis, display a message.
  // If we're not loading, and we have some apis, render the appropriate api subsections for apiGateway and generic apis
  if (loadingApis) {
    return <Loader active />
  }
  if (!hasGatewayApis && !hasGenericApis) {
    return <p style={{ padding: '13px 16px', color: 'whitesmoke' }}>No APIs Published</p>
  }
  return (
    <>
      <Menu.Item key='search' as={Link} to='/apis/search' active={props.path.url === '/apis/search'}>Search APIs</Menu.Item>
      {hasGatewayApis && <ApiSubsection title='Subscribable' listOfApis={store.apiList.apiGateway} selectedApiId={selectedApiId} selectedStage={selectedStage} />}
      {hasGenericApis && <GenericApiSubsection title='Not Subscribable' listOfApis={store.apiList.generic} selectedApiId={selectedApiId} />}
    </>
  )
})

function GenericApiSubsection ({ title, listOfApis, selectedApiId }) {
  return (
    <Menu inverted vertical borderless attached style={{ flex: '0 0 auto', width: 'auto' }}>
      <Menu.Header
        style={{
          padding: '13px 5px 13px 16px',
          color: 'lightsteelblue'
        }}
      >
        {title}
      </Menu.Header>
      {_.toPairs(_.groupBy(listOfApis, api => api.apiId || api.id)).map(([id, apis]) => (
        <Menu.Item
          key={id}
          className='link'
          active={apis.some(api => isActive(`${api.id}`, `${selectedApiId}`))}
        >
          {apis[0].swagger.info.title}
          {apis.length === 1 ? (
            apis[0].stage != null ? ` (${apis[0].stage})` : null
          ) : (
            <Menu.Menu>
              {apis.map(api => (
                <Menu.Item
                  key={api.id}
                  as={Link}
                  to={`/apis/${api.id}`}
                  active={isActive(api.id, `${selectedApiId}`)}
                  style={{ 'font-weight': '400' }}
                >
                  {api.stage}
                </Menu.Item>
              ))}
            </Menu.Menu>
          )}
        </Menu.Item>
      ))}
    </Menu>
  )
}

function ApiSubsection ({ title, listOfApis, selectedApiId, selectedStage = false }) {
  return (
    <Menu inverted vertical borderless attached style={{ flex: '0 0 auto', width: 'auto' }}>
      <Menu.Header
        style={{
          padding: '13px 5px 13px 16px',
          color: 'lightsteelblue'
        }}
      >
        {title}
      </Menu.Header>
      {_.toPairs(_.groupBy(listOfApis, "id")).map(([id, apis]) => (
        <Menu.Item
          key={id}
          className='link'
          active={isActive(id, `${selectedApiId}`)}
        >
          {apis[0].swagger.info.title}
          {apis.length === 1 ? ` (${apis[0].stage})` : (
            <Menu.Menu>
              {apis.map(api => (
                <Menu.Item
                  key={`${id}_${api.stage}`}
                  as={Link}
                  to={`/apis/${id}/${api.stage}`}
                  active={isActive(id, `${selectedApiId}`, `${api.stage}`, selectedStage)}
                  style={{ 'font-weight': '400' }}
                >
                  {api.stage}
                </Menu.Item>
              ))}
            </Menu.Menu>
          )}
        </Menu.Item>
      ))}
    </Menu>
  )
}
