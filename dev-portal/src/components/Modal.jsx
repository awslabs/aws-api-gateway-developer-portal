// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Modal } from 'semantic-ui-react'
import { GetSdkModal } from './GetSdk';

/**
 * For the time being, this can only be used once. I know this is a bad practice, but this is both in the interest of time and user experience. If we really want more than one modal at once, we can revisit in the future. For now, I want it to be hard to make multiple at once.
 */
export default class GlobalModal extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      open: false,
      modalProps: {},
      modalBody: null
    }

    modal.open = this.openModal.bind(this)
    modal.close = this.closeModal.bind(this)
  }

  closeModal = () => {
    this.setState({ open: false })
  }

  openModal = (modalBody, modalProps) => {
    this.setState({
      modalBody,
      modalProps,
      open: true,
    })
  }

  render() {
    return (
      <>
        <Modal {...this.state.modalProps} open={this.state.open}>
          {this.state.modalBody ? <this.state.modalBody {...this.state.modalProps} /> : null}
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



