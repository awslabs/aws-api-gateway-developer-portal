import React from 'react'

import { Link } from 'react-router-dom'

import { Header, Segment } from 'semantic-ui-react'

export default (props) => (
  <div style={{ display: "flex", flex: "1 1 auto", overflow: "hidden" }}>
    <div style={{ padding: "40px", overflow: "auto" }}>
      <Header as='h1'>Getting Started</Header>

      <Segment vertical>
        <Header as="h2">Create an account and get an API Key</Header>
        <p>
          Creating an account will generate your API Key -- a unique key that you will allow you to access our APIs. When building your application, you will provide this api in the `x-api-key` header of your requests. To view your API Key, you can go to <Link to="/dashboard">your dashboard</Link> after logging in.
        </p>
        
        <Header as="h3">Subscribe to APIs you want to use</Header>
        <p>
          Subscribing 'registers' your API Key to a specific API, allowing you to make calls to that API for both testing using the Developer Portal and building your applications.
        </p>
      </Segment>
      <Segment vertical>
        <Header as="h2">Build an App</Header>

        <p>This part of the document should have code samples on how to integrate here. If we provide a hook to download the SDKs, we should point that out here.</p>
        <p>Build your application. Use the x-api-key header to send the API key in your requests.</p>

      </Segment>
      <Segment vertical>
        <Header as="h2">Next Steps</Header>

        <Header as="h3">Throttling Limits</Header>

        <p>What do do if you hit throttling limits.</p>
        <p>The API plans that you subscribe to are governed by throttling limits and quotas as described in the API description. If you have exhausted your limits and want temporary extensions, contact us.</p>

        <Header as="h3">Built an App?</Header>
        <p>Successfully built an app? <a href='http://docs.aws.amazon.com/apigateway/latest/developerguide/sell-api-as-saas-on-aws-marketplace.html' target='_blank' rel="noopener noreferrer">Register as a seller</a> in AWS Marketplace and sell your application!</p>

        <Header>Questions?</Header>
        <p>
          Questions or comments? Reach out to us on our <a href='https://forums.aws.amazon.com/forum.jspa?forumID=199' target='_blank' rel="noopener noreferrer">forums</a>.
        </p>
      </Segment>
    </div>
  </div>
)
