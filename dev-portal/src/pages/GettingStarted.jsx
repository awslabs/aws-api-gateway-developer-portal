import React from 'react'

import { Link } from 'react-router-dom'

import { Container, Header, Menu, Segment } from 'semantic-ui-react'

export default (props) => (
  <div style={{ display: "flex", flex: "1 1 auto", overflow: "hidden" }}>
    <Menu
      inverted
      vertical
      attached
      style={{ margin: 0, borderRadius: 0 }}
      {...props}
    >
      <Menu.Item
        as={Link}
        to={`#part`}
      >
        Getting Started
      </Menu.Item>
    </Menu>

    <div style={{ padding: "40px", overflow: "auto" }}>
      <Header as='h1'>Getting Started</Header>

      <Segment vertical>
        <Header as="h2">Create an Account</Header>
        <p>
          Create an account and get an <a href='https://docs.aws.amazon.com/apigateway/api-reference/resource/api-key/' target='_blank' rel="noopener noreferrer">API Key</a>.
        </p>
      </Segment>
      <Segment vertical>
        <Header as="h2">View and Subscribe to our APIs</Header>
        <p>
          View our APIs here. Once you find what you need, subscribe to the API to activate your API key for that API.
        </p>
        <p>
          This section might be combined with the above section.
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
