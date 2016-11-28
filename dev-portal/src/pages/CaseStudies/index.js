import React from 'react'
import Head from '../../components/Head'

export default (props) => (
  <div>
    <Head {...props} />
    <h2>Case Studies</h2>
    <p>Sample data. You can modify this static content in (‘/developer portal’) folder of the ‘link to github’ application.</p>
    <h3>Pet Availability</h3>
    <p>Build your own local PetStore by reselling our pets. Use our APIs to check availability data and fulfill orders.</p>
    <h3>Sell us your Pets</h3>
    <p>Establish yourself as our partner and get access to our POST API – to directly post pets to our inventory.</p>
    <p>Successfully built an app? <a href='https://aws.amazon.com/marketplace/management/register/' target='_blank'>Register as a seller in AWS Marketplace</a> and sell your application! Questions or comments? <a href='https://forums.aws.amazon.com/forum.jspa?forumID=199' target='_blank'>Reach out to us on our forums</a>.</p>
  </div>)
