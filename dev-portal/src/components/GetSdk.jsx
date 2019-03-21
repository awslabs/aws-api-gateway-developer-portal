// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { apiGatewayClient } from 'services/api'
import { store } from 'services/state'

import React from 'react'

import { Dropdown, Button, Header, Modal, Icon, Form } from 'semantic-ui-react'
import { modal } from 'components/Modal'

/**
 * This button is used in the `InfoReplacement` component of the SwaggerUiLayout to add the GetSdkButton directly into the SwaggerUi UI.
 */
export const GetSdkButton = () => {
  let sdkTypesArray = Object.entries(sdkTypes)

  return (
    <Dropdown as={Button} text='Download SDK' pointing className='link item'>
      <Dropdown.Menu>
        {sdkTypesArray.map(([type, info]) => {
          return <Dropdown.Item key={type} onClick={() => confirmDownload(info)}>{info.platform}</Dropdown.Item>
        })}
      </Dropdown.Menu>
    </Dropdown>
  )
}

function confirmDownload(info) {
  if (info.fields.length)
    modal.open(GetSdkModal, { info })
  else
    getSdk(info.platform)
}

/**
 * This modal is included by the modals component, which also provides the default open/close controls for all modals.
 */
export class GetSdkModal extends React.Component {
  constructor(props) {
    super(props)

    this.state = props.info.fields.reduce((obj, field) => {
      obj[field.key] = null
      return obj
    }, {})
  }

  // this function returns a prop directly
  // it's intended to be used like <Component {...this.canSubmit()} />
  isDisabled = () => {
    let hasEmptyValue = !!Object.entries(this.state)
      .find(([key, value]) => !value)

    return { disabled: hasEmptyValue }
  }

  handleChange = (event, { id, value }) => this.setState({ [id]: value })

  handleSubmit = () => {
    getSdk(this.props.info.platform, JSON.stringify(this.state))
  }

  render() {
    const info = this.props.info

    return <>
      <Header icon='archive' content={`Download the ${info.platform} SDK`} />
      <Modal.Content>
        <Form>
          {info.fields.map(field => (
            // only display required fields for now
            field.required ? <Form.Input
              key={field.key}
              id={field.key}
              label={`${field.name} (required)`}
              placeholder={field.placeholder}
              onChange={this.handleChange} /> : null
          ))}
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button basic color='red' onClick={modal.close}>
          <Icon name='remove' /> Cancel
      </Button>
        <Button color='green' {...this.isDisabled()} onClick={this.handleSubmit}>
          <Icon name='checkmark' /> Download
      </Button>
      </Modal.Actions>
    </>
  }
}

const sdkTypes = {
  "android": {
    platform: "Android",
    fields: [
      { name: "Group ID", key: "groupId", required: true },
      { name: "Invoker package", key: "invokerPackage", required: true },
      { name: "Artifact ID", key: "artifactId", required: true },
      { name: "Artifact version", key: "artifactVersion", required: true }
    ]
  },
  "javascript": {
    platform: "JavaScript",
    fields: []
  },
  "ios-objective-c": {
    platform: "iOS (Objective-C)",
    fields: [
      { name: "Prefix", key: "prefix", required: true }
    ]
  },
  "ios-swift": {
    platform: "iOS (Swift)",
    fields: [
      { name: "Prefix", key: "prefix", required: true }
    ]
  },
  "java": {
    platform: "Java",
    fields: [
      { name: "Service Name", key: "prefix", required: true },
      { name: "Java Package Name", key: "prefix", required: true },
      { name: "Java Build System", key: "prefix", required: false },
      { name: "Java Group ID", key: "prefix", required: false },
      { name: "Java Artifact ID", key: "prefix", required: false },
      { name: "Java Artifact Version", key: "prefix", required: false },
      { name: "Source Code License Text", key: "prefix", required: false }
    ]
  },
  "ruby": {
    platform: "Ruby",
    fields: [
      { name: "Service Name", key: "prefix", required: true },
      { name: "Ruby Gem Name", key: "prefix", required: false },
      { name: "Ruby Gem Version", key: "prefix", required: false }
    ]
  }
}

function getSdk(sdkType, parameters = "{}") {
  let apiId = store.api.id
  let stageName = store.api.stage

  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get(`/catalog/${apiId}_${stageName}/sdk`, { sdkType }, {}, {
      queryParams: { parameters },
      config: { responseType: "blob" }
    }))
    .then(({ data, ...rest }) => {
      // console.log(data)
      console.log(rest)
      downloadFile(data)
      // store.usagePlans = data.apiGateway
      // store.apiList = {
      // }
    })
    .catch(() => {
      // store.usagePlans = null
      // store.apiList = {
      // }
    })
}

function downloadFile(data, fileName = 'test.zip') {
  const reader = new FileReader()
  reader.onloadend = () => {
    const downloadLinkElement = document.createElement('a')
    console.log(reader.result)
    downloadLinkElement.setAttribute('href', reader.result)
    downloadLinkElement.setAttribute('download', fileName)
    downloadLinkElement.style.display = 'none'

    document.body.appendChild(downloadLinkElement)
    downloadLinkElement.click()
    document.body.removeChild(downloadLinkElement)
  }
  reader.readAsDataURL(data)

}
