// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Modal } from 'semantic-ui-react'
// import { GetSdkModal } from './GetSdk'

/**
 * For the time being, this can only be used once. I know this is a bad practice, but this is both in the interest of time and user experience. If we really want more than one modal at once, we can revisit in the future. For now, I want it to be hard to make multiple at once.
 */
export default class GlobalModal extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      open: false,
      modalProps: {},
      children: null
    }

    modal.open = (children, modalProps = {}) => {
      this.setState({
        children,
        modalProps,
        open: true
      })
    }
    modal.close = () => {
      this.setState({ open: false })
    }
  }

  render () {
    return (
      <>
        <Modal {...this.state.modalProps} open={this.state.open}>
          {this.state.children}
        </Modal>
      </>
    )
  }
}

// the modal controller
// start with noop modals
export const modal = {
  open: () => { },
  close: () => { }
}
