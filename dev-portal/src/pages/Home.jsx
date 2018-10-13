import React from 'react'

// react-router
import { Link } from 'react-router-dom'

// semantic-ui
import { Header, Container, Image, Button } from 'semantic-ui-react'

import logo from '../logo.png'

export const HomePage = () => (
  <React.Fragment>
    <Container fluid textAlign='center' style={{ color: "whitesmoke", backgroundColor: "slategray", padding: "40px 0px" }}>
      <Image centered size='small' src={logo} />
      <Header as='h1' style={{ color: "whitesmoke" }}>
        {/* The main header on the home page of your developer portal. */}
        Developer Portal
      </Header>
      <p>
        {/* A secondary headline. */}
        Your gateway to the data.
      </p>
      <Link to="/getting-started">
        <Button positive>Get Started</Button>
      </Link>
    </Container>
    {/* Details about what kinds of APIs you can find here. */}
    <Container text textAlign='justified' style={{ padding: "40px 0px" }}>
      <Header size='medium'>EXPLORE AND BUILD</Header>
      <p>Read the Getting Started guide to learn how to hit the ground running to get an application up and running in no time.</p>
      <p>See what APIs we have to offer, including extensive documentation, and generated SDKs.</p>
      <p>Sign in to manage your subscriptions, see your current usage, get your API Key, and test against our live API.</p>
    </Container>
  </React.Fragment>
)

export default HomePage
