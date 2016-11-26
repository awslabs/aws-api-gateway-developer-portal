import $ from 'jquery'
import { getApiGatewayClient, apiGatewayClient } from './api'
import { showError } from './misc'
import apis from '../catalog.json'
// export apis
export let subscriptions

export function getApis() {
  return Promise.resolve(apis)
  if (apis) return Promise.resolve(apis)

  return fetchApis()
  .then(({data}) => {
    // apis = data
    return data
  })
}

export function getApi(id) {
  return getApis()
  .then(() => apis.find(api => api.apiId === id))
}

export function fetchApis() {
  return getApiGatewayClient().then(apiGatewayClient => {
    return apiGatewayClient.get('/catalog', {}, {}, {}).then((result) => {
      // const catalog = result.data.map(c => {
      //     const subscribedUsagePlan = subscriptionsResult.data.find(s => s.id === c.usagePlanId)
      //     c.isSubscribed = !!subscribedUsagePlan
      //     c.apiStages = (subscribedUsagePlan && subscribedUsagePlan.apiStages) || []
      //
      //     return c
      // })
      //
      // apis = catalog
      // return result.data
    }).catch(function(err) {
      showError(JSON.stringify(err.data.message))
    })
  })
}

export function fetchSubscriptions() {
    // get subscribed usage plans
  return getApiGatewayClient().then(apiGatewayClient => {
    return apiGatewayClient.get('/subscriptions', {}, {}, {}).then(({data}) => {
      subscriptions = data

      return subscriptions
    })
  })
}

export function clearSubscriptions() {
  subscriptions = null
}

export function isSubscribed(api) {
  return !!getSubscribedUsagePlan(api)
}

export function getUsagePlanApiStages(api) {
  const subscribedUsagePlan = getSubscribedUsagePlan(api)

  return (subscribedUsagePlan && subscribedUsagePlan.apiStages) || []
}

export function getSubscribedUsagePlan(api) {
  const subscribedUsagePlan = subscriptions && subscriptions.find && subscriptions.find(s => s.id === api.usagePlanId)
  return subscribedUsagePlan
}

export function addSubscription(usagePlanId) {
    return getApiGatewayClient().then(apiGatewayClient => {
        return apiGatewayClient.put('/subscriptions/' + usagePlanId, {}, {}).then((result) => {
          window.location.reload()
      }).catch((err) => {
          showError(JSON.stringify(err.data.message))
      })
    })
}

export function showUsage(usagePlanId) {
    const date = new Date()
    const start = new Date(date.getFullYear(), date.getMonth(), 1).toJSON().split('T')[0]
    const end = new Date().toJSON().split('T')[0]
    return getApiGatewayClient().then(apiGatewayClient => {
        return apiGatewayClient.get('/subscriptions/' + usagePlanId + '/usage', {
          start,
          end
      }, {}).then(function(result) {
          $('#usage-modal').modal('show')
          const data = mapUsageByDate(result.data, 'used')
          const ctx = document.getElementById('myChart')
          new window.Chart(ctx, {
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
      }).catch(function(err) {
          showError(JSON.stringify(err))
      })
    })
}

export function unsubscribe(usagePlanId) {
    return getApiGatewayClient().then(apiGatewayClient => {
        return apiGatewayClient.delete(`/subscriptions/${usagePlanId}`, {}, {}).then(function(result) {
          window.location.reload()
      }).catch(function(err) {
          showError(JSON.stringify(err.data.message))
      })
    })
}

function mapUsageByDate(usage, usedOrRemaining) {
    const apiKeyDates = {}
    Object.keys(usage.items).forEach(apiKeyId => {
        apiKeyDates[apiKeyId] = mapApiKeyUsageByDate(usage.items[apiKeyId], usage.startDate, usedOrRemaining)
    })

    const dates = {}
    Object.keys(apiKeyDates).forEach((apiKeyId, index) => {
        const apiKeyUsage = apiKeyDates[apiKeyId]
        apiKeyUsage.forEach(dailyUsage => {
            const date = dailyUsage[0]
            const value = dailyUsage[1]

            if (!dates[date])
                dates[date] = 0
            dates[date] += value
        })
    })

    const usageByDate = Object.keys(dates).sort().map(date => [date, dates[date]])

    return usageByDate
}

function mapApiKeyUsageByDate(apiKeyUsage, startDate, usedOrRemaining) {
    const dateParts = startDate.split('-')
    const year = dateParts[0]
    const month = dateParts[1]
    const day = dateParts[2]
    const apiKeyDate = new Date(year, month - 1, day)
    apiKeyDate.setHours(0, 0, 0, 0)
    const usedOrRemainingIndex = usedOrRemaining === 'used'
        ? 0
        : 1

    if (apiKeyUsage && !Array.isArray(apiKeyUsage[0]))
        apiKeyUsage = [apiKeyUsage]

    return apiKeyUsage.map((usage) => {
        const date = apiKeyDate.setDate(apiKeyDate.getDate())
        const item = [date, usage[usedOrRemainingIndex]]
        apiKeyDate.setDate(apiKeyDate.getDate() + 1)
        return item
    })
}
