// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react'

// semantic-ui
import { Button, Header, Image, Container } from 'semantic-ui-react'

// markdown for external docs description
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// services
import { subscribe, unsubscribe } from 'services/api-catalog'
import { isAuthenticated } from 'services/self'

import { GetSdkButton } from 'components/GetSdk'

// state
import { observer, Observer } from 'mobx-react'
import { store } from 'services/state.js'

// Create the plugin that provides our layout component
export const SwaggerLayoutPlugin = () => ({ components: { InfoContainer: InfoReplacement } })

function Markdown ({ source }) {
  const rendered = useMemo(() => DOMPurify.sanitize(marked(source, {
    headerIds: false,
    silent: true
  })), [source])

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />
}

// replaces the InfoContainer component
// https://github.com/swagger-api/swagger-ui/blob/dd3afdc45656bda2a64ae6a7f9bdad006ea98149/src/core/components/layouts/base.jsx

// Note: this is called not as a component, but as a function within a class component. Do
// *not* make this a component, and do *not* use hooks or anything similar in it.
function InfoReplacement ({ specSelectors }) {
  let endpoint
  if (specSelectors.hasHost()) {
    endpoint = `https://${specSelectors.host()}${specSelectors.basePath() || ''}`
  } else {
    const servers = specSelectors.servers()
    if (servers && servers.size) endpoint = servers.getIn([0, 'url'])
  }

  const info = specSelectors.info()
  const version = specSelectors.version()
  const externalDocs = specSelectors.externalDocs()
  const apiTitle = info.get('title')
  const apiDescription = info.get('description')
  const docsDescription = externalDocs.get('description')
  const docsUrl = externalDocs.get('url')

  return <Observer>
    {/*
      If no API is loaded, let's just swallow the state and move on. (Swagger UI doesn't offer any
      way to clean up after itself.)
    */}
    {() => store.api == null ? null : <Container fluid textAlign='left' className='fixfloat' style={{ padding: '40px 0px' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: '0 0 auto', marginRight: '20px' }}>
          <Image size='small' src={store.api.logo} />
        </div>
        <div>
          <Header as='h1'>{apiTitle}</Header>
          <div style={{ display: 'flex', paddingBottom: '1em' }}>
            <div style={{ marginRight: '20px' }}>
              {store.api.apiStage == null ? <p style={{ fontWeight: 'bold' }}>Version</p> : null}
              {endpoint ? <p style={{ fontWeight: 'bold' }}>Endpoint</p> : null}
              {apiDescription ? <p style={{ fontWeight: 'bold' }}>Description</p> : null}
              {/* <p style={{ fontWeight: "bold" }}>Usage Plan</p> */}
            </div>
            <div>
              {store.api.apiStage == null ? <p>{version}</p> : null}
              {endpoint ? <p>{endpoint}</p> : null}
              {apiDescription ? <p>{apiDescription}</p> : null}
              {/* <p>{store.api.usagePlan.name}</p> */}
            </div>
          </div>
          {externalDocs ? (
            <div style={{ paddingBottom: '1em' }}>
              {docsDescription ? <Markdown source={docsDescription} /> : null}
              <a href={docsUrl}>{docsUrl}</a>
            </div>
          ) : null}
          <SubscriptionButtons />
          {store.api.sdkGeneration && <GetSdkButton />}
        </div>
      </div>
    </Container>}
  </Observer>
}

const SubscriptionButtons = observer(class SubscriptionButtons extends React.Component {
  render () {
    const { api } = store

    if (!api || !isAuthenticated()) {
      return null
    }

    const apiIsSubscribable = !!(api && api.apiStage && api.usagePlan)

    if (apiIsSubscribable) {
      return (
        api.subscribed ? (
          <Button onClick={() => unsubscribe(api.usagePlan.id)}>Unsubscribe</Button>
        ) : (
          <Button onClick={() => subscribe(api.usagePlan.id)}>Subscribe</Button>
        )
      )
    } else {
      return <Header style={{ marginTop: '0em' }} as='h4' color='grey'>This version of the API is not configured to be subscribable from the portal. Please contact an admin for more details.</Header>
    }
  }
})

export default SwaggerLayoutPlugin
