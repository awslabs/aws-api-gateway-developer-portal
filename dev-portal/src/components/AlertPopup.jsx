// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Message } from 'semantic-ui-react'

export default class AlertPopup extends React.Component {
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
