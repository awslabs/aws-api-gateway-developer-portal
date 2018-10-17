import React from 'react'

import { Link } from 'react-router-dom'

import { Header, Container } from 'semantic-ui-react'

import { isAuthenticated } from 'services/self'

export default (props) => {
  let authed = isAuthenticated()
  return (
  <Container style={{ padding: "40px" }}>
    <Header as='h2'>Getting Started</Header>

    <Header as="h3">Create an account and subscribe to APIs</Header>
    <p>
      To use any of our APIs you must have a developer account. A developer account gives you an API Key, access to use and test our APIs, and metrics on your usage. { !authed && (`Create or sign in using the buttons in the top right.`)}
    </p>

    <p>
      When you first register, your new API Key won't be tied to any of our APIs. To activate it for an API, navigate to <Link to="/apis">APIs</Link>, then find the API you want to use and click `subscribe`. Your API Key is now subscribed to the API and you can make calls to all methods on the API.
    </p>

    <p>  
      Figuring out how to use APIs can be hard. Use the “Try it out!” feature to get examples of the request and response shapes of our APIs. The Developer Portal will make an API call to the backend service using your API key and shows a sample <code>curl</code> request with all necessary input parameters and the real response.
    </p>

    <p>
      If you need your API Key for any reason, you can always find it on <Link to="/dashboard">your dashboard</Link> after logging in.
    </p>

    <Header as="h3">Monitor your usage</Header>

    <p>Typically each API has a usage limit set for each API Key. As you scale up your usage of the APIs, you can monitor your usage towards the limits on <Link to="/dashboard">your dashboard</Link>.</p>
  </Container>
)}
