import React from 'react'
import { Modal, Dropdown, Message } from 'semantic-ui-react'
import Chart from 'chart.js'
import { fetchUsage, mapUsageByDate } from '../../services/api-catalog'

 export default class Usage extends React.Component {
  constructor(props){
    super(props)

    this.state = {
      isLoading: false,
      errorMessage: ''
    }
  }

  loadUsage(event) {
    event.preventDefault()
    this.setState({isLoading: true})
    fetchUsage(this.props.api.usagePlanId)
    .then((result) => {
      const data = mapUsageByDate(result.data, 'used')
      const ctx = document.getElementById('api-usage-chart-container')
      console.log(ctx)
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
    return <Modal size='small' trigger={<Dropdown.Item onClick={event => this.loadUsage(event)}>Show Usage</Dropdown.Item>}>
      <Modal.Header>Usage</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          See usage for the API
        </Modal.Description>
        {this.state.errorMessage ? <Message error content={this.state.errorMessage.toString()} /> : ''}
        <canvas id='api-usage-chart-container' width='400' height='400'></canvas>
      </Modal.Content>
    </Modal>
  }
}
