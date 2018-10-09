import React, { PureComponent } from 'react'
import { Link } from 'react-router-dom'
import { Segment, Divider, Card } from 'semantic-ui-react'
import SignIn from '../components/SignIn'
import Register from '../components/Register'
import { isAuthenticated } from '../services/self'
import { confirmMarketplaceSubscription } from '../services/api-catalog'
import { getQueryString } from '../services/misc'
import Head from '../components/Head'


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
      <div>
        <Head {...this.props} />
        <Card.Group itemsPerRow={3} stackable style={{textAlign: 'center'}}>
          <Card>
            <Card.Content>
              <Card.Header><Link to='/apis'>APIs</Link></Card.Header>
              <Card.Description><Link to='/apis'>See what APIs we have on offer</Link>, including extensive documentation. Sign in to manage your subscriptions, see your current usage, get your API Key, and test against our live API.</Card.Description>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content>
              <Card.Header><Link to='/getting-started'>Getting Started</Link></Card.Header>
              <Card.Description>Ready to get started? This is the place that answers all your questions. We'll have you up and running in no time. <Link to='/getting-started'>Let's get started!</Link></Card.Description>
            </Card.Content>
          </Card>
        </Card.Group>
        { isAuthenticated() ? '' : (<Segment padded>
          <SignIn usagePlanId={this.state.usagePlanId} token={this.state.token} />
          <Divider horizontal>Or</Divider>
          <Register usagePlanId={this.state.usagePlanId} token={this.state.token} />
        </Segment>) }
      </div>
    )
  }
}
