// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

import { Grid, Header, Popup, Loader, Message, List, Divider } from 'semantic-ui-react'

import Chart from 'chart.js'
import { fetchUsage, mapUsageByDate } from 'services/api-catalog'
import { toTitleCase } from 'services/misc'

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

      const labels = data.map(d => new Date(d[0]).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }))
      const used = data.map(d => d[1])
      const remaining = data.map(d => d[2])
      const max = Math.max(...used, ...remaining)

      const chartConfig = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: `Requests used` + (usagePlan.quota ? ` (per ${toTitleCase(usagePlan.quota.period)})` : ''),
              data: used,
              lineTension: 0,
              backgroundColor: '#00bfff',
              borderColor: '#00bfff',
              pointBackgroundColor: 'transparent',
              pointBorderColor: 'transparent',
              borderWidth: 2,
              pointRadius: 10,
              pointHoverRadius: 10

            },
            {
              label: `Remaining requests` + (usagePlan.quota ? ` (per ${toTitleCase(usagePlan.quota.period)})` : ''),
              data: remaining,
              lineTension: 0,
              backgroundColor: 'transparent',
              borderColor: 'red',
              pointBackgroundColor: 'transparent',
              pointBorderColor: 'transparent',
              borderWidth: 2,
              pointRadius: 10,
              pointHoverRadius: 10
            }
          ]
        },
        options: { 
          scales: { yAxes: [ { ticks: {
            beginAtZero: true,
            suggestedMax: max + (max * 0.02)
          } } ] }
        }
      }

      new Chart(ctx, chartConfig)
    })
    .catch((error) => {
      console.error(error)
      if (!usagePlan.usage)
        usagePlan.usage = { }

      usagePlan.usage.error = error
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

      {store.usagePlans
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
            {usagePlan.throttle && (
              <Message info>
              <p>
                Requests limited to {usagePlan.throttle.rateLimit} per second, and {usagePlan.throttle.burstLimit} in a burst.
              </p>
              </Message>
            )}
              
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
