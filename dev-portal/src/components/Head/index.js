import React, { PureComponent } from 'react'
import { Button, Popup } from 'semantic-ui-react'
import { Redirect} from 'react-router-dom'
import { logout, showApiKey, isAuthenticated } from 'services/self'
import { getApi } from 'services/api-catalog'

export default class Head extends PureComponent {
  constructor(props) {
    super(props)

    if (this.isApiDetailsRoute()) {
      getApi(props.match.params.apiId)
      .then(api => {
        this.setState({
          apiName: api.swagger.info.title
        })
      })
    }

    this.state = {
      isAuthenticated: isAuthenticated(),
      apiKey: ''
    }
  }

  isHomeRoute() {
    return this.props.pattern === '/'
  }

  isGettingStartedRoute() {
    return this.props.pattern === '/getting-started'
  }

  isApisListRoute() {
    return this.props.pattern === '/apis'
  }

  isApiDetailsRoute() {
    return this.props.pattern === '/apis/:apiId'
  }

  logout() {
    logout()
    this.setState({ loggedOut: true })
  }

  showApiKey() {
    showApiKey().then(apiKey => {
      this.setState({ apiKey })
    })
  }

  render() {
    return this.state.loggedOut ? <Redirect to='/' /> : (<section style={{marginBottom: '1rem'}}>
      { this.state.isAuthenticated ? <div style={{float: 'right'}}>
        <Popup
          trigger={<Button onClick={() => this.showApiKey()} size='mini'>Show API Key</Button>}
          content={this.state.apiKey ? this.state.apiKey.toString() : 'Loading API Key...'}
          on='click'
          positioning='top right'
        />
        <Button onClick={() => this.logout()} size='mini'>Sign out</Button>
      </div> : ''}
    </section>)
  }
}
