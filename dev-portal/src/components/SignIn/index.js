import React from 'react'
import $ from 'jquery'
import AlertPopup from '../AlertPopup'
import {start, login, register} from '../../js/devportal'


const styles = {
 loginRegister: {
   margin: '0 auto',
   padding: '1rem',
   maxWidth: '22rem'
 }
}

 export default class SignIn extends React.Component {
  constructor(props){
    super(props)

    this.handleLogin = this.handleLogin.bind(this);
    this.handleRegister = this.handleRegister.bind(this);
  }

  componentDidMount() {
    start()
  }

  handleLogin(event) {
    login($('#login-email').val(), $('#login-password').val())
    event.preventDefault()
  }

  handleRegister(event) {
    event.preventDefault()
    register($('#register-email').val(), $('#register-password').val())
  }

  render() {
    return (<div>
      <AlertPopup />
      <div id="login-register" className="container" style={styles}>
        <div className="card">
          <div className="card-block">
              <h2>Login</h2>
              <form className="login" id="login-form" onSubmit={this.handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-email">Email</label>
                  <input className="form-control" id="login-email" type="email" />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input className="form-control" id="login-password" type="password" autoComplete="false" />
                </div>

                <button type="submit" className="btn btn-primary">Login</button>
              </form>
          </div>
        </div>

        <div className="card">
          <div className="card-block">
              <h2>Register</h2>
              <form className="register" id="register-form" onSubmit={this.handleRegister}>
                <div className="form-group">
                  <label htmlFor="register-email">Email</label>
                  <input className="form-control" id="register-email" type="email" />
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <input className="form-control" id="register-password" type="password" autoComplete="false" />
                </div>

                <button type="submit" className="btn btn-secondary">Register</button>
              </form>
          </div>
        </div>
      </div>
    </div>)
  }
}
