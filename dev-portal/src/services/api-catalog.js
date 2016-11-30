import { getApiGatewayClient } from './api'
export let subscriptions
let apis

export function getApis() {
  if (apis) return Promise.resolve(apis)

  return fetchApis()
  .then(({data}) => {
    apis = data
    return data
  })
}

export function getApi(id) {
  return getApis()
  .then(() => apis.find(api => api.apiId === id))
}

export function fetchApis() {
  return getApiGatewayClient().then(apiGatewayClient => {
    return apiGatewayClient.get('/catalog', {}, {}, {})
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
      })
    })
}

export function unsubscribe(usagePlanId) {
    return getApiGatewayClient().then(apiGatewayClient => {
        return apiGatewayClient.delete(`/subscriptions/${usagePlanId}`, {}, {}).then(function(result) {
          window.location.reload()
      })
    })
}

export function fetchUsage(usagePlanId) {
    const date = new Date()
    const start = new Date(date.getFullYear(), date.getMonth(), 1).toJSON().split('T')[0]
    const end = new Date().toJSON().split('T')[0]
    return getApiGatewayClient().then(apiGatewayClient => {
        return apiGatewayClient.get('/subscriptions/' + usagePlanId + '/usage', { start, end }, {})
    })
}

export function mapUsageByDate(usage, usedOrRemaining) {
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
