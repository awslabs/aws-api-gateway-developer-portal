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
    
    this.query = this.props.location.search.substring(1);
    this.vars = this.query.split("&");
    for (var i=0;i<this.vars.length;i++) {
      if (this.vars[i].indexOf('usagePlanId') > -1) {
         this.val = this.vars[i].substring('usagePlanId='.length)
         this.setState({usagePlanId: this.val})
         this.state.usagePlanId = this.val // supports isAuthenticated() block below
      } else if (this.vars[i].indexOf('token') > -1) {
         this.val = this.vars[i].substring('token='.length)
         this.setState({token: this.val})
         this.state.token = this.val // supports isAuthenticated() block below
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
