// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

// swagger-ui
import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'

// semantic-ui
import { Container, Header, Icon } from 'semantic-ui-react'

// services
import { getApi } from 'services/api-catalog'
import { isAuthenticated } from 'services/self'

// components
import ApisMenu from 'components/ApisMenu'
import SwaggerLayoutPlugin from 'components/SwaggerUiLayout'

// state
import { store } from 'services/state.js'
import { observer } from 'mobx-react'

export default observer(class ApisPage extends React.Component {
  componentDidMount() { this.updateApi() }
  componentDidUpdate() { this.updateApi() }

  updateApi = () => {
    getApi(this.props.match.params.apiId || 'ANY', true)
      .then(api => {
        if (api) {
          let swaggerUiConfig = {
            dom_id: '#swagger-ui-container',
            plugins: [SwaggerLayoutPlugin],
            supportedSubmitMethods: [],
            spec: api.swagger,
            onComplete: () => {
              if (store.apiKey)
                uiHandler.preauthorizeApiKey("api_key", store.apiKey)
            }
          }
          if (isAuthenticated()) {
            delete swaggerUiConfig.supportedSubmitMethods
          }
          let uiHandler = SwaggerUI(swaggerUiConfig)
        }
      })
  }

  render() {
    let errorHeader
    let errorBody 

    if (!store.apiList.apiGateway.length && !store.apiList.generic.length) {
      errorHeader = `No APIs Published`
      errorBody = `Your administrator hasn't added any APIs to your account. Please contact them to publish an API.`
    } else if (!store.api) {
      errorHeader = `No Such API`
      errorBody = `The selected API doesn't exist.`
    }

    return (
      <div style={{ display: "flex", flex: "1 1 auto", overflow: "hidden" }}>
        <ApisMenu path={this.props.match} style={{ flex: "0 0 auto" }} />
        <div className="swagger-section" style={{ flex: "1 1 auto", overflow: 'auto' }}>
          <div className="swagger-ui-wrap" id="swagger-ui-container" style={{ padding: "0 20px" }}>
            {errorHeader && errorBody && (
              <React.Fragment>
                <Header as='h2' icon textAlign="center" style={{ padding: "40px 0px" }}>
                  <Icon name='warning sign' circular />
                  <Header.Content>{errorHeader}</Header.Content>
                </Header>
                <Container text textAlign='justified'>
                  <p>{errorBody}</p>
                </Container>
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    )
  }
})
