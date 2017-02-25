import React from 'react'
import { Button, Segment, Divider } from 'semantic-ui-react'
import { confirmMarketplaceSubscription } from '../../services/api-catalog'
import { isAuthenticated } from '../../services/self'
import SignIn from '../../components/SignIn'
import Register from '../../components/Register'
import Head from '../../components/Head'

export default class MarketplaceSubscribe extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    
    if (props.location.search.indexOf('token') > 0) {
      var token = props.location.search.substring('?token='.length)
      this.state = {token: token}
    }
    
    if (isAuthenticated()) {
      confirmMarketplaceSubscription(this.props.match.params.usagePlanId, token).then(() => {
        window.location.href = '/apis'
      })
    }
  }
  
  render() {
    return (<div>
      <Head {...this.props} />
      { isAuthenticated() ? '' : (<Segment padded>
        <SignIn usagePlanId={this.props.match.params.usagePlanId} token={this.state.token} />
        <Divider horizontal>Or</Divider>
        <Register usagePlanId={this.props.match.params.usagePlanId} token={this.state.token} />
      </Segment>) }
    </div>)
  }
}
