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
    
    var query = props.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
      var pair = vars[i].split("=");
      if (pair[0] == 'usagePlanId') {
        this.setState({usagePlanId: usagePlanId})
      } else if (pair[0] == 'token') {
        this.setState({token: token})
      } 
    }
    
    if (isAuthenticated()) {
      confirmMarketplaceSubscription(this.state.usagePlanId, this.state.token).then(() => {
        window.location.href = '/apis'
      })
    }
  }
  
  render() {
    return (<div>
      <Head {...this.props} />
      { isAuthenticated() ? '' : (<Segment padded>
        <SignIn usagePlanId={this.state.usagePlanId} token={this.state.token} />
        <Divider horizontal>Or</Divider>
        <Register usagePlanId={this.stage.usagePlanId} token={this.state.token} />
      </Segment>) }
    </div>)
  }
}
