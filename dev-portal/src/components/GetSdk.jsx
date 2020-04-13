// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { apiGatewayClientWithCredentials } from 'services/api'
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
        {sdkTypes.map((type) => (
          <div className='item' key={type.id} onClick={() => confirmDownload(type, getSdk)}>
            {type.friendlyName}
          </div>
        ))}
      </Dropdown>
      <Dropdown text='Export API' pointing className='link item'>
        {exportTypes.map((type) => (
          <div className='item' key={type.id} onClick={() => confirmDownload(type, getExport)}>
            {type.friendlyName}
          </div>
        ))}
      </Dropdown>
      {store.api.downloadingSdkOrApi && <Loader active inline size='tiny' />}
    </span>
  )
})

class Dropdown extends React.Component {
  constructor (props) {
    super(props)

    this.state = { visible: false }
    this.button = +(new Date()) + '-dropdown-clickable' // we've using this class to exclude certain elements from hiding

    this.toggleDropdown = () => this.setState(prevState => ({ ...prevState, visible: !prevState.visible }))
    this.hideDropdown = event => {
      if (!event.target.classList.contains(this.button)) { this.setState(prevState => ({ ...prevState, visible: false })) }
    }

    document.addEventListener('click', this.hideDropdown)
  }

  componentWillUnmount () {
    document.removeEventListener('click', this.hideDropdown)
  }

  render () {
    /* eslint-disable react/jsx-handler-names */
    return (
      <span onClick={this.toggleDropdown} className={'ui button pointing dropdown link item ' + this.button + (this.state.visible ? ' active' : '')}>
        {this.props.text}
        <i className={'dropdown icon ' + this.button} />
        <div className={'menu transition' + (this.state.visible ? ' visible' : '')}>
          {this.props.children}
        </div>
      </span>
    )
    /* eslint-enable react/jsx-handler-names */
  }
}

function confirmDownload (type, getDownload) {
  if (type.configurationProperties.length) {
    modal.open(<GetSdkModal type={type} getDownload={getDownload} />)
  } else {
    getDownload(type.id)
  }
}

/**
 * This modal is included by the modals component, which also provides the default open/close controls for all modals.
 */
export class GetSdkModal extends React.Component {
  constructor (props) {
    super(props)

    // generate a null state value for each required property (to validate against)
    const fields = props.type.configurationProperties.reduce((obj, property) => {
      if (property.type === 'checkbox') {
        obj[property.name] = false
      } else if (property.type === 'radio') {
        obj[property.name] = property.default
      } else if (property.required) {
        obj[property.name] = null
      }
      return obj
    }, {})

    this.state = {
      fields
    }

    this.handleChange = (event, { name, checked, value }) => {
      this.setState((prevState) => {
        const prop = this.props.type.configurationProperties.find(property => property.name === name)
        const newState = _.cloneDeep(prevState)
        newState.fields[name] = prop.type === 'checkbox' ? checked : value
        return newState
      })
    }

    this.handleSubmit = () => {
      if (!this.isDisabled().disabled) {
        modal.close()
        this.props.getDownload(this.props.type.id, this.state.fields)
      }
    }
  }

  // this function returns a prop directly
  // it's intended to be used like <Component {...this.canSubmit()} />
  isDisabled () {
    const hasEmptyValue = !!Object.entries(this.state.fields)
      .find(([key, value]) => value == null || value === '')

    return { disabled: hasEmptyValue }
  }

  renderProperty (property) {
    if (property.type === 'checkbox') {
      return (
        <Form.Checkbox
          name={property.name}
          label={`${property.friendlyName}`}
          onChange={this.handleChange}
        />
      )
    } else if (
      property.type === 'radio' &&
      property.values.some(value => property.default === value.name)
    ) {
      return (
        <Form.Group inline>
          <Form.Field>{property.friendlyName}</Form.Field>
          <>
            {property.values.map(({ friendlyName, name }) => (
              <Form.Radio
                key={name}
                name={property.name}
                label={`${friendlyName}`}
                value={name}
                checked={this.state.fields[property.name] === name}
                onChange={this.handleChange}
              />
            ))}
          </>
        </Form.Group>
      )
    } else if (property.required) {
      return (
        <Form.Input
          name={property.name}
          label={`${property.friendlyName} (required)`}
          placeholder={property.friendlyName}
          onChange={this.handleChange}
        />
      )
    } else {
      // only display required fields for now
      return null
    }
  }

  render () {
    const type = this.props.type

    /* eslint-disable react/jsx-closing-bracket-location */
    /* eslint-disable react/jsx-closing-tag-location */
    /* eslint-disable react/jsx-handler-names */
    return <>
      <Header icon='archive' content={`Download the ${type.longName}`} />
      <Modal.Content>
        <Form onSubmit={this.handleSubmit}>
          {type.configurationProperties.map(property => (
            <React.Fragment key={property.name}>
              {this.renderProperty(property)}
            </React.Fragment>
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
    /* eslint-enable react/jsx-closing-bracket-location */
    /* eslint-enable react/jsx-closing-tag-location */
    /* eslint-enable react/jsx-handler-names */
  }
}

const sdkTypes = [
  {
    id: 'android',
    friendlyName: 'Android',
    longName: 'Android SDK',
    description: '',
    configurationProperties: [
      {
        name: 'groupId',
        friendlyName: 'Group ID',
        description: '',
        required: true
      }, {
        name: 'invokerPackage',
        friendlyName: 'Invoker package',
        description: '',
        required: true
      }, {
        name: 'artifactId',
        friendlyName: 'Artifact ID',
        description: '',
        required: true
      }, {
        name: 'artifactVersion',
        friendlyName: 'Artifact version',
        description: '',
        required: true
      }
    ]
  },
  {
    id: 'javascript',
    friendlyName: 'JavaScript',
    longName: 'JavaScript SDK',
    description: '',
    configurationProperties: []
  },
  {
    id: 'ios-objective-c',
    friendlyName: 'iOS (Objective-C)',
    longName: 'iOS SDK (Objective-C)',
    description: '',
    configurationProperties: [
      {
        name: 'classPrefix',
        friendlyName: 'Prefix',
        description: '',
        required: true
      }
    ]
  },
  {
    id: 'ios-swift',
    friendlyName: 'iOS (Swift)',
    longName: 'iOS SDK (Swift)',
    description: '',
    configurationProperties: [
      {
        name: 'classPrefix',
        friendlyName: 'Prefix',
        description: '',
        required: true
      }
    ]
  },
  {
    id: 'java',
    friendlyName: 'Java',
    longName: 'Java SDK',
    description: 'Java SDK generator for API Gateway APIs',
    configurationProperties: [
      {
        name: 'service.name',
        friendlyName: 'Service Name',
        description: 'Name of the service which is used to derive the Java interface name for your client',
        required: true
      },
      {
        name: 'java.package-name',
        friendlyName: 'Java Package Name',
        description: 'Name of the Java package your code will be generated under',
        required: true
      },
      {
        name: 'java.build-system',
        friendlyName: 'Java Build System',
        description: 'Build system to setup for project; Currently supported: maven, gradle',
        required: false
      },
      {
        name: 'java.group-id',
        friendlyName: 'Java Group Id',
        description: 'Group id for your Maven or Gradle project. Defaults to package name',
        required: false
      },
      {
        name: 'java.artifact-id',
        friendlyName: 'Java Artifact Id',
        description: 'Artifact Id for your Maven project or project name for your Gradle project. Defaults to service name',
        required: false
      },
      {
        name: 'java.artifact-version',
        friendlyName: 'Java Artifact Version',
        description: 'Version of your Maven or Gradle project. Defaults to 1.0-SNAPSHOT',
        required: false
      },
      {
        name: 'java.license-text',
        friendlyName: 'Source Code License Text',
        description: 'Customer provided license to inject into source file headers',
        required: false
      }
    ]
  },
  {
    id: 'ruby',
    friendlyName: 'Ruby',
    longName: 'Ruby SDK',
    description: 'Ruby SDK generator for API Gateway APIs',
    configurationProperties: [
      {
        name: 'service.name',
        friendlyName: 'Service Name',
        description: 'Name of the service which is used to derive the name for your client',
        required: true
      },
      {
        name: 'ruby.gem-name',
        friendlyName: 'Ruby Gem Name',
        description: 'Name of the Ruby gem your code will be generated under',
        required: false
      },
      {
        name: 'ruby.gem-version',
        friendlyName: 'Ruby Gem Version',
        description: 'Version number for your service gem. Defaults to 1.0.0',
        required: false
      }
    ]
  }
]

const exportTypes = [
  {
    id: 'oas30',
    friendlyName: 'OpenAPI 3',
    longName: 'OpenAPI 3 definitions',
    description: '',
    configurationProperties: [
      {
        name: 'extensions.integrations',
        friendlyName: 'Include x-amazon-apigateway-integration extensions',
        description: '',
        type: 'checkbox'
      },
      {
        name: 'extensions.authorizers',
        friendlyName: 'Include x-amazon-apigateway-authorizer extensions',
        description: '',
        type: 'checkbox'
      },
      {
        name: 'extensions.postman',
        friendlyName: 'Include extensions to allow importing into Postman',
        description: '',
        type: 'checkbox'
      },
      {
        name: 'accept',
        friendlyName: 'Export format',
        description: '',
        type: 'radio',
        default: 'application/json',
        values: [
          { name: 'application/json', friendlyName: 'JSON' },
          { name: 'application/yaml', friendlyName: 'YAML' }
        ]
      }
    ]
  },
  {
    id: 'swagger',
    friendlyName: 'Swagger 2',
    longName: 'Swagger (OpenAPI 2) definitions',
    description: '',
    configurationProperties: [
      {
        name: 'extensions.integrations',
        friendlyName: 'Include x-amazon-apigateway-integration extensions',
        description: '',
        type: 'checkbox'
      },
      {
        name: 'extensions.authorizers',
        friendlyName: 'Include x-amazon-apigateway-authorizer extensions',
        description: '',
        type: 'checkbox'
      },
      {
        name: 'extensions.postman',
        friendlyName: 'Include extensions to allow importing into Postman',
        description: '',
        type: 'checkbox'
      },
      {
        name: 'accept',
        friendlyName: 'Export format',
        description: '',
        type: 'radio',
        default: 'application/json',
        values: [
          { name: 'application/json', friendlyName: 'JSON' },
          { name: 'application/yaml', friendlyName: 'YAML' }
        ]
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

function fetchBlob ({ blobType, endpointName, sdkType, exportType, ext, parameters }) {
  const apiId = store.api.apiId || store.api.id
  const stageName = store.api.apiStage

  store.api.downloadingSdkOrApi = true

  return apiGatewayClientWithCredentials()
    .then(apiGatewayClient => apiGatewayClient.get(
      `/catalog/${apiId}_${stageName}/${endpointName}`,
      { sdkType },
      {},
      {
        queryParams: { exportType, parameters: JSON.stringify(parameters) },
        config: { responseType: 'blob' }
      }
    ))
    .then(({ data }) => {
      downloadFile(data, `${apiId}_${stageName}-${sdkType || exportType}${ext}`)
    })
    .catch(({ data }) => data.text().then(text => {
      const result = JSON.parse(text)
      addNotification({ header: `An error occurred while attempting to download the ${blobType}.`, content: result && result.message })
    }))
    .finally(() => {
      store.api.downloadingSdkOrApi = false
    })
}

function downloadFile (blob, fileName) {
  const dataUri = URL.createObjectURL(blob)
  const downloadLinkElement = document.createElement('a')
  downloadLinkElement.setAttribute('href', dataUri)
  downloadLinkElement.setAttribute('download', fileName)
  downloadLinkElement.style.display = 'none'

  document.body.appendChild(downloadLinkElement)
  downloadLinkElement.click()
  document.body.removeChild(downloadLinkElement)
  URL.revokeObjectURL(dataUri)
}

function getSdk (sdkType, parameters = {}) {
  return fetchBlob({
    blobType: 'SDK',
    endpointName: 'sdk',
    ext: '.zip',
    sdkType,
    parameters
  })
}

function getExport (exportType, parameters = {}) {
  if (exportType === 'oas30' || exportType === 'swagger') {
    const extensions = []
    if (parameters['extensions.integrations']) extensions.push('integrations')
    if (parameters['extensions.authorizers']) extensions.push('authorizers')
    if (parameters['extensions.postman']) extensions.push('postman')
    parameters = _.omit(parameters, [
      'extensions.integrations',
      'extensions.authorizers',
      'extensions.postman'
    ])
    if (extensions.length) parameters.extensions = extensions.join(',')
  }

  return fetchBlob({
    blobType: 'API export',
    endpointName: 'export',
    ext: '.json',
    exportType,
    parameters
  })
}
