import React, { PureComponent } from 'react'
import { Message } from 'semantic-ui-react'

export default class AlertPopup extends PureComponent {
  state = {
    isVisible: false,
    message: ''
  }

  handleDismiss = () => {
    this.setState({ isVisible: false })
  }

  render() {
      return (
        <Message
          hidden={!this.state.isVisible}
          negative
          floating
          icon='warning sign'
          onDismiss={this.handleDismiss}
          header='Error'
          content={this.state.message}
        />
      )
  }
}
