import React from 'react'
import Head from '../../components/Head'

export default (props) => (
  <div>
    <Head {...props} />
    <h2>Getting Started</h2>
    <p>Sample data. You can modify this static content in `/dev-portal/src/pages/GettingStarted/index.js` folder.</p>
    <h3>Get Started with our PetStore API</h3>
    <ol style={{listStyle: 'decimal', paddingLeft: '1.5rem', marginBottom: '1rem'}}>
      <li>Set up a developer account. Developer accounts here are managed by <a href='http://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html' target='_blank' rel="noopener noreferrer">AWS Cognito User Pools.</a></li>
      <li>Subscribe to an API and get an <a href='https://docs.aws.amazon.com/apigateway/api-reference/resource/api-key/' target='_blank' rel="noopener noreferrer">API Key</a>. Once you get it, you can use it for all the API products published here.</li>
      <li>Build your application. Use the x-api-key header to send the API key in your requests</li>
    </ol>
    <p>The API plans that you subscribe to are governed by throttling limits and quotas as described in the API description.
    If you have exhausted your limits and want temporary extensions, contact us.</p>
    <p>Successfully built an app? <a href='http://docs.aws.amazon.com/apigateway/latest/developerguide/sell-api-as-saas-on-aws-marketplace.html' target='_blank' rel="noopener noreferrer">Register as a seller</a> in AWS Marketplace and sell your application!
    Questions or comments? Reach out to us on our <a href='https://forums.aws.amazon.com/forum.jspa?forumID=199' target='_blank' rel="noopener noreferrer">forums</a>.</p>
  </div>)
