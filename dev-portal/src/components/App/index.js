import React from 'react'
import { BrowserRouter, Route, Redirect, Link, Switch } from 'react-router-dom'
import { Dimmer, Loader } from 'semantic-ui-react'
import Home from '../../pages/Home'
import CaseStudies from '../../pages/CaseStudies'
import GettingStarted from '../../pages/GettingStarted'
import Dashboard from '../../pages/Dashboard'
import Apis from '../../pages/Apis'
import ApiDetails from '../../pages/ApiDetails'
import MarketplaceSubscribe from '../../pages/MarketplaceSubscribe'
import logo from '../../logo.png'
import AlertPopup from '../../components/AlertPopup'
import { init, isAuthenticated } from '../../services/self'
import { apiGatewayClient } from '../../services/api'
import './App.css'

const NoMatch = () => <h2>Page not found</h2>
class MatchWhenAuthorized extends React.Component { // eslint-disable-line
  constructor(props) {
    super(props)

    const apiGatewayClientInterval = window.setInterval(() => {
      if (apiGatewayClient) {
        window.clearInterval(apiGatewayClientInterval)
        this.setState({apiGatewayClient})
      }
    }, 100)

    this.state = {apiGatewayClient, apiGatewayClientInterval}
  }

  componentWillUnmount() {
    if (this.state.apiGatewayClientInterval) window.clearInterval(this.state.apiGatewayClientInterval)
  }

  render() {
    const {component: Component, ...rest} = this.props

    return <Route {...rest} render={props => {
      if (!isAuthenticated()) return <Redirect to={{ pathname: '/', state: { from: props.location } }}/>

      return this.state.apiGatewayClient ? <Component {...props} />: (<Dimmer active>
        <Loader content='Loading' />
      </Dimmer>)
    }} />
  }
}

export default class App extends React.Component {
  constructor() {
    super()
    init()

    // We are using an S3 redirect rule to prefix the url path with #!
    // This then converts it back to a URL path for React routing
    // NOTE: For local development, you will get a Page Not Found when refreshing the Swagger UI page when it has a #!
    const hashRoute = location.hash.substring(2)
    history.pushState({}, 'home page', hashRoute)
  }

  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <div className="App-header">
            <Link to="/"><img src={logo} className="App-logo" alt="logo" /></Link>
            <h2>Welcome to our Developer Portal</h2>
          </div>
          <section className="App-intro">
              <AlertPopup />
              <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/case-studies" component={CaseStudies} />
                <Route path="/getting-started" component={GettingStarted} />
                <Route path="/marketplace-subscribe" component={MarketplaceSubscribe} />
                <Route path="/dashboard" component={Dashboard}/>
                <Route exact path="/apis" component={Apis}/>
                <Route path="/apis/:apiId" component={ApiDetails}/>
                <Route component={NoMatch}/>
              </Switch>
          </section>
        </div>
      </BrowserRouter>
    )
    /*


     */
  }
}
