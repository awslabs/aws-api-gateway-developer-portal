import React from 'react'

import { Grid, Header, Popup, Loader, Message, List, Divider } from 'semantic-ui-react'

import Chart from 'chart.js'
import { fetchUsage, mapUsageByDate } from 'services/api-catalog'

import { observer } from 'mobx-react'

import { store } from 'services/state'

import _ from 'lodash'

function loadUsage(usagePlan, canvasId) {
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
              lineTension: 0,
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255,99,132,1)',
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
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
    <Grid container>
      <Grid.Row>
        <Grid.Column style={{ paddingTop: "40px" }}>
            <Header size="medium">API Key</Header>
            <code style={{
              background: "black",
              border: "1px solid gray",
              padding: "7px 8px",
              color: "lightgray",
              borderRadius: "5px"
            }}>
              {store.apiKey}
            </code>
        </Grid.Column>
      </Grid.Row>
      <Divider />
      <Grid.Row>

      {store.catalog
        .filter(usagePlan => usagePlan.subscribed)
        .map((usagePlan, index) => {

        let firstApiName = usagePlan.apis[0].swagger.info.title
        let extraApiCount = usagePlan.apis.length - 1
        let apiList = usagePlan.apis.reduce((acc, api) => acc.concat(
          <List.Item key={api.id}>{api.swagger.info.title}</List.Item>
        ), [])
        let canvasId = `api-usage-chart-container-${usagePlan.id}` + index

        loadUsage(usagePlan, canvasId)

        return (
          <Grid.Column width={16} widescreen={8} key={usagePlan.id} style={{ marginBottom: "40px" }}>
            <Header size="medium">
              Usage for {extraApiCount ? (
                <Popup
                  trigger={ <a style={{ cursor: "pointer" }}>{firstApiName} and {extraApiCount} more...</a> }
                  content={ <List> {apiList} </List> }
                  on={['hover', 'click']}
                  position="right center"
                />
              ) : (
                firstApiName
              )}
            </Header>
              
              { !usagePlan.usage ? (
                <Loader active />
              ) : ( 
                usagePlan.error ? (
                  <Message error content={usagePlan.error.toString()} />
                ) : null
              )}
              <canvas id={canvasId} />
          </Grid.Column>
        )
      })}
      </Grid.Row>
    </Grid>
  )
})
