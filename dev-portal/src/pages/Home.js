import React from 'react'
import { Container, Segment, Divider, Button, Card } from 'semantic-ui-react'
import SignIn from '../components/SignIn'
import Register from '../components/Register'


export default () => (
  <Container>
    <Card.Group itemsPerRow={3}>
      <Card
        href='#/case-studies'
        header='Case Studies'
        description='Here are some case studies...'
      />
      <Card
        href='#/apis'
        header='API Documentation'
        description='See a list of our APIs and their documentation...'
      />
      <Card
        href='#/getting-started'
        header='Getting Started Guides'
        description="Here's how you can get started..."
      />
    </Card.Group>
    <Segment padded>
      <SignIn />
      <Divider horizontal>Or</Divider>
      <Register />
    </Segment>
  </Container>
)
