import React, { Component } from 'react';

import { Button, Table, Modal, Form } from 'semantic-ui-react'

import { apiGatewayClient } from 'services/api'
import { getApi } from 'services/api-catalog';

import * as YAML from 'yamljs'


export class ApiManagement extends Component {
  state = {
    apis: {
      apiGateway: null,
      generic: null
    },
    modalOpen: false
  }

  fileInput = React.createRef()

  componentDidMount() {
    this.getApiVisibility()
  }

  uploadAPISpec = (event) => {
    event.preventDefault();

    const files = this.fileInput.current.files
    let swagger

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()

        reader.onload = ((f) => (e) => {
          if (f.name.includes('yaml')) {
            swagger = JSON.stringify(YAML.parse(e.target.result))
          } else {
            swagger = JSON.stringify(JSON.parse(e.target.result))
          }

          apiGatewayClient()
            .then((app) => app.post('/admin/catalog/visibility', {}, { swagger }, {}))
            .then((res) => {
              if (res.status === 200) {
                this.setState(prev => ({ ...prev, modalOpen: false }))
              }
              setTimeout(() => this.getApiVisibility(), 2000)
            })
        })(file);
        reader.readAsText(file);
      }
    }
  }

  deleteAPISpec = (apiId) => {
    function hash(str) {
      let hash = 5381,
        i = str.length;

      while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
      }

      /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
       * integers. Since we want the results to be always positive, convert the
       * signed int to an unsigned by doing an unsigned bitshift. */
      return hash >>> 0;
    }

    getApi(apiId).then(api => {
      let myHash = hash(JSON.stringify(api.swagger))
      apiGatewayClient()
        .then(app => app.delete(`/admin/catalog/visibility/generic/${myHash}`, {}, {}, {}))
        .then((res) => {
          console.log(`data received: ${JSON.stringify(res, null, 2)}`);
          setTimeout(() => this.getApiVisibility(), 2000)
        })
    })

  }

  getApiVisibility = () => {
    apiGatewayClient()
      .then(app => app.get('/admin/catalog/visibility', {}, {}, {}))
      .then(res => {
        if (res.status === 200) {
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
    apiGatewayClient()
      .then(app => app.delete(`/admin/catalog/visibility/${api.id}_${api.stage}`, {}, {}, {}))
      .then((res) => {
        if (res.status === 200) {
          this.updateLocalApiGatewayApis(this.state.apis.apiGateway, api)
        }
      })
  }

  updateApiGatewayApi = (api) => {
    apiGatewayClient()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}` }, {}))
      .then(res => console.log(res.status))
  }

  isSdkGenerationConfigurable = (api) => {
    return api.visibility
  }

  toggleSdkGeneration = (apisList, updatedApi) => {
    console.log(`toggling generation for ${updatedApi.name}: ${updatedApi.id}_${updatedApi.stage}`)
    apiGatewayClient()
      .then(app => {
        if(updatedApi.sdkGeneration) {
            return app.delete(`/admin/catalog/${updatedApi.id}_${updatedApi.stage}/sdkGeneration`, {}, {}, {})
        } else {
            return app.put(`/admin/catalog/${updatedApi.id}_${updatedApi.stage}/sdkGeneration`, {}, {}, {})
        }
      })
      .then(res => {
        if(res.status === 200) {
          const updatedApis = apisList.map(stateApi => {
            if (stateApi.id === updatedApi.id && stateApi.stage === updatedApi.stage) {
              stateApi.sdkGeneration = !stateApi.sdkGeneration
            }
            return stateApi
          })

          this.setState(
            ({apis: {generic = undefined}}, ...prev) => ({...prev, apis: {apiGateway: updatedApis, generic}})
          )
        }
      })
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
              {this.state.apis.apiGateway ? this.state.apis.apiGateway.map((api, i) =>
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
                        disabled={!this.isSdkGenerationConfigurable(api)}
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
              {this.state.apis.generic ? Object.keys(this.state.apis.generic).map((apiId, i) =>
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
