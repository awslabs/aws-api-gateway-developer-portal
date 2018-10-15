import React from 'react'

import { Grid, Header, Segment, Loader, Message } from 'semantic-ui-react'

import Chart from 'chart.js'
import { fetchUsage, mapUsageByDate } from 'services/api-catalog'

import { observer } from 'mobx-react'

import { store } from 'services/state'

import _ from 'lodash'

function loadUsage(usagePlan, canvasId) {

  console.log(React.Component)
  fetchUsage(usagePlan.id)
    .then((result) => {
      const data = mapUsageByDate(result.data, 'used')
      const ctx = document.getElementById(canvasId)

      let oldDataString = JSON.stringify(_.get(usagePlan, 'usage.data', {}))
      let newDataString = JSON.stringify(data)

      if (oldDataString !== newDataString)
        usagePlan.usage = { data }

      const chartConfig = {
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
        options: { scales: { yAxes: [ { ticks: { beginAtZero: true } } ] } }
      }

      new Chart(ctx, chartConfig)
    })
    .catch((error) => {
      usagePlan.usage = { error }
    })
}

export default observer(() => {

  return (
    <Grid>
      {store.catalog
        .filter(usagePlan => usagePlan.subscribed)
        .map(usagePlan => {

        let apis = usagePlan.apis.reduce((acc, api) => {
          return acc + ' ' + api.swagger.info.title
        }, '')

        let canvasId = `api-usage-chart-container-${usagePlan.id}`

        console.log('render')

        loadUsage(usagePlan, canvasId)

        return (
          <Grid.Column mobile={16} tablet={8} computer={4} key={usagePlan.id}>
            <Segment>
              <Header size="medium">
                {usagePlan.name}
              </Header>
              <Header size="small">For APIs {apis}</Header>
              { !usagePlan.usage ? (
                <Loader active />
              ) : ( 
                usagePlan.error ? (
                  <Message error content={usagePlan.error.toString()} />
                ) : null
              )}
              <canvas id={canvasId} width='400' height='400' />
            </Segment>
          </Grid.Column>
        )
      })}
    </Grid>
  )
})
