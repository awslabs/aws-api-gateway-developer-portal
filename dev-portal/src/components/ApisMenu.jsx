// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Link, Redirect } from 'react-router-dom'

// semantic-ui
import { Menu, Loader } from 'semantic-ui-react'

// store
import { observer } from 'mobx-react'
import { store } from 'services/state'

// utilities
import _ from 'lodash'
import Sidebar from 'components/Sidebar/Sidebar'
import SidebarHeader from 'components/Sidebar/SidebarHeader'
import MenuLink from 'components/MenuLink'

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

  return _.toPairs(_.groupBy(apiGatewayApiList.concat(genericApiList), 'group'))
    .map(([group, apis]) => ({ group, apis, active: _.some(apis, 'active'), title: apis[0].title }))
}

export default observer(function ApisMenu (props) {
  // If we're still loading, display a spinner.
  // If we're not loading, and we don't have any apis, display a message.
  // If we're not loading, and we have some apis, render the appropriate api subsections for apiGateway and generic apis
  if (!store.apiList.loaded) {
    return <Loader active />
  }

  const apiGroupList = getApisWithStages(
    props.activateFirst && props.path.params.apiId,
    props.path.params.stage,
    props.activateFirst
  )

  if (!apiGroupList.length) {
    return <p style={{ padding: '13px 16px', color: 'whitesmoke' }}>No APIs Published</p>
  }

  if (props.activateFirst && !props.path.params.apiId) {
    return <Redirect to={apiGroupList[0].apis[0].route} />
  }

  return (
    <Sidebar>
      <SidebarHeader
        as={Link}
        className='item'
        to='/apis/search'
        active={props.path.url === '/apis/search'}
        style={{ fontWeight: '400', fontSize: '1em' }}
      >
        Search APIs
      </SidebarHeader>

      <SidebarHeader>APIs</SidebarHeader>

      <>
        {apiGroupList.map(({ apis, title, group, active }) => (
          <MenuLink key={group} active={active}>
            {title}
            <Menu.Menu>
              {apis.map(({ route, stage, active, id }) => (
                <MenuLink key={id} to={route} active={active} style={{ fontWeight: '400' }}>
                  {stage}
                </MenuLink>
              ))}
            </Menu.Menu>
          </MenuLink>
        ))}
      </>
    </Sidebar>
  )
})
