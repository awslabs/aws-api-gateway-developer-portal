import React, { Component } from 'react';

import { Button, Table } from 'semantic-ui-react'

import { apiGatewayClient } from 'services/api'
import { updateUsagePlansAndApisList } from 'services/api-catalog';


export class ApiManagement extends Component {

  constructor(props) {
    super(props)

    this.state = {
      apis: {
        apiGateway: null,
        generic: null
      }
    }
  }

  componentDidMount() {
    this.getApiVisibility()
  }

  getApiVisibility = () => {
    apiGatewayClient()
      .then(app => app.get('/admin/catalog/visibility', {}, {}, {}))
      .then(res => {
        console.log('data: %o', res.data)
        if (res.status === 200) {
          this.setState(
            prev => ({ ...prev, apis: res.data }),
            () => {
              console.log('state: %o', this.state)
              console.log('generic: %o', Object.entries(this.state.apis.generic))
            }
          )
        } else {
          throw new Error('woops:')
        }
      })
  }

  updateApiGatewayApis = (apisList, updatedApi) => {
    const updatedApis = apisList.map(stateApi => {
      if (stateApi.id === updatedApi.id && stateApi.stage === updatedApi.stage) {
        stateApi.visibility = !stateApi.visibility
      }
      return stateApi
    })

    this.setState(
      (prev) => ({...prev, apis: { apiGateway: updatedApis, generic: prev.generic || null }}),
      () => { console.log('state: %o', this.state)}
    )
  }

  showApiGatewayApi = (api) => {
    console.log(`showing ${api.name}: ${api.id}_${api.stage}`)
    apiGatewayClient()
      .then(app => app.post('/admin/catalog/visibility', {}, { apiKey: `${api.id}_${api.stage}` }, {}))
      .then((res) => {
        console.log('data received: %o', res);
        if (res.status === 200) {
          this.updateApiGatewayApis(this.state.apis.apiGateway, api)
        }

        setTimeout(() => updateUsagePlansAndApisList(true), 1000)
      })
  }

  hideApiGatewayApi = (api) => {
    console.log(`hiding ${api.name}: ${api.id}_${api.stage}`)
    apiGatewayClient()
      .then(app => app.delete(`/admin/catalog/visibility/${api.id}_${api.stage}`, {}, {}, {}))
      .then((res) => {
        console.log(`data received: ${JSON.stringify(res, null, 2)}`);
        if (res.status === 200) {
          this.updateApiGatewayApis(this.state.apis.apiGateway, api)
        }

        setTimeout(() => updateUsagePlansAndApisList(true), 1000)
      })
  }



  render() {
    this.state.apis.generic && console.log(Object.entries(this.state.apis.generic))
    return (
      <div style={{ padding: '2em' }}>
        <Table celled collapsing>
          <Table.Header fullWidth>
            <Table.Row>
              <Table.HeaderCell colSpan='4'>
                <Button primary size='small'>Add API</Button>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Header fullWidth>
            <Table.Row>
              <Table.HeaderCell collapsing sorted="ascending">API Name</Table.HeaderCell>
              <Table.HeaderCell>Stage</Table.HeaderCell>
              <Table.HeaderCell>API Type</Table.HeaderCell>
              <Table.HeaderCell>Displayed</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {this.state.apis.apiGateway ? this.state.apis.apiGateway.map((api, i) => (
              <Table.Row key={i}>
                <Table.Cell collapsing>{api.name}</Table.Cell>
                <Table.Cell>{api.stage}</Table.Cell>
                <Table.Cell>Subscribable</Table.Cell>
                <Table.Cell>
                  <Button basic
                    color={api.visibility ? 'green' : 'red'}
                    onClick={() => api.visibility ? this.hideApiGatewayApi(api) : this.showApiGatewayApi(api)}>
                    {api.visibility ? 'True' : 'False'}
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
    );
  }
}
