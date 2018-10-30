// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Modal, Dropdown, Message, Button } from 'semantic-ui-react'
import Chart from 'chart.js'
import { fetchUsage, mapUsageByDate } from 'services/api-catalog'

 export default class Usage extends React.Component {
   state = {
     isLoading: false,
     errorMessage: '',
     isOpen: false
   }

   open = () => this.setState({ isLoading: false, errorMessage: '', isOpen: true })
   close = () => this.setState({ isOpen: false })

  loadUsage(event) {
    event.preventDefault()
    this.setState({isLoading: true})
    fetchUsage(this.props.usagePlanId)
    .then((result) => {
      const data = mapUsageByDate(result.data, 'used')
      const ctx = document.getElementById('api-usage-chart-container')

      new Chart(ctx, {
          type: 'line',
          data: {
              labels: data.map(d => new Date(parseInt(d[0], 10)).toLocaleDateString()),
              datasets: [
                  {
                      label: 'Usage',
                      data: data.map(d => d[1]),
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      borderColor: 'rgba(255,99,132,1)',
                      borderWidth: 1
                  }
              ]
          },
          options: {
              scales: {
                  yAxes: [
                      {
                          ticks: {
                              beginAtZero: true
                          }
                      }
                  ]
              }
          }
      })
      this.setState({isLoading: false, errorMessage: ''})
    })
    .catch((e) => this.setState({errorMessage: e, isLoading: false}))
  }

  render() {
    const { isOpen } = this.state

    return <Modal
      size='small'
      open={isOpen}
      onOpen={this.open}
      onClose={this.close}
      trigger={<Dropdown.Item onClick={event => this.loadUsage(event)}>Show Usage</Dropdown.Item>}
    >
      <Modal.Header>Usage</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          See usage for the API
        </Modal.Description>
        {this.state.errorMessage ? <Message error content={this.state.errorMessage.toString()} /> : ''}
        <canvas id='api-usage-chart-container' width='400' height='400'></canvas>
      </Modal.Content>
      <Modal.Actions style={{textAlign: 'right'}}>
        <Button type='button' onClick={this.close}>Close</Button>
      </Modal.Actions>
    </Modal>
  }
}
