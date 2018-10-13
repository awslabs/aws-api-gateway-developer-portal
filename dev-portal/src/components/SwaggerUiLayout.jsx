import React from 'react'

// semantic-ui
import { Button, Header, Image, Container } from 'semantic-ui-react'

// services
import { subscribe, unsubscribe } from 'services/api-catalog'
import { isAuthenticated } from 'services/self'

// state
import { observer } from 'mobx-react'
import { store } from 'services/state.js'


// Create the plugin that provides our layout component
export const SwaggerLayoutPlugin = () => ({ components: { InfoContainer: InfoReplacement } })

// replaces the InfoContainer component
// https://github.com/swagger-api/swagger-ui/blob/dd3afdc45656bda2a64ae6a7f9bdad006ea98149/src/core/components/layouts/base.jsx

const InfoReplacement = ({ specSelectors }) => {
  const basePath = specSelectors.basePath()
  const host = specSelectors.host()
  const externalDocs = specSelectors.externalDocs()
  
  return (
    <Container fluid textAlign='left' style={{ padding: "40px 0px" }}>
      <Image size='small' floated="left" src={store.api.image} style={{ marginRight: "40px" }} />
      <Header as='h1'>{store.api.swagger.info.title}</Header>
      <p>API Version: {store.api.swagger.info.version}</p>
      <p>API Endpoint: https://{host}{basePath}</p>
      <p>{externalDocs}</p>
      <SubscriptionButtons />
    </Container>
  )
}

const SubscriptionButtons = observer(class SubscriptionButtons extends React.Component {
  state = {}

  render() {
    const { api } = store
    return (
      (api && isAuthenticated()) ? (
        api.subscribed ? (
          <Button onClick={() => unsubscribe(api.usagePlan.id)}>Unsubscribe</Button>
        ) : (
            <Button onClick={() => subscribe(api.usagePlan.id)} >Subscribe</Button>
          )
      ) : null
    )
  }
})


export default SwaggerLayoutPlugin