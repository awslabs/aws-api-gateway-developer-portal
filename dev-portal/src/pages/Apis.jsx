import React, { PureComponent } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'
import { isAuthenticated } from 'services/self'
import { getCatalog, fetchSubscriptions } from 'services/api-catalog'

// components
import ApiCatalog from 'components/ApiCatalog'

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
      {this.state.catalog && (!isAuthenticated() || this.state.subscriptions) ? <ApiCatalog catalog={this.state.catalog} /> : (<Dimmer active>
        <Loader content='Loading' />
      </Dimmer>)}
    </div>)
  }
}
