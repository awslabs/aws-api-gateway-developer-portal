import React from 'react'
import { Link } from 'react-router'
import { Container, Segment, Divider, Card } from 'semantic-ui-react'
import SignIn from '../components/SignIn'
import Register from '../components/Register'
import { isAuthenticated } from '../services/self'

export default (props) => (
  <Container>
    <Card.Group itemsPerRow={3} stackable style={{textAlign: 'center'}}>
      <Card>
        <Card.Content>
          <Card.Header><Link to='/case-studies'>Case Studies</Link></Card.Header>
          <Card.Description>Want to learn about what you can achieve by integrating with our APIs? The possibilities are endless, but <Link to='/case-studies'>here are just a few examples</Link>.</Card.Description>
        </Card.Content>
      </Card>
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
      <SignIn />
      <Divider horizontal>Or</Divider>
      <Register />
    </Segment>) }
  </Container>
)
