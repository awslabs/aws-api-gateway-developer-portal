import React, { PureComponent } from 'react'
import { Header, Container, Image, Button } from 'semantic-ui-react'
import { isAuthenticated } from 'services/self'
import { confirmMarketplaceSubscription } from 'services/api-catalog'
import { getQueryString } from 'services/misc'
import logo from '../logo.png'

export default class HomePage extends PureComponent {
  constructor() {
    super()
    this.state = {}

    const { usagePlanId, token } = getQueryString()
    if (usagePlanId && token) {
      this.state = { usagePlanId, token }

      if (isAuthenticated()) {
        confirmMarketplaceSubscription(usagePlanId, token).then(() => {
          window.location.href = '/apis'
        })
      }
    }
  }

  render() {
    return (
      <React.Fragment>
        <Container fluid textAlign='center' style={{ color: "whitesmoke", backgroundColor: "slategray", padding: "40px 0px" }}>
          <Image centered size='small' src={logo} />
          <Header as='h1' style={{ color: "whitesmoke" }}>Developer Portal</Header>
          <p>Let's see some stuff about content.</p>
          <Button positive>Get Started</Button>
        </Container>
        <Container text textAlign='justify' style={{ padding: "40px 0px" }}>
          <Header size='medium'>EXPLORE AND BUILD</Header>
          <p>Read the Getting Started guide to learn how to hit the ground running to get an application up and running in no time.</p>
          <p>See what APIs we have to offer, including extensive documentation, and generated SDKs.</p>
          <p>Sign in to manage your subscriptions, see your current usage, get your API Key, and test against our live API.</p>
        </Container>
      </React.Fragment>
    )
  }
}
