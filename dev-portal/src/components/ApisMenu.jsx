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

function getApisWithStages (selectedApiId, selectedStage, activateFirst) {
  const apiGatewayApiList = _.get(store, 'apiList.apiGateway', []).map(api => ({
    group: api.id,
    id: api.stage,
    title: api.swagger.info.title,
    route: `/apis/${api.id}/${api.stage}`,
    active: (
      (selectedApiId && api.id === selectedApiId) &&
      (!selectedStage || api.stage === selectedStage)
    ),
    stage: api.stage
  }))
  const genericApiList = _.get(store, 'apiList.generic', []).map(api => ({
    group: api.apiId || api.id,
    id: api.stage || api.id,
    title: api.swagger.info.title,
    route: `/apis/${api.id}`,
    active: (
      (selectedApiId && (api.id === selectedApiId || api.apiId === selectedApiId)) &&
      (!selectedStage || api.stage === selectedStage)
    ),
    stage: api.stage
  }))

  const result = _.toPairs(_.groupBy(apiGatewayApiList.concat(genericApiList), 'group'))
    .map(([group, apis]) => ({ group, apis, active: selectedApiId && group === selectedApiId, title: apis[0].title }))

  if (activateFirst && result.length && !_.some(result, 'active')) {
    result[0].active = true
    result[0].apis[0].active = true
  }

  return result
}

export default observer(function ApisMenu (props) {
  // If we're still loading, display a spinner.
  // If we're not loading, and we don't have any apis, display a message.
  // If we're not loading, and we have some apis, render the appropriate api subsections for apiGateway and generic apis
  if (!store.apiList.loaded) {
    return <Loader active />
  }

  const apiGroupList = getApisWithStages(
    props.path.url !== '/apis/search' && props.path.params.apiId,
    props.path.params.stage,
    props.activateFirst
  )

  if (!apiGroupList.length) {
    return <p style={{ padding: '13px 16px', color: 'whitesmoke' }}>No APIs Published</p>
  }

  return (
    <Menu inverted vertical borderless attached style={{ flex: '0 0 auto', width: 'auto' }}>
      <Menu.Header
        as={Link}
        className='item'
        to='/apis/search'
        active={props.path.url === '/apis/search'}
        style={{
          padding: '13px 5px 13px 16px',
          color: 'lightsteelblue',
          fontWeight: '400',
          fontSize: '1em'
        }}
      >
        Search APIs
      </Menu.Header>

      <Menu.Header
        style={{
          padding: '13px 5px 13px 16px',
          color: 'lightsteelblue'
        }}
      >
        APIs
      </Menu.Header>

      <>
        {apiGroupList.map(({ apis, title, group, active }) => (
          apis.length === 1
            ? <Menu.Item key={group} as={Link} to={apis[0].route} active={active}>
              {title}{apis[0].stage ? ` (${apis[0].stage})` : null}
            </Menu.Item>
            : <Menu.Item key={group} className='link' active={active}>
              {title}
              <Menu.Menu>
                {apis.map(({ route, stage, active, id }) => (
                  <Menu.Item key={id} as={Link} to={route} active={active} style={{ fontWeight: '400' }}>
                    {stage}
                  </Menu.Item>
                ))}
              </Menu.Menu>
            </Menu.Item>
        ))}
      </>
    </Menu>
  )
})
