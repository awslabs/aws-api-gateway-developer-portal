import React, { Component } from 'react';
import Router from 'react-router/BrowserRouter'
import Match from 'react-router/Match'
import Link from 'react-router/Link'
import Index from './pages'
import CaseStudies from './pages/CaseStudies'
import logo from './logo.svg';
import './App.css';

class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <img src={logo} className="App-logo" alt="logo" />
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/case-studies">Case Studies</Link></li>
          </ul>

          <hr/>

          <Match exactly pattern="/" component={Index} />
          <Match pattern="/case-studies" component={CaseStudies} />
        </div>
      </Router>
    );
    /*

    <div className="App">
      <div className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h2>Welcome to React</h2>
      </div>
      <p className="App-intro">
        To get started, edit <code>src/App.js</code> and save to reload.
      </p>
    </div>
     */
  }
}

export default App;
