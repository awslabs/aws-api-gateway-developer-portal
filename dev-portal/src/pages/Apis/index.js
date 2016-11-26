import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'
import ApiCatalog from '../../components/ApiCatalog'
import { isAuthenticated } from '../../services/self'
import { getApis, fetchSubscriptions } from '../../services/api-catalog'
import Head from '../../components/Head'

export default class ApisPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}

    getApis().then(apis => {
      this.setState({ apis })
    })

    if (isAuthenticated()) {
      fetchSubscriptions().then(subscriptions => {
        this.setState({ subscriptions })
      })
    }
  }

  render() {
    return (<div>
      <Head {...this.props} />
      {this.state.apis && (!isAuthenticated() || this.state.subscriptions) ? <ApiCatalog apis={this.state.apis} /> : (<Dimmer active>
        <Loader content='Loading' />
      </Dimmer>)}
    </div>)
  }
}
