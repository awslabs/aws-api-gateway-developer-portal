// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { apiGatewayClient } from 'services/api'
import { store } from 'services/state'

import React from 'react'

import { Loader, Button, Header, Modal, Icon, Form } from 'semantic-ui-react'
import { modal } from 'components/Modal'
import { addNotification } from 'components/AlertPopup'

import { observer } from 'mobx-react'

import _ from 'lodash'

/**
 * This button is used in the `InfoReplacement` component of the SwaggerUiLayout to add the GetSdkButton directly into the SwaggerUi UI.
 */
export const GetSdkButton = observer(() => {
  return (
    <span>
      <Dropdown text='Download SDK' pointing className='link item'>
        {sdkTypes.map((type) => {
          return <div className="item" key={type.id} onClick={() => confirmDownload(type)}>
            {type.friendlyName}
          </div>
        })}
      </Dropdown>
      {store.api.downloadingSdk && <Loader active inline size="tiny" />}
    </span>
  )
})

class Dropdown extends React.Component {
  constructor(props) {
    super(props)

    this.state = { visible: false }
    this.button = +(new Date()) + '-dropdown-clickable' // we've using this class to exclude certain elements from hiding

    document.addEventListener('click', this.hideDropdown)
  }

  toggleDropdown = () => this.setState(prevState => ({ ...prevState, visible: !prevState.visible }))
  hideDropdown = event => {
    if (!event.target.classList.contains(this.button))
      this.setState(prevState => ({ ...prevState, visible: false }))
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideDropdown)
  }

  render() {
    return (
      <span onClick={this.toggleDropdown} className={"ui button pointing dropdown link item " + this.button + (this.state.visible ? " active" : "")}>
        {this.props.text}
        <i className={"dropdown icon " + this.button}></i>
        <div className={"menu transition" + (this.state.visible ? " visible" : "")}>
          {this.props.children}
        </div>
      </span>
    )
  }
}

function confirmDownload(type) {
  if (type.configurationProperties.length)
    modal.open(GetSdkModal, { type })
  else
    getSdk(type.id)
}

/**
 * This modal is included by the modals component, which also provides the default open/close controls for all modals.
 */
export class GetSdkModal extends React.Component {
  constructor(props) {
    super(props)

    // generate a null state value for each required property (to validate against)
    let fields = props.type.configurationProperties.reduce((obj, property) => {
      if (property.required)
        obj[property.name] = null
      return obj
    }, {})

    this.state = {
      fields
    }
  }

  // this function returns a prop directly
  // it's intended to be used like <Component {...this.canSubmit()} />
  isDisabled = () => {
    let hasEmptyValue = !!Object.entries(this.state.fields)
      .find(([key, value]) => !value)

    return { disabled: hasEmptyValue }
  }

  handleChange = (event, { id, value }) => {
    this.setState((prevState) => {
      let newState = _.cloneDeep(prevState)
      newState.fields[id] = value
      return newState
    })
  }

  handleSubmit = () => {
    if (!this.isDisabled().disabled) {
      modal.close()
      getSdk(this.props.type.id, JSON.stringify(this.state.fields))
    }
  }

  render() {
    const type = this.props.type

    return <>
      <Header icon='archive' content={`Download the ${type.friendlyName} SDK`} />
      <Modal.Content>
        <Form onSubmit={this.handleSubmit}>
          {type.configurationProperties.map(property => (
            // only display required fields for now
            property.required ? <Form.Input
              key={property.name}
              id={property.name}
              label={`${property.friendlyName} (required)`}
              placeholder={property.friendlyName}
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

const sdkTypes = [
  {
    id: "android",
    friendlyName: "Android",
    description: "",
    configurationProperties: [
      {
        name: "groupId",
        friendlyName: "Group ID",
        description: "",
        required: true
      }, {
        name: "invokerPackage",
        friendlyName: "Invoker package",
        description: "",
        required: true
      }, {
        name: "artifactId",
        friendlyName: "Artifact ID",
        description: "",
        required: true
      }, {
        name: "artifactVersion",
        friendlyName: "Artifact version",
        description: "",
        required: true
      },
    ]
  },
  {
    id: "javascript",
    friendlyName: "JavaScript",
    description: "",
    configurationProperties: []
  },
  {
    id: "ios-objective-c",
    friendlyName: "iOS (Objective-C)",
    description: "",
    configurationProperties: [
      {
        name: "classPrefix",
        friendlyName: "Prefix",
        description: "",
        required: true
      },
    ]
  },
  {
    id: "ios-swift",
    friendlyName: "iOS (Swift)",
    description: "",
    configurationProperties: [
      {
        name: "classPrefix",
        friendlyName: "Prefix",
        description: "",
        required: true
      },
    ]
  },
  {
    id: "java",
    friendlyName: "Java",
    description: "Java SDK generator for API Gateway APIs",
    configurationProperties: [
      {
        name: "service.name",
        friendlyName: "Service Name",
        description: "Name of the service which is used to derive the Java interface name for your client",
        required: true
      },
      {
        name: "java.package-name",
        friendlyName: "Java Package Name",
        description: "Name of the Java package your code will be generated under",
        required: true
      },
      {
        name: "java.build-system",
        friendlyName: "Java Build System",
        description: "Build system to setup for project; Currently supported: maven, gradle",
        required: false
      },
      {
        name: "java.group-id",
        friendlyName: "Java Group Id",
        description: "Group id for your Maven or Gradle project. Defaults to package name",
        required: false
      },
      {
        name: "java.artifact-id",
        friendlyName: "Java Artifact Id",
        description: "Artifact Id for your Maven project or project name for your Gradle project. Defaults to service name",
        required: false
      },
      {
        name: "java.artifact-version",
        friendlyName: "Java Artifact Version",
        description: "Version of your Maven or Gradle project. Defaults to 1.0-SNAPSHOT",
        required: false
      },
      {
        name: "java.license-text",
        friendlyName: "Source Code License Text",
        description: "Customer provided license to inject into source file headers",
        required: false
      }
    ]
  },
  {
    id: "ruby",
    friendlyName: "Ruby",
    description: "Ruby SDK generator for API Gateway APIs",
    configurationProperties: [
      {
        name: "service.name",
        friendlyName: "Service Name",
        description: "Name of the service which is used to derive the name for your client",
        required: true
      },
      {
        name: "ruby.gem-name",
        friendlyName: "Ruby Gem Name",
        description: "Name of the Ruby gem your code will be generated under",
        required: false
      },
      {
        name: "ruby.gem-version",
        friendlyName: "Ruby Gem Version",
        description: "Version number for your service gem. Defaults to 1.0.0",
        required: false
      }
    ]
  }
]

/**
 * 
 * Let's talk about this for a moment. For some reason, passing data through the server adds (or removes?) 
 * an unknown layer of encoding. To get around this, we're converting the file to a datauri on the backend, 
 * then sending that through. Kinda unfortunate, because the datauri is larger than the actual encoded file.
 * 
 * Eventually, this encoding should be uncovered, and removed or worked around. Once we do that, we will 
 * need to switched to requesting a blob, then use a file reader to read the Blob. For now, I'm leaving those 
 * in comments so we know how.
 * 
 */

function getSdk(sdkType, parameters = "{}") {
  let apiId = store.api.apiId || store.api.id
  let stageName = store.api.stage

  store.api.downloadingSdk = true

  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get(`/catalog/${apiId}_${stageName}/sdk`, { sdkType }, {}, {
      queryParams: { parameters },
      // leaving this as a comment so we know how to switch to a file in the future
      // config: { responseType: "blob" }
    }))
    .then(({ data, ...rest }) => {
      downloadFile(data, `${apiId}_${stageName}-${sdkType}.zip`)
    })
    .catch(({ data } = {}) => {
      addNotification({ header: "An error occurred while attempting to download the SDK.", content: data.message })
    })
    .finally(() => {
      store.api.downloadingSdk = false
    })
}

function downloadFile(dataUri, fileName) {
  // leaving this as a comment so we know how to switch to a file in the future
  // const reader = new FileReader()
  // reader.onloadend = () => {
  const downloadLinkElement = document.createElement('a')
  downloadLinkElement.setAttribute('href', dataUri)
  downloadLinkElement.setAttribute('download', fileName)
  downloadLinkElement.style.display = 'none'

  document.body.appendChild(downloadLinkElement)
  downloadLinkElement.click()
  document.body.removeChild(downloadLinkElement)
  // }
  // reader.readAsDataURL(data)
}
