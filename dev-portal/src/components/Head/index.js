import React from 'react'
import { Breadcrumb, Button, Popup } from 'semantic-ui-react'
import { Link, Redirect} from 'react-router'
import { logout, showApiKey, isAuthenticated } from '../../services/self'
import { getApi } from '../../services/api-catalog'

export default class Head extends React.Component {
  constructor(props) {
    super(props)

    if (this.isApiDetailsRoute()) {
      getApi(props.params.apiId)
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

  isCaseStudiesRoute() {
    return this.props.pattern === '/case-studies'
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
      <Breadcrumb>
        { this.isHomeRoute() ? <Breadcrumb.Section active>Home</Breadcrumb.Section> : <Breadcrumb.Section><Link to="/">Home</Link></Breadcrumb.Section> }
        { this.isGettingStartedRoute() ? <Breadcrumb.Section active><Breadcrumb.Divider icon='right chevron' />Getting Started</Breadcrumb.Section> : ''}
        { this.isCaseStudiesRoute() ? <Breadcrumb.Section active><Breadcrumb.Divider icon='right chevron' />Case Studies</Breadcrumb.Section> : ''}
        { this.isApisListRoute() ? <Breadcrumb.Section active><Breadcrumb.Divider icon='right chevron' />APIs</Breadcrumb.Section> : ''}
        { this.isApiDetailsRoute() ? <Breadcrumb.Section><Breadcrumb.Section><Breadcrumb.Divider icon='right chevron' /><Link to="/apis">APIs</Link></Breadcrumb.Section><Breadcrumb.Section active><Breadcrumb.Divider icon='right chevron' />{ this.state.apiName }</Breadcrumb.Section></Breadcrumb.Section> : ''}
      </Breadcrumb>
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
