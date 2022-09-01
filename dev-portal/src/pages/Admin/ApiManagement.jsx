import React from 'react'

import { Button, Loader, Table, Modal, Form, Message, Popup, Icon } from 'semantic-ui-react'

import { apiGatewayClientWithCredentials } from 'services/api'
import { getApi } from 'services/api-catalog'
import { store } from 'services/state'

import * as YAML from 'js-yaml'

import hash from 'object-hash'
import { toJS } from 'mobx'
import { observer } from 'mobx-react'

function getUsagePlanVisibility (usagePlan) {
  let hasHidden = false
  let hasVisible = false

  for (const api of usagePlan.apis) {
    if (api.visibility) {
      if (hasHidden) return null
      hasVisible = true
    } else {
      if (hasVisible) return null
      hasHidden = true
    }
  }

  return hasVisible
}

function removeFirst (array, item) {
  const index = array.indexOf(item)
  const result = array.slice()
  result.splice(index, 1)
  return result
}

export const ApiManagement = observer(class ApiManagement extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      modalOpen: false,
      errors: [],
      // Simpler than implementing a multiset, and probably also faster.
      // TODO: abstract this out. It's getting a bit out of hand.
      plansDisplayToggling: [],
      apisDisplayToggling: [],
      apisUpdating: [],
      apisDeleting: [],
      apisTogglingSdks: []
    }

    this.fileInput = React.createRef()

    this.tableSort = (first, second) => {
      if (first.name !== second.name) {
        return first.name.localeCompare(second.name)
      } else {
        return first.stage.localeCompare(second.stage)
      }
    }

    this.genericTableSort = (firstIndex, secondIndex) => {
      const list = store.visibility.generic

      if (list[firstIndex].name !== list[secondIndex].name) {
        list[firstIndex].name.localeCompare(list[secondIndex].name)
      } else {
        // compare by their index, which happens to be their id
        return firstIndex.localeCompare(secondIndex)
      }
    }

    this.usagePlanSort = (first, second) => {
      if (first.name !== second.name) {
        return first.name.localeCompare(second.name)
      } else {
        return first.id.localeCompare(second.id)
      }
    }
  }

  componentDidMount () {
    this.getApiVisibility()
  }

  uploadAPISpec (event) {
    event.preventDefault()

    const files = this.fileInput.current.files
    let swagger, swaggerObject, anyFailures

    if (files.length > 0) {
      this.setState(prev => ({ ...prev, errors: [] }))
      ;[].forEach.call(files, file => {
        const reader = new window.FileReader()

        reader.onload = (e) => {
          if (file.name.includes('yaml')) {
            swaggerObject = YAML.load(e.target.result)
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

          apiGatewayClientWithCredentials()
            .then((app) => app.post('/admin/catalog/visibility', {}, { swagger }, {}))
            .then((res) => {
              if (res.status === 200) {
                this.getApiVisibility()
                this.setState(prev => ({ ...prev, modalOpen: Boolean(anyFailures), errors: anyFailures ? prev.errors : [] }))
              }
            })
        }
        reader.readAsText(file)
      })
    }
  }

  deleteAPISpec (apiId) {
    this.setState(({ apisDeleting }) => ({ apisDeleting: [...apisDeleting, apiId] }))
    getApi(apiId, false, undefined, true).then(api => {
      const _api = toJS(api)
      const key = _api.stage ? `${_api.id}_${_api.stage}` : hash(_api.swagger)

      apiGatewayClientWithCredentials()
        .then(app => app.delete(`/admin/catalog/visibility/generic/${key}`, {}, {}, {}))
        .then((res) => {
          if (res.status === 200) this.getApiVisibility()
        })
        .then(() => this.setState(({ apisDeleting }) => ({ apisDeleting: removeFirst(apisDeleting, apiId) })))
    })
  }

  getApiVisibility () {
    apiGatewayClientWithCredentials()
      .then(app => app.get('/admin/catalog/visibility', {}, {}, {}))
      .then(res => {
        if (res.status === 200) {
          // console.log(`visibility: ${JSON.stringify(res.data, null, 2)}`)

          const apiGateway = res.data.apiGateway
          const generic = res.data.generic && Object.keys(res.data.generic)

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

  updateLocalApiGatewayApis (apisList, updatedApi, parity) {
    const updatedApis = apisList.map(stateApi => {
      if (stateApi.id === updatedApi.id && stateApi.stage === updatedApi.stage) {
        if (parity !== undefined && (parity === true || parity === false)) {
          stateApi.visibility = parity
        } else {
          stateApi.visibility = !stateApi.visibility
        }
      }
      return stateApi
    })

    store.visibility = { generic: store.visibility.generic, apiGateway: updatedApis }
  }

  showApiGatewayApi (api) {
    const apiId = api.stage ? `${api.id}_${api.stage}` : api.id
    this.setState(({ apisDisplayToggling }) => ({ apisDisplayToggling: [...apisDisplayToggling, apiId] }))
    apiGatewayClientWithCredentials()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}`, subscribable: `${api.subscribable}` }, {}))
      .then((res) => {
        this.setState(({ apisDisplayToggling }) => ({ apisDisplayToggling: removeFirst(apisDisplayToggling, apiId) }))
        if (res.status === 200) {
          this.updateLocalApiGatewayApis(store.visibility.apiGateway, api)
        }
      })
  }

  hideApiGatewayApi (api) {
    if (!api.subscribable && !api.id && !api.stage) {
      this.deleteAPISpec(api.genericId)
    } else {
      const apiId = api.stage ? `${api.id}_${api.stage}` : api.id
      this.setState(({ apisDisplayToggling }) => ({ apisDisplayToggling: [...apisDisplayToggling, apiId] }))
      apiGatewayClientWithCredentials()
        .then(app => app.delete(`/admin/catalog/visibility/${api.id}_${api.stage}`, {}, {}, {}))
        .then((res) => {
          this.setState(({ apisDisplayToggling }) => ({ apisDisplayToggling: removeFirst(apisDisplayToggling, apiId) }))
          if (res.status === 200) {
            this.updateLocalApiGatewayApis(store.visibility.apiGateway, api)
          }
        })
    }
  }

  showAllApiGatewayApis (usagePlan) {
    // Only toggle APIs that aren't already shown.
    const apiIds = usagePlan.apis.filter(api => !api.visibility).map(api => `${api.id}_${api.stage}`)
    this.setState(({ plansDisplayToggling, apisDisplayToggling }) => ({
      plansDisplayToggling: [...plansDisplayToggling, usagePlan.id],
      apisDisplayToggling: [...apisDisplayToggling, ...apiIds]
    }))
    Promise.all(usagePlan.apis.map((api) =>
      apiGatewayClientWithCredentials()
        .then(app => app.post('/admin/catalog/visibility', {}, {
          apiKey: `${api.id}_${api.stage}`,
          subscribable: `${api.subscribable}`
        }, {}))
        .then(res => { res.api = api; return res })
    )).then((promises) => {
      this.setState(({ plansDisplayToggling, apisDisplayToggling }) => ({
        plansDisplayToggling: removeFirst(plansDisplayToggling, usagePlan.id),
        apisDisplayToggling: apiIds.reduce(removeFirst, apisDisplayToggling)
      }))
      promises.forEach((result) => {
        if (result.status === 200) {
          this.updateLocalApiGatewayApis(store.visibility.apiGateway, result.api, true)
        }
      })
    })
  }

  hideAllApiGatewayApis (usagePlan) {
    // Only toggle APIs that aren't already hidden.
    const apiIds = usagePlan.apis.filter(api => api.visibility).map(api => `${api.id}_${api.stage}`)
    this.setState(({ plansDisplayToggling, apisDisplayToggling }) => ({
      plansDisplayToggling: [...plansDisplayToggling, usagePlan.id],
      apisDisplayToggling: [...apisDisplayToggling, ...apiIds]
    }))
    Promise.all(usagePlan.apis.map((api) =>
      apiGatewayClientWithCredentials()
        .then(app => app.delete(`/admin/catalog/visibility/${api.id}_${api.stage}`, {}, {}, {}))
        .then(res => { res.api = api; return res })
    )).then((promises) => {
      this.setState(({ plansDisplayToggling, apisDisplayToggling }) => ({
        plansDisplayToggling: removeFirst(plansDisplayToggling, usagePlan.id),
        apisDisplayToggling: apiIds.reduce(removeFirst, apisDisplayToggling)
      }))
      promises.forEach((result) => {
        if (result.status === 200) {
          this.updateLocalApiGatewayApis(store.visibility.apiGateway, result.api, false)
        }
      })
    })
  }

  isTogglingPlanDisplay (usagePlan) {
    return this.state.plansDisplayToggling.includes(usagePlan.id)
  }

  isTogglingApiDisplay (api) {
    return this.state.apisDisplayToggling.includes(api.stage ? `${api.id}_${api.stage}` : api.id)
  }

  isUpdatingApiGatewayApi (api) {
    return this.state.apisUpdating.includes(`${api.id}_${api.stage}`)
  }

  isRemovingUnmanagedApi (apiId) {
    return this.state.apisDeleting.includes(apiId)
  }

  updateApiGatewayApi (api) {
    this.setState(({ apisUpdating }) => ({
      apisUpdating: [...apisUpdating, `${api.id}_${api.stage}`]
    }))
    apiGatewayClientWithCredentials()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}`, subscribable: `${api.subscribable}` }, {}))
      .then(() => this.setState(({ apisUpdating }) => ({ apisUpdating: removeFirst(apisUpdating, `${api.id}_${api.stage}`) })))
  }

  isSdkGenerationConfigurable (api) {
    return api.visibility
  }

  isTogglingSdkGeneration (api) {
    return this.state.apisTogglingSdks.includes(`${api.id}_${api.stage}`)
  }

  toggleSdkGeneration (apisList, updatedApi) {
    this.setState(({ apisTogglingSdks }) => ({
      apisTogglingSdks: [...apisTogglingSdks, `${updatedApi.id}_${updatedApi.stage}`]
    }))
    apiGatewayClientWithCredentials()
      .then(app => {
        if (updatedApi.sdkGeneration) {
          return app.delete(`/admin/catalog/${updatedApi.id}_${updatedApi.stage}/sdkGeneration`, {}, {}, {})
        } else {
          return app.put(`/admin/catalog/${updatedApi.id}_${updatedApi.stage}/sdkGeneration`, {}, {}, {})
        }
      })
      .then(res => {
        this.setState(({ apisTogglingSdks }) => ({ apisTogglingSdks: removeFirst(apisTogglingSdks, `${updatedApi.id}_${updatedApi.stage}`) }))
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

  renderHeaderVisibilityButton (usagePlan) {
    const usagePlanVisibility = getUsagePlanVisibility(usagePlan)

    // Some APIs are visible, some are hidden. Show the current state (Partial, with a warning) and enable all on click
    if (usagePlanVisibility == null) {
      return (
        <Popup
          content='Users subscribed to any of the APIs in this usage plan will have a valid API key for all APIs in this usage plan, even those that are not visible!'
          trigger={
            <Button
              basic
              color='yellow'
              style={{ backgroundColor: 'white', width: '100%', paddingLeft: '1em', paddingRight: '1em', minWidth: '88px' }}
              onClick={() => this.showAllApiGatewayApis(usagePlan)}
            >
              {this.isTogglingPlanDisplay(usagePlan) ? <Loader active inline size='mini' /> : <>Partial <Icon name='warning sign' style={{ paddingLeft: '5px' }} /></>}
            </Button>
          }
        />
      )
    }

    // Either all APIs are visible or none are visible. Toggle this state on click.
    return (
      <Button
        basic
        color={usagePlanVisibility ? 'green' : 'red'}
        style={{ backgroundColor: 'white', width: '100%' }}
        onClick={() => {
          if (usagePlanVisibility) this.hideAllApiGatewayApis(usagePlan)
          else this.showAllApiGatewayApis(usagePlan)
        }}
      >
        {this.isTogglingPlanDisplay(usagePlan) ? <Loader active inline size='mini' /> : usagePlanVisibility ? 'True' : 'False'}
      </Button>
    )
  }

  sortByUsagePlan () {
    if (!store.visibility.apiGateway) { return this.renderNoApis() }

    const usagePlans =
      store.visibility.apiGateway
        .filter((api) => api.usagePlanId)
        .reduce((accumulator, api) => {
          if (!accumulator.find((usagePlan) => api.usagePlanId === usagePlan.id)) {
            accumulator.push({ id: api.usagePlanId, name: api.usagePlanName })
          }
          return accumulator
        }, [])
        .sort(this.usagePlanSort)
        .map((usagePlan) => {
          return { ...usagePlan, apis: store.visibility.apiGateway.filter((api) => api.usagePlanId === usagePlan.id).sort(this.tableSort) }
        })
    const unsubscribable =
      store.visibility.apiGateway
        .filter((api) => !api.usagePlanId)
        .sort(this.tableSort)

    return (
      <>
        {usagePlans.map(usagePlan => {
          return (
            <>
              {this.renderHeader(usagePlan)}
              {this.renderApiList(usagePlan.apis)}
            </>
          )
        })}
        <Table.Row style={{ backgroundColor: '#1678c2', color: 'white' }}>
          <Table.Cell colSpan='6'>
            <b>Not Subscribable</b> <i>No Usage Plan</i>
          </Table.Cell>
        </Table.Row>
        {this.renderApiList(unsubscribable)}
      </>
    )
  }

  renderNoApis () {
    return (
      <Table.Row>
        <Table.Cell colSpan='4'>
          No APIs found
        </Table.Cell>
      </Table.Row>
    )
  }

  renderHeader (usagePlan) {
    return (
      <Table.Row style={{ backgroundColor: '#1678c2', color: 'white' }}>
        <Table.Cell colSpan='3'>
          <b>{usagePlan && usagePlan.name}</b> <i>Usage Plan</i>
        </Table.Cell>
        <Table.Cell>
          {this.renderHeaderVisibilityButton(usagePlan)}
        </Table.Cell>
        <Table.Cell colSpan='2'>
          {/* Intentionally empty */}
        </Table.Cell>
      </Table.Row>
    )
  }

  renderApiList (apis) {
    return <>
      {apis.filter(api => api.id !== window.config.restApiId).map(api => (
        <React.Fragment key={api.stage ? `${api.id}_${api.stage}` : api.id}>
          <Table.Row>
            <Table.Cell collapsing>{api.name}</Table.Cell>
            <Table.Cell>{api.stage}</Table.Cell>
            <Table.Cell>{api.subscribable ? 'Subscribable' : 'Not Subscribable'}</Table.Cell>
            <Table.Cell>
              <Button
                basic
                color={api.visibility ? 'green' : 'red'}
                style={{ width: '100%' }}
                onClick={() => api.visibility ? this.hideApiGatewayApi(api) : this.showApiGatewayApi(api)}
              >
                {this.isTogglingApiDisplay(api) ? <Loader active inline size='mini' /> : api.visibility ? 'True' : 'False'}
              </Button>
            </Table.Cell>
            <Table.Cell>
              <Button
                basic
                color='blue'
                disabled={!api.visibility}
                style={{ width: '100%' }}
                onClick={() => this.updateApiGatewayApi(api)}
              >
                {this.isUpdatingApiGatewayApi(api) ? <Loader active inline size='mini' /> : 'Update'}
              </Button>
            </Table.Cell>
            <Table.Cell>
              <Button
                basic
                // color={api.sdkGeneration ? 'green' : 'red'}
                color='blue'
                style={{ width: '100%' }}
                disabled={!api.visibility || !this.isSdkGenerationConfigurable(api)}
                onClick={() => this.toggleSdkGeneration(store.visibility.apiGateway, api)}
              >
                {this.isTogglingSdkGeneration(api) ? <Loader active inline size='mini' /> : api.sdkGeneration ? 'Enabled' : 'Disabled'}
              </Button>
            </Table.Cell>
          </Table.Row>
        </React.Fragment>
      ))}
    </>
  }

  render () {
    return <>
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
                <Table.HeaderCell collapsing sorted='ascending'>API Name</Table.HeaderCell>
                <Table.HeaderCell>Stage</Table.HeaderCell>
                <Table.HeaderCell>API Type</Table.HeaderCell>
                <Table.HeaderCell>Displayed</Table.HeaderCell>
                <Table.HeaderCell>Update</Table.HeaderCell>
                <Table.HeaderCell>Allow Generating SDKs</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {this.sortByUsagePlan()}
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
                    closeOnEscape
                    closeOnDimmerClick
                    onClose={() => this.setState((prev) => ({ ...prev, modalOpen: false }))}
                    trigger={
                      <Button floated='right' onClick={() => this.setState((prev) => ({ ...prev, modalOpen: true }))}>
                        Add API
                      </Button>
                    }
                    open={this.state.modalOpen}
                  >
                    <Modal.Header>Select .JSON, .YAML, or .YML files</Modal.Header>
                    <Modal.Content>
                      <>
                        <Form onSubmit={(e) => this.uploadAPISpec(e)}>
                          <Form.Field>
                            <label htmlFor='files'>Select Files:</label>
                            <input type='file' id='files' name='files' accept='.json,.yaml,.yml' multiple ref={this.fileInput} />
                          </Form.Field>
                          {!!this.state.errors.length &&
                            <Message size='tiny' color='red' list={this.state.errors} header='These files are not parseable or do not contain an api title:' />}
                          <br />
                          <Button type='submit'>Upload</Button>
                        </Form>
                      </>
                    </Modal.Content>
                  </Modal>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Header fullWidth>
              <Table.Row>
                <Table.HeaderCell collapsing sorted='ascending'>API Name</Table.HeaderCell>
                <Table.HeaderCell>Delete</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {store.visibility.generic
                ? Object.keys(store.visibility.generic).sort(this.genericTableSort).map(apiId => (
                  <Table.Row key={apiId}>
                    <Table.Cell collapsing>{store.visibility.generic[apiId].name}</Table.Cell>
                    <Table.Cell>
                      <Button
                        basic
                        color='red'
                        disabled={this.isRemovingUnmanagedApi(apiId)}
                        onClick={() => this.deleteAPISpec(apiId)}
                      >
                        {this.isRemovingUnmanagedApi(apiId) ? <Loader active inline size='mini' /> : 'Delete'}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))
                : (
                  <Table.Row>
                    <Table.Cell colSpan='4'>
                      No APIs found
                    </Table.Cell>
                  </Table.Row>
                )}
            </Table.Body>
          </Table>
        </div>
      </div>
    </>
  }
})
