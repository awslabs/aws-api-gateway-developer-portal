import React, { Component } from 'react';
import {HashRouter, Match, Link, Miss} from 'react-router'
import Index from './pages'
import CaseStudies from './pages/CaseStudies'
import Dashboard from './pages/Dashboard'
import logo from './logo.svg';
import './App.css';
import AlertPopup from './components/AlertPopup'
import {start} from './js/devportal'
import { isAuthenticated } from './services/self'

const NoMatch = () => <h2>Page not found</h2>
const MatchWhenAuthorized = ({ component: Component, ...rest }) => (
  <Match {...rest} render={props => (
    isAuthenticated() ? (
      <Component {...props}/>
    ) : (
      <Redirect to={{
        pathname: '/',
        state: { from: props.location }
      }}/>
    )
  )}/>
)

class App extends Component {
  componentDidMount() {
    start()
  }

  render() {
    return (
      <HashRouter>
        <div className="App">
          <div className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h2>Welcome to our Developer Portal</h2>
          </div>
          <section className="App-intro">
              {/* <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/case-studies">Case Studies</Link></li>
              </ul> */}

              <AlertPopup />

              <Match exactly pattern="/" component={Index} />
              <Match pattern="/case-studies" component={CaseStudies} />
              <MatchWhenAuthorized pattern="/dashboard" component={Dashboard}/>
              <Miss component={NoMatch}/>
          </section>
        </div>
      </HashRouter>
    );
    /*


     */
  }
}

export default App;
