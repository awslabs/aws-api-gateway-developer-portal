import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom'

// content-fragments (import here to start this ASAP)
import 'services/get-fragments'

// semantic-ui
import 'semantic-ui-css/semantic.css'

// pages
import Home from 'pages/Home'
import GettingStarted from 'pages/GettingStarted'
import Dashboard from 'pages/Dashboard'
import Apis from 'pages/Apis'

// components
import AlertPopup from 'components/AlertPopup'
import NavBar from 'components/NavBar'

import { init } from 'services/self'
import './index.css';

class App extends React.Component {
  constructor() {
    super()
    init()

    // We are using an S3 redirect rule to prefix the url path with #!
    // This then converts it back to a URL path for React routing
    const hashRoute = window.location.hash.substring(2)
    window.history.pushState({}, 'home page', hashRoute)
  }

  render() {
    return (
      <BrowserRouter>
      <React.Fragment>
        <NavBar />
        <AlertPopup />
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/getting-started" component={GettingStarted} />
          <Route path="/dashboard" component={Dashboard} />
          <Route exact path="/apis" component={Apis} />
          <Route path="/apis/:apiId" component={Apis} />
          <Route component={() => <h2>Page not found</h2>} />
        </Switch>
        </React.Fragment>
      </BrowserRouter>
    )
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
