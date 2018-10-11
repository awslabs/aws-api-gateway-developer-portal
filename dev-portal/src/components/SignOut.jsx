import React from 'react'
import { Redirect} from 'react-router-dom'
import { logout, isAuthenticated } from 'services/self'

export default class SignOut extends React.Component {
  logout = () => {
    logout()
    this.forceUpdate()
  }

  render() {
    return isAuthenticated() ? (
      React.cloneElement( this.props.trigger, { onClick: this.logout })
    ) : (
      <Redirect to='/' />
    )
  }
}
