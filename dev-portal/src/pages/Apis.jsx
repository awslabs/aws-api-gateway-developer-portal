// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

// swagger-ui
import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'

// semantic-ui
import { Container, Header, Icon } from 'semantic-ui-react'

// services
import { isAuthenticated } from 'services/self'
import { updateUsagePlansAndApisList, getApi } from 'services/api-catalog'

// components
import ApisMenu from 'components/ApisMenu'
import SwaggerLayoutPlugin from 'components/SwaggerUiLayout'
import PageWithSidebar from 'components/PageWithSidebar'

// state
import { store } from 'services/state.js'
import { observer } from 'mobx-react'

export default observer(class ApisPage extends React.Component {
  componentDidMount () { this.updateApi().then(() => updateUsagePlansAndApisList(true)) }
  componentDidUpdate () { this.updateApi() }

  updateApi () {
    return getApi(this.props.match.params.apiId || 'ANY', true, this.props.match.params.stage)
      .then(api => {
        if (api) {
          const swaggerUiConfig = {
            dom_id: '#swagger-ui-container',
            plugins: [SwaggerLayoutPlugin],
            supportedSubmitMethods: [],
            spec: api.swagger,
            onComplete: () => {
              if (store.apiKey) { uiHandler.preauthorizeApiKey('api_key', store.apiKey) }
            }
          }
          if (isAuthenticated()) {
            delete swaggerUiConfig.supportedSubmitMethods
          }
          const uiHandler = SwaggerUI(swaggerUiConfig)
        }
      })
  }

  render () {
    let errorHeader
    let errorBody

    if (store.apiList.loaded) {
      if (!store.apiList.apiGateway.length && !store.apiList.generic.length) {
        errorHeader = 'No APIs Published'
        errorBody = 'Your administrator hasn\'t added any APIs to your account. Please contact them to publish an API.'
      } else if (!store.api) {
        errorHeader = 'No Such API'
        errorBody = 'The selected API doesn\'t exist.'
      }
    }

    return (
      <PageWithSidebar
        sidebarContent={<ApisMenu path={this.props.match} />}
        SidebarPusherProps={{ className: 'swagger-section' }}
      >
        <div className='swagger-ui-wrap' id='swagger-ui-container' style={{ padding: '0 20px' }}>
          {errorHeader && errorBody && (
            <>
              <Header as='h2' icon textAlign='center' style={{ padding: '40px 0px' }}>
                <Icon name='warning sign' circular />
                <Header.Content>{errorHeader}</Header.Content>
              </Header>
              <Container text textAlign='justified'>
                <p>{errorBody}</p>
              </Container>
            </>
          )}
        </div>
      </PageWithSidebar>
    )
  }
})
