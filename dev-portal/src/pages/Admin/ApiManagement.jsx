import React, { Component } from 'react'

import { Button, Table, Modal, Form, Message, Popup, Icon } from 'semantic-ui-react'

import { apiGatewayClient } from 'services/api'
import { getApi } from 'services/api-catalog'
import { store } from 'services/state'

import * as YAML from 'yamljs'

import hash from 'object-hash'
import { toJS } from 'mobx'
import { observer } from 'mobx-react'

export const ApiManagement = observer(class ApiManagement extends React.Component {
  state = {
    modalOpen: false,
    errors: []
  }

  fileInput = React.createRef()

  componentDidMount() {
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
                this.setState(prev => ({ ...prev, modalOpen: anyFailures, errors: anyFailures ? prev.errors : [] }))
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

          store.visibility = res.data
        }
      })
  }

  updateLocalApiGatewayApis = (apisList, updatedApi, parity) => {
    const updatedApis = apisList.map(stateApi => {
      if (stateApi.id === updatedApi.id && stateApi.stage === updatedApi.stage) {
        if(parity !== undefined && (parity === true || parity === false)) {
          stateApi.visibility = parity
        } else {
          stateApi.visibility = !stateApi.visibility
        }
      }
      return stateApi
    })

      store.visibility = { generic: store.visibility.generic, apiGateway: updatedApis }
  }

  showApiGatewayApi = (api) => {
    apiGatewayClient()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}`, subscribable: `${api.subscribable}` }, {}))
      .then((res) => {
        if (res.status === 200) {
          this.updateLocalApiGatewayApis(store.visibility.apiGateway, api)
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
            this.updateLocalApiGatewayApis(store.visibility.apiGateway, api)
          }
        })
    }
  }

    showAllApiGatewayApis = (usagePlan) => {
      Promise.all(usagePlan.apis.map((api) =>
          apiGatewayClient()
            .then(app => app.post('/admin/catalog/visibility', {}, {
              apiKey: `${api.id}_${api.stage}`,
              subscribable: `${api.subscribable}`
            }, {}))
            .then(res => { res.api = api; return res })
      )).then((promises) => {
        promises.forEach((result) => {
          if (result.status === 200) {
            this.updateLocalApiGatewayApis(store.visibility.apiGateway, result.api, true)
          }
        })
      })
    }

    hideAllApiGatewayApis = (usagePlan) => {
      Promise.all(usagePlan.apis.map((api) =>
        apiGatewayClient()
          .then(app => app.delete(`/admin/catalog/visibility/${api.id}_${api.stage}`, {}, {}, {}))
          .then(res => { res.api = api; return res })
      )).then((promises) => {
        promises.forEach((result) => {
          if (result.status === 200) {
            this.updateLocalApiGatewayApis(store.visibility.apiGateway, result.api, false)
          }
        })
      })
    }

  updateApiGatewayApi = (api) => {
    apiGatewayClient()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}`, subscribable: `${api.subscribable}` }, {}))
  }

  isSdkGenerationConfigurable = (api) => {
    return api.visibility
  }

  toggleSdkGeneration = (apisList, updatedApi) => {
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

          store.visibility.apiGateway = updatedApis
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
    const list = store.visibility.generic

    if (list[firstIndex].name !== list[secondIndex].name) {
      list[firstIndex].name.localeCompare(list[secondIndex].name)
    } else {
      // compare by their index, which happens to be their id
      return firstIndex.localeCompare(secondIndex)
    }
  }

  usagePlanSort = (first, second) => {
    if (first.name !== second.name) {
      return first.name.localeCompare(second.name)
    } else {
      return first.id.localeCompare(second.id)
    }
  }

  renderHeaderVisibilityButton(usagePlan) {
    let numberOfApis = usagePlan.apis.length,
        numberofVisibleApis = usagePlan.apis.filter((api) => api.visibility === true).length

    // every API is visible, show the "disable" button
    if(numberOfApis === numberofVisibleApis) {
      return (
        <Button basic
                color='green'
                style={{'backgroundColor': 'white', width: '100%'}}
                onClick={() => this.hideAllApiGatewayApis(usagePlan)}>
            True
        </Button>
      )
    }
    // every API is not visible, show the current state (False) and enable on click
    else if(numberofVisibleApis === 0) {
      return (
        <Button basic
                color='red'
                style={{'backgroundColor': 'white', width: '100%'}}
                onClick={() => this.showAllApiGatewayApis(usagePlan)}>
            False
        </Button>
      )
    }
    // some APIs are visible, some are hidden; show the current state (Partial, with a warning) and enable on click
    else {
      return (
      <Popup content='Users subscribed to any of the APIs in this usage plan will have a valid API key for all APIs in this usage plan, even those that are not visible!' trigger={<Button basic
                              color='yellow'
                              style={{ backgroundColor: 'white', width: '100%', paddingLeft: '1em', paddingRight: '1em', minWidth: '88px' }}
                              onClick={() => this.showAllApiGatewayApis(usagePlan)}>
        Partial <Icon name='warning sign' style={{ paddingLeft: '5px' }} />
      </Button>} />
      )
    }
  }

  sortByUsagePlan() {
    if(!store.visibility.apiGateway)
      return this.renderNoApis()

    let usagePlans =
      store.visibility.apiGateway
        .filter((api) => api.usagePlanId)
        .reduce((accumulator, api) => {
          if(!accumulator.find((usagePlan) => api.usagePlanId === usagePlan.id)) {
            accumulator.push({ id: api.usagePlanId, name: api.usagePlanName })
          }
          return accumulator
        }, [])
        .sort(this.usagePlanSort)
        .map((usagePlan) => {
          return { ...usagePlan, apis: store.visibility.apiGateway.filter((api) => api.usagePlanId === usagePlan.id).sort(this.tableSort) }
        }),
    unsubscribable =
      store.visibility.apiGateway
        .filter((api) => !api.usagePlanId)
          .sort(this.tableSort)

    return (
      <React.Fragment>
        {usagePlans.map((usagePlan, i) => {
          return (
            <React.Fragment>
              {this.renderHeader(usagePlan, i)}
              {usagePlan.apis.map((api) => api.id !== window.config.restApiId && this.renderRow(api, i))}
            </React.Fragment>
          )
        })}
        <Table.Row style={{'backgroundColor': '#1678c2', 'color': 'white'}}>
          <Table.Cell colSpan='6'>
            <b>Not Subscribable</b> <i>No Usage Plan</i>
          </Table.Cell>
        </Table.Row>
        {unsubscribable.map((api) => api.id !== window.config.restApiId && this.renderRow(api))}
      </React.Fragment>
    )
  }

  renderNoApis = () => {
    return (
      <Table.Row>
        <Table.Cell colSpan='4'>
          No APIs found
        </Table.Cell>
      </Table.Row>
    )
  }

  renderHeader(usagePlan, i) {
    return (
      <Table.Row key={i} style={{'backgroundColor': '#1678c2', 'color': 'white'}}>
        <Table.Cell colSpan='3'>
          <b>{usagePlan && usagePlan.name}</b> <i>Usage Plan</i>
        </Table.Cell>
        <Table.Cell>
            {this.renderHeaderVisibilityButton(usagePlan)}
        </Table.Cell>
        <Table.Cell colSpan='2'>

        </Table.Cell>
      </Table.Row>
    )
  }

  renderRow(api) {
    return (
      <Table.Row>
        <Table.Cell collapsing>{api.name}</Table.Cell>
        <Table.Cell>{api.stage}</Table.Cell>
        <Table.Cell>{api.subscribable ? 'Subscribable' : 'Not Subscribable'}</Table.Cell>
        <Table.Cell>
          <Button basic
                  color={api.visibility ? 'green' : 'red'}
                  style={{ width: '100%' }}
                  onClick={() => api.visibility ? this.hideApiGatewayApi(api) : this.showApiGatewayApi(api)}>
              {api.visibility ? 'True' : 'False'}
          </Button>
        </Table.Cell>
        <Table.Cell>
          <Button basic
                  color='blue'
                  disabled={!api.visibility}
                  style={{ width: '100%' }}
                  onClick={() => this.updateApiGatewayApi(api)}>
            Update
          </Button>
        </Table.Cell>
        <Table.Cell>
          <Button basic
              // color={api.sdkGeneration ? 'green' : 'red'}
                  color='blue'
                  style={{ width: '100%' }}
                  disabled={!api.visibility || !this.isSdkGenerationConfigurable(api)}
                  onClick={() => this.toggleSdkGeneration(store.visibility.apiGateway, api)}>
              {api.sdkGeneration ? 'Enabled' : 'Disabled'}
          </Button>
        </Table.Cell>
      </Table.Row>
    )
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
              { this.sortByUsagePlan() }
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
                    closeIcon
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
              {store.visibility.generic ? Object.keys(store.visibility.generic).sort(this.genericTableSort).map((apiId, i) =>
                (
                  <Table.Row key={i}>
                    <Table.Cell collapsing>{store.visibility.generic[apiId].name}</Table.Cell>
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
})
