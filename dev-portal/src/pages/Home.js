import React from 'react'
import { Link } from 'react-router'
import { Container, Segment, Divider, Card } from 'semantic-ui-react'
import SignIn from '../components/SignIn'
import Register from '../components/Register'
import { isAuthenticated } from '../services/self'

export default (props) => (
  <Container>
    <Card.Group itemsPerRow={3} style={{textAlign: 'center'}}>
      <Card>
        <Card.Content>
          <Card.Header><Link to='/case-studies'>Case Studies</Link></Card.Header>
          <Card.Description>Here are some case studies...</Card.Description>
        </Card.Content>
      </Card>
      <Card>
        <Card.Content>
          <Card.Header><Link to='/apis'>APIs</Link></Card.Header>
          <Card.Description>See a list of our APIs and their documentation...</Card.Description>
        </Card.Content>
      </Card>
      <Card>
        <Card.Content>
          <Card.Header><Link to='/getting-started'>Getting Started Guides</Link></Card.Header>
          <Card.Description>Here's how you can get started...</Card.Description>
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
