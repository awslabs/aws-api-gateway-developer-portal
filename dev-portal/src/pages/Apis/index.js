import React, { PureComponent } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'
import ApiCatalog from '../../components/ApiCatalog'
import { isAuthenticated } from '../../services/self'
import { getCatalog, fetchSubscriptions } from '../../services/api-catalog'
import Head from '../../components/Head'

export default class ApisPage extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {}

    getCatalog().then(catalog => {
      this.setState({ catalog })
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
      {this.state.catalog && (!isAuthenticated() || this.state.subscriptions) ? <ApiCatalog catalog={this.state.catalog} /> : (<Dimmer active>
        <Loader content='Loading' />
      </Dimmer>)}
    </div>)
  }
}
