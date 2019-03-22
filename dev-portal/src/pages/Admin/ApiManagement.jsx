import React, { Component } from 'react'

import { Button, Table, Modal, Form, Message } from 'semantic-ui-react'

import { apiGatewayClient } from 'services/api'
import { getApi } from 'services/api-catalog'

import * as YAML from 'yamljs'

import hash from 'object-hash'
import { toJS } from 'mobx'


export class ApiManagement extends Component {
  state = {
    apis: {
      apiGateway: null,
      generic: null
    },
    modalOpen: false,
    errors: []
  }

  fileInput = React.createRef()

  componentDidMount() {
    this.setState(prev => ({ ...prev, errors: [] }))
    this.getApiVisibility()
  }

  uploadAPISpec = (event) => {
    event.preventDefault();

    const files = this.fileInput.current.files
    let swagger, swaggerObject, anyFailures

    if (files.length > 0) {
      this.setState(prev => ({ ...prev, errors: [] }))

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()

        reader.onload = ((f) => (e) => {
          if (f.name.includes('yaml')) {
            swaggerObject = YAML.parse(e.target.result)
            swagger = JSON.stringify(swaggerObject)
          } else {
            swaggerObject = JSON.parse(e.target.result)
            swagger = JSON.stringify(swaggerObject)
          }

          if (!(swaggerObject.info && swaggerObject.info.title)) {
            anyFailures = true
            this.setState(prev => ({ ...prev, errors: [...prev.errors, file.name] }))
            return
          }

          if (anyFailures) {
            return
          }

          apiGatewayClient()
            .then((app) => app.post('/admin/catalog/visibility', {}, { swagger }, {}))
            .then((res) => {
              if (res.status === 200) {
                this.setState(prev => ({ ...prev, modalOpen: false, errors: [] }))
              }
              setTimeout(() => this.getApiVisibility(), 2000)
            })
        })(file);
        reader.readAsText(file);
      }
    }
  }

  deleteAPISpec = (apiId) => {
    getApi(apiId, false, undefined, true).then(api => {
      let _api = toJS(api),
        myHash = hash(_api.swagger)

      apiGatewayClient()
        .then(app => app.delete(`/admin/catalog/visibility/generic/${myHash}`, {}, {}, {}))
        .then((res) => {
          setTimeout(() => this.getApiVisibility(), 2000)
        })
    })

  }

  getApiVisibility = () => {
    apiGatewayClient()
      .then(app => app.get('/admin/catalog/visibility', {}, {}, {}))
      .then(res => {
        if (res.status === 200) {
          // console.log(`visibility: ${JSON.stringify(res.data, null, 2)}`)

          let apiGateway = res.data.apiGateway
          let generic = res.data.generic && Object.keys(res.data.generic)

          // console.log(`generic: ${JSON.stringify(generic, null, 2)}`)
          // console.log(`api gateway: ${JSON.stringify(apiGateway, null, 2)}`)

          apiGateway.forEach(api => {
            if (generic) {
              generic.forEach(genApi => {
                if (res.data.generic[`${genApi}`]) {
                  if (
                    res.data.generic[`${genApi}`].apiId === api.id &&
                    res.data.generic[`${genApi}`].stage === api.stage
                  ) {
                    api.visibility = true
                    delete res.data.generic[`${genApi}`]
                  }
                }
              })
            }
          })

          this.setState(prev => ({ ...prev, apis: res.data }))
        }
      })
  }

  updateLocalApiGatewayApis = (apisList, updatedApi) => {
    const updatedApis = apisList.map(stateApi => {
      if (stateApi.id === updatedApi.id && stateApi.stage === updatedApi.stage) {
        stateApi.visibility = !stateApi.visibility
      }
      return stateApi
    })

    this.setState(
      ({ apis: { generic = undefined } }, ...prev) => ({ ...prev, apis: { apiGateway: updatedApis, generic } })
    )
  }

  showApiGatewayApi = (api) => {
    apiGatewayClient()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}`, subscribable: `${api.subscribable}` }, {}))
      .then((res) => {
        if (res.status === 200) {
          this.updateLocalApiGatewayApis(this.state.apis.apiGateway, api)
        }
      })
  }

  hideApiGatewayApi = (api) => {
    if (!api.subscribable && !api.id && !api.stage) {
      this.deleteAPISpec(api.genericId)
    } else {
      apiGatewayClient()
        .then(app => app.delete(`/admin/catalog/visibility/${api.id}_${api.stage}`, {}, {}, {}))
        .then((res) => {
          if (res.status === 200) {
            this.updateLocalApiGatewayApis(this.state.apis.apiGateway, api)
          }
        })
    }
  }

  updateApiGatewayApi = (api) => {
    apiGatewayClient()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}`, subscribable: `${api.subscribable}` }, {}))
      .then(res => console.log(res.status))
  }

  isSdkGenerationConfigurable = (api) => {
    return api.visibility
  }

  toggleSdkGeneration = (apisList, updatedApi) => {
    console.log(`toggling generation for ${updatedApi.name}: ${updatedApi.id}_${updatedApi.stage}`)
    apiGatewayClient()
      .then(app => {
        if (updatedApi.sdkGeneration) {
          return app.delete(`/admin/catalog/${updatedApi.id}_${updatedApi.stage}/sdkGeneration`, {}, {}, {})
        } else {
          return app.put(`/admin/catalog/${updatedApi.id}_${updatedApi.stage}/sdkGeneration`, {}, {}, {})
        }
      })
      .then(res => {
        if (res.status === 200) {
          const updatedApis = apisList.map(stateApi => {
            if (stateApi.id === updatedApi.id && stateApi.stage === updatedApi.stage) {
              stateApi.sdkGeneration = !stateApi.sdkGeneration
            }
            return stateApi
          })

          this.setState(
            ({ apis: { generic = undefined } }, ...prev) => ({ ...prev, apis: { apiGateway: updatedApis, generic } })
          )
        }
      })
  }

  tableSort = (first, second) => {
    if (first.name !== second.name) {
      return first.name.localeCompare(second.name)
    } else {
      return first.stage.localeCompare(second.stage)
    }
  }

  genericTableSort = (firstIndex, secondIndex) => {
    const list = this.state.apis.generic

    if (list[firstIndex].name !== list[secondIndex].name) {
      list[firstIndex].name.localeCompare(list[secondIndex].name)
    } else {
      // compare by their index, which happens to be their id
      return firstIndex.localeCompare(secondIndex)
    }
  }

  render() {
    return (
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ padding: '2em' }}>
          <Table celled collapsing>
            <Table.Header fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan='6'>API Gateway APIs</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Header fullWidth>
              <Table.Row>
                <Table.HeaderCell collapsing sorted="ascending">API Name</Table.HeaderCell>
                <Table.HeaderCell>Stage</Table.HeaderCell>
                <Table.HeaderCell>API Type</Table.HeaderCell>
                <Table.HeaderCell>Displayed</Table.HeaderCell>
                <Table.HeaderCell>Update</Table.HeaderCell>
                <Table.HeaderCell>Allow Generating SDKs</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {this.state.apis.apiGateway ? this.state.apis.apiGateway.sort(this.tableSort).map((api, i) =>
                api.id !== window.config.restApiId && (
                  <Table.Row key={i}>
                    <Table.Cell collapsing>{api.name}</Table.Cell>
                    <Table.Cell>{api.stage}</Table.Cell>
                    <Table.Cell>{api.subscribable ? 'Subscribable' : 'Not Subscribable'}</Table.Cell>
                    <Table.Cell>
                      <Button basic
                        color={api.visibility ? 'green' : 'red'}
                        onClick={() => api.visibility ? this.hideApiGatewayApi(api) : this.showApiGatewayApi(api)}>
                        {api.visibility ? 'True' : 'False'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Button basic
                        color='blue'
                        disabled={!api.visibility}
                        onClick={() => this.updateApiGatewayApi(api)}>
                        Update
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Button basic
                        // color={api.sdkGeneration ? 'green' : 'red'}
                        color='blue'
                        disabled={!api.visibility || !this.isSdkGenerationConfigurable(api)}
                        onClick={() => this.toggleSdkGeneration(this.state.apis.apiGateway, api)}>
                        {api.sdkGeneration ? 'Enabled' : 'Disabled'}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )) : (
                  <Table.Row >
                    <Table.Cell colSpan='4'>
                      No APIs found
                </Table.Cell>
                  </Table.Row>
                )}
            </Table.Body>
          </Table>
        </div>

        <div style={{ padding: '2em' }}>
          <Table celled collapsing>
            <Table.Header fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan='4'>Generic APIs</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Header fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan='2'>
                  <Modal
                    closeOnEscape={true}
                    closeOnDimmerClick={true}
                    onClose={() => this.setState((prev) => ({ ...prev, modalOpen: false }))}
                    trigger={
                      <Button floated='right' onClick={() => this.setState((prev) => ({ ...prev, modalOpen: true }))}>
                        Add API
                    </Button>}
                    open={this.state.modalOpen}
                  >
                    <Modal.Header>Select .JSON, .YAML, or .YML files</Modal.Header>
                    <Modal.Content>
                      <React.Fragment>
                        <Form onSubmit={this.uploadAPISpec}>
                          <Form.Field>
                            <label htmlFor="files">Select Files:</label>
                            <input type="file" id="files" name="files" accept=".json,.yaml,.yml" multiple={true} ref={this.fileInput} />
                          </Form.Field>
                          {!!this.state.errors.length &&
                            <Message size='tiny' color='red' list={this.state.errors} header="These files are not parseable or do not contain an api title:" />
                          }
                          <br />
                          <Button type='submit'>Upload</Button>
                        </Form>
                      </React.Fragment>
                    </Modal.Content>
                  </Modal>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Header fullWidth>
              <Table.Row>
                <Table.HeaderCell collapsing sorted="ascending">API Name</Table.HeaderCell>
                <Table.HeaderCell>Delete</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {this.state.apis.generic ? Object.keys(this.state.apis.generic).sort(this.genericTableSort).map((apiId, i) =>
                (
                  <Table.Row key={i}>
                    <Table.Cell collapsing>{this.state.apis.generic[apiId].name}</Table.Cell>
                    <Table.Cell>
                      <Button basic
                        color='red'
                        onClick={() => this.deleteAPISpec(apiId)}>
                        Delete
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )) : (
                  <Table.Row >
                    <Table.Cell colSpan='4'>
                      No APIs found
                    </Table.Cell>
                  </Table.Row>
                )}
            </Table.Body>
          </Table>
        </div>
      </div>
    );
  }
}
